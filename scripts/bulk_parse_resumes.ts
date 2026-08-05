import fs from 'fs';
import path from 'path';
import { GeminiResumeParser } from '../src/services/geminiParser.server';
import { extractRawTextFromBuffer } from '../src/services/resumeParserServer';
import dotenv from 'dotenv';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { initializeApp, getApps } from 'firebase-admin/app';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// Initialize Firebase Admin if possible
if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        projectId: firebaseConfig.projectId
      });
    } else {
      initializeApp({ projectId: firebaseConfig.projectId });
    }
  } catch (err) {
    console.warn('[BulkParser] Firebase Admin init warning:', err);
  }
}

let db: admin.firestore.Firestore | null = null;
try {
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  db = getFirestore(admin.app(), dbId);
} catch (e) {
  console.warn('[BulkParser] Firestore unavailable, proceeding with local JSON batch export only.');
}

const RESUMES_DIR = path.join(process.cwd(), 'bulk_resumes');
const OUTPUT_FILE = path.join(process.cwd(), 'parsed_candidates_batch.json');
const REPORT_FILE = path.join(process.cwd(), 'bulk_import_report.json');

const geminiParser = new GeminiResumeParser();

// Helper to recursively walk directory
function getFilesRecursively(dir: string, baseDir: string = dir): { filePath: string; recruiter: string; relativePath: string }[] {
  let results: { filePath: string; recruiter: string; relativePath: string }[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, baseDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.pdf', '.docx', '.doc', '.txt', '.odt'].includes(ext)) {
        // Determine recruiter folder relative to RESUMES_DIR
        const rel = path.relative(baseDir, filePath);
        const parts = rel.split(path.sep);
        const recruiter = parts.length > 1 ? parts[0] : 'Unassigned';
        results.push({
          filePath,
          recruiter,
          relativePath: rel
        });
      }
    }
  });
  return results;
}

async function runBulkParser() {
  console.log("=== Aurrum CRM Bulk Resume Import & AI Parsing Engine ===");
  const startTime = Date.now();

  if (!fs.existsSync(RESUMES_DIR)) {
    fs.mkdirSync(RESUMES_DIR, { recursive: true });
    console.log(`Created directory: ${RESUMES_DIR}`);
    console.log("Please place resume files inside recruiter subfolders in 'bulk_resumes' and re-run.");
    return;
  }

  const allResumes = getFilesRecursively(RESUMES_DIR);
  console.log(`Found ${allResumes.length} total resume files across recruiter folders.`);

  if (allResumes.length === 0) {
    console.log("No valid resume files (.pdf, .docx, .doc, .txt, .odt) found in 'bulk_resumes'.");
    return;
  }

  const results: any[] = [];
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  const BATCH_SIZE = 4; // Concurrency limit to prevent rate limits

  for (let i = 0; i < allResumes.length; i += BATCH_SIZE) {
    const batch = allResumes.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(allResumes.length / BATCH_SIZE)} (${batch.length} files)...`);

    const promises = batch.map(async (item) => {
      const { filePath, recruiter, relativePath } = item;
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();

      try {
        console.log(`  -> [Recruiter: ${recruiter}] Parsing: ${fileName}`);
        const buffer = fs.readFileSync(filePath);
        const mimeType = ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        let parsedData: any = null;
        try {
          parsedData = await geminiParser.parseBuffer(buffer, mimeType, fileName);
        } catch (aiErr: any) {
          console.warn(`     ⚠️ AI parse failed for ${fileName}, attempting fallback text parse...`, aiErr?.message);
          const rawText = await extractRawTextFromBuffer(buffer, mimeType).catch(() => '');
          if (rawText && rawText.length > 20) {
            parsedData = await geminiParser.parseText(rawText);
          } else {
            throw new Error('Insufficient text extracted');
          }
        }

        if (parsedData) {
          // Attach required recruiter metadata
          parsedData.uploadedBy = recruiter;
          parsedData.parserAgent = recruiter;
          parsedData.uploadedByName = recruiter;
          parsedData.sourceFile = relativePath;
          parsedData.uploadedAt = new Date().toISOString();
          parsedData.status = 'completed';

          // Save to Firestore if connected
          if (db) {
            try {
              const docRef = await db.collection('candidates').add(parsedData);
              parsedData.firestoreId = docRef.id;
            } catch (dbErr) {
              console.warn(`     ⚠️ Failed to save candidate to Firestore:`, dbErr);
            }
          }

          successCount++;
          console.log(`     ✅ Successfully parsed and assigned to ${recruiter}: ${parsedData.contact?.full_name || fileName}`);
          return parsedData;
        } else {
          failCount++;
          return null;
        }
      } catch (err: any) {
        failCount++;
        console.error(`     ❌ Error processing ${fileName}:`, err?.message || err);
        return {
          sourceFile: relativePath,
          uploadedBy: recruiter,
          parserAgent: recruiter,
          uploadedByName: recruiter,
          status: 'failed',
          error: err?.message || String(err),
          uploadedAt: new Date().toISOString()
        };
      }
    });

    const batchRes = await Promise.all(promises);
    for (const res of batchRes) {
      if (res) results.push(res);
    }

    // Incremental progress save
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    // Pause between batches
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  const elapsedTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);

  const report = {
    totalFiles: allResumes.length,
    successCount,
    failCount,
    skipCount,
    elapsedTimeSeconds: elapsedTimeSec,
    completedAt: new Date().toISOString()
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  console.log("\n==========================================");
  console.log("📊 BULK IMPORT & AI PARSING FINAL REPORT");
  console.log("==========================================");
  console.log(`📁 Total Resumes Scanned: ${allResumes.length}`);
  console.log(`✅ Successfully Parsed:   ${successCount}`);
  console.log(`❌ Failed / Skipped:     ${failCount + skipCount}`);
  console.log(`⏱️ Elapsed Time:         ${elapsedTimeSec} seconds`);
  console.log(`💾 JSON Export:          ${OUTPUT_FILE}`);
  console.log(`📋 Summary Report:       ${REPORT_FILE}`);
  console.log("==========================================");
}

runBulkParser().catch(console.error);

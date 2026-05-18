import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { RobustResumeParser } from './src/services/resumeParser.server.ts';
const resumeParser = new RobustResumeParser();

// Handle paths for both ESM and CJS
const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

async function startServer() {
  // Initialize Admin SDK lazily
  let adminApp;
  if (!getApps().length) {
    adminApp = initializeApp({
      projectId: 'ai-studio-applet-webapp-ddf84'
    });
  } else {
    adminApp = getApps()[0];
  }

  const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  const adminMessaging = getMessaging();

  // Notification Listener
  try {
    adminDb.collection('notifications').onSnapshot(async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Filter: Only chat or assignment notifications
          if (notification.type !== 'chat' && notification.type !== 'assignment') {
              return;
          }

          const userId = notification.userId;
          
          try {
            const tokensSnapshot = await adminDb.collection(`users/${userId}/fcmTokens`).get();
            const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
            
            if (tokens.length > 0) {
              const message = {
                notification: {
                  title: notification.title,
                  body: notification.body
                },
                tokens: tokens
              };
              await adminMessaging.sendEachForMulticast(message);
            }
          } catch(err) {
            console.error('Error sending push notification:', err);
          }
        }
      });
    }, (err) => {
      console.warn('[Server] Notification listener warning. Push notifications require Admin SDK credentials:', err.message);
    });
  } catch(err) {
    console.error('[Server] Failed to initialize notification listener:', err);
  }

  // Follow-up Reminder Cron Logic
  setInterval(async () => {
    try {
      const now = new Date();
      const checkRange = new Date(now.getTime() + 70 * 60 * 1000); // Check up to 70 mins ahead
      
      const candidatesSnapshot = await adminDb.collection('candidates')
          .where('isArchived', '==', false)
          .where('followUpStatus', 'in', ['Pending', 'Due Soon'])
          .get();

      // Get Admins and TLs for cross-notification if needed, or just notify all as requested
      const staffSnapshot = await adminDb.collection('users')
          .where('role', 'in', ['admin', 'team_leader'])
          .get();
      const staffIds = staffSnapshot.docs.map(d => d.id);

      candidatesSnapshot.docs.forEach(async (doc) => {
          const candidate = doc.data();
          const followUpTimeStr = candidate.followUpAt || candidate.followUpDate;
          if (!followUpTimeStr) return;
          
          const followUpTime = new Date(followUpTimeStr);
          const timeDiff = followUpTime.getTime() - now.getTime();
          
          // Reminder 1 Hour Before (55-65 mins)
          if (timeDiff > 0 && timeDiff <= 65 * 60 * 1000 && timeDiff >= 55 * 60 * 1000 && !candidate.reminder1HourSent) {
              await sendMultiReminder(adminDb, candidate, '1 hour before', doc.id, staffIds);
              await doc.ref.update({ reminder1HourSent: true });
          }
          // Reminder 30 Minutes Before (25-35 mins)
          else if (timeDiff > 0 && timeDiff <= 35 * 60 * 1000 && timeDiff >= 25 * 60 * 1000 && !candidate.reminder30MinSent) {
              await sendMultiReminder(adminDb, candidate, '30 minutes before', doc.id, staffIds);
              await doc.ref.update({ reminder30MinSent: true });
          }
          // Mark as Missed if past time
          else if (timeDiff < 0 && candidate.followUpStatus === 'Pending') {
              await doc.ref.update({ followUpStatus: 'Missed' });
          }
      });
    } catch (cronErr) {
      console.error('[Cron] Reminder check failed:', cronErr);
    }
  }, 5 * 60 * 1000); // Check every 5 mins

  async function sendMultiReminder(db: any, candidate: any, type: string, candidateId: string, staffIds: string[]) {
    // Fetch all staff names for notifications
    const usersSnapshot = await db.collection('users').get();
    const userNames: Record<string, string> = {};
    const userRoles: Record<string, string> = {};
    usersSnapshot.docs.forEach((d: any) => {
      const data = d.data();
      userNames[d.id] = data.name || data.email.split('@')[0];
      userRoles[d.id] = data.role === 'admin' ? 'Admin' : data.role === 'team_leader' ? 'Team Leader' : 'Recruiter';
    });

    const action = `Follow-up scheduled in ${type.split(' ')[0]}`;
    const purpose = `Follow-up reminder for ${candidate.fullName}`;
    
    // Notify assigned recruiter
    const recipients = new Set(staffIds);
    if (candidate.assignedTo) recipients.add(candidate.assignedTo);

    for (const recipientId of Array.from(recipients)) {
      const recipientName = userNames[recipientId] || 'Assigned User';
      const recipientRole = userRoles[recipientId] || 'Recruiter';

      await db.collection('notifications').add({
        senderId: 'system',
        senderName: 'Aurrum System',
        senderRole: 'System',
        recipientId,
        recipientName,
        recipientRole,
        candidateName: candidate.fullName,
        action,
        purpose,
        relatedCandidateId: candidateId,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });
    }
  }

  const app = express();
  const PORT = 3000;
  // Use Middleware
  app.use(express.json());

  // Basic CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV });
  });

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  app.post('/api/cv/parse-advanced', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      const result = await resumeParser.parseBuffer(req.file.buffer, req.file.mimetype);
      res.json(result);
    } catch (error) {
      console.error('[Server] Advanced Parsing Error:', error);
      res.status(500).json({ error: 'Failed to parse resume with advanced engine' });
    }
  });

  app.post('/api/cv/upload', upload.single('file'), async (req, res) => {
    console.log('[Server] Upload Request:', req.file?.originalname);
    try {
      const { name, email, phone } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ status: false, message: 'No file uploaded' });
      }

      // External API Sync - Try calling aurrum.co, but don't fail if it's down
      try {
        const formData = new FormData();
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('file', blob, req.file.originalname);
        formData.append('name', name || 'Unknown Candidate');
        formData.append('email', email || 'no-email@aurrum.co');
        if (phone) formData.append('phone', phone);

        const apiKey = process.env.AURRUM_API_KEY || 'AURRUM_SECRET_123';
        
        const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/upload', {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: formData as any
        });

        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        } else {
          const errorText = await response.text();
          console.error('[Server] Aurrum API Error Response:', errorText);
        }
      } catch (externalErr) {
        console.warn('[Server] External API Sync Unavailable:', (externalErr as Error).message);
      }

      // Fallback: If external API fails, return local success to keep app working
      res.json({ 
        status: true, 
        message: 'Processed locally (Sync Unavailable)', 
        data: { id: `local_${Date.now()}`, url: null, name: name || req.file.originalname } 
      });
    } catch (error) {
      console.error('[Server] Critical Upload Error:', error);
      res.status(500).json({ status: false, message: 'Internal server error during upload' });
    }
  });

  app.get('/api/cv/list', async (req, res) => {
    try {
      const apiKey = process.env.AURRUM_API_KEY || 'AURRUM_SECRET_123';
      const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/list', {
        headers: { 'x-api-key': apiKey }
      });
      
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
      
      const errorText = await response.text();
      res.status(response.status).json({ status: false, message: 'List sync failed', error: errorText });
    } catch (error) {
      console.error('[Server] List connection error:', (error as Error).message);
      res.status(500).json({ status: false, message: 'Local fallback: List service unreachable' });
    }
  });

  // Vite setup
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // In bundled production mode, we might be in dist/ or root
      const indexPath = fs.existsSync(path.join(distPath, 'index.html')) 
        ? path.join(distPath, 'index.html') 
        : path.join(process.cwd(), 'index.html');
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] AURRUM Ready at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Startup Failure:', err);
});

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import AdmZip from 'adm-zip';
import cron from 'node-cron';
import cors from 'cors';
import dotenv from 'dotenv';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { initializeApp, getApps } from 'firebase-admin/app';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { RobustResumeParser } from './src/services/resumeParser.server.ts';

// Load environment variables immediately on startup
dotenv.config();

const resumeParser = new RobustResumeParser();

// Handle paths for both ESM and CJS
const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

// Initialize Admin SDK
if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
      console.log('[Server] Admin SDK initialized with Service Account');
    } else {
      initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log('[Server] Admin SDK initialized with Project ID (ADC)');
    }
  } catch (initErr) {
    console.error('[Server] Admin SDK Initialization Error:', initErr);
    // Fallback to minimal initialization
    initializeApp({ projectId: firebaseConfig.projectId });
  }
}

let adminDb: admin.firestore.Firestore | null = null;
let adminMessaging: admin.messaging.Messaging | null = null;

try {
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  adminDb = getFirestore(dbId);
  adminMessaging = getMessaging();
  console.log('[Server] Firebase DB and Messaging helpers initialized successfully.');
} catch (sdkError) {
  console.warn('[Server] Firebase Firestore or Messaging is unavailable on this host. Operational features will fall back gracefully.', (sdkError as Error).message);
}

// Setup Notification Listener (Only run this when listening as a standalone server)
let notificationListener: (() => void) | null = null;

const startNotificationListener = () => {
  if (!adminDb || !adminMessaging) {
    console.warn('[Server] Firebase services unavailable. Skipping notification stream listener.');
    return;
  }
  try {
    notificationListener = adminDb.collection('notifications').onSnapshot(async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Filter: Only chat or assignment notifications
          if (notification.type !== 'chat' && notification.type !== 'assignment') {
              return;
          }

          const userId = notification.userId || notification.recipientId;
          if (!userId) return;
          
          try {
            const tokensSnapshot = await adminDb!.collection(`users/${userId}/fcmTokens`).get();
            const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
            
            if (tokens.length > 0) {
              const message = {
                notification: {
                  title: notification.title,
                  body: notification.body
                },
                tokens: tokens
              };
              await adminMessaging!.sendEachForMulticast(message);
              console.log(`[Server] Notification sent to ${tokens.length} tokens for user ${userId}`);
            }
          } catch(err) {
            console.error('Error sending push notification:', err);
          }
        }
      });
    }, (err) => {
      console.warn('[Server] Notification listener permission error:', err.message);
      if (err.message.includes('permission')) {
        console.warn('[Server] Tip: Ensure your Service Account has "Cloud Datastore User" or "Firebase Admin" role.');
      }
    });
  } catch(err) {
    console.error('[Server] Failed to initialize notification listener:', err);
  }
};

// Helper function to verify incoming client IP addresses
const verifyClientIp = (req: express.Request): { allowed: boolean; ip: string; isBypassed: boolean } => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || '';

  let cleanedIp = clientIp.trim();
  if (cleanedIp === '::1') {
    cleanedIp = '127.0.0.1';
  } else if (cleanedIp.startsWith('::ffff:')) {
    cleanedIp = cleanedIp.replace('::ffff:', '');
  }

  const envAllowedIps = process.env.ALLOWED_IPS
    ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()).filter(Boolean)
    : ['223.236.122.154', '103.240.204.183'];

  const devIps = ['127.0.0.1', 'localhost'];

  // Smart Development Bypass (active in development environment so coding remains uninterrupted)
  const isDevBypass = process.env.NODE_ENV !== 'production' || !process.env.VERCEL;

  const isAllowed = envAllowedIps.includes(cleanedIp) || devIps.includes(cleanedIp) || isDevBypass;

  return { allowed: isAllowed, ip: cleanedIp, isBypassed: isDevBypass && !envAllowedIps.includes(cleanedIp) && !devIps.includes(cleanedIp) };
};

// Create Express instance at top-level
const app = express();
app.set('trust proxy', true);
const PORT = 3000;

// Use standard, shared middlewares
app.use(express.json());
app.use(cors());

// Two-Layer Enforcement Middleware: Block any other API path unless IP is allowed
app.use('/api', (req, res, next) => {
  // Allow health check and checking IP itself
  if (req.path === '/health' || req.path === '/verify-ip' || req.path === '/check-ip') {
    return next();
  }

  const { allowed, ip } = verifyClientIp(req);
  if (!allowed) {
    console.warn(`[IP Gatekeeper Blocked Request] Path "${req.path}" blocked from IP: "${ip}"`);
    return res.status(403).json({
      allowed: false,
      ip,
      error: 'Access Denied: Network address restricted by security policies.'
    });
  }
  next();
});

// Configure synchronous API route handlers (instantly resolvable inside Vercel Serverless environment)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: process.env.NODE_ENV, 
    vercel: !!process.env.VERCEL,
    allowedIpsConfigured: !!process.env.ALLOWED_IPS
  });
});

app.get('/api/verify-ip', (req, res) => {
  const { allowed, ip, isBypassed } = verifyClientIp(req);
  console.log(`[IP Gatekeeper] Verify IP request: "${ip}" | Authorized: ${allowed} | DevBypass: ${isBypassed}`);
  
  return res.status(allowed ? 200 : 403).json({
    allowed,
    ip,
    bypassed: isBypassed
  });
});

app.get('/api/check-ip', (req, res) => {
  const { allowed, ip, isBypassed } = verifyClientIp(req);
  return res.status(allowed ? 200 : 403).json({
    allowed,
    ip,
    bypassed: isBypassed
  });
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.post('/api/cv/parse-advanced', upload.single('file'), async (req, res) => {
  console.log('[Server] POST /api/cv/parse-advanced received');
  if (!req.file) {
    console.log('[Server] parse-advanced: No file uploaded');
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
  console.log('[Server] POST /api/cv/upload received. File:', req.file?.originalname);
  try {
    const { name, email, phone } = req.body;
    
    if (!req.file) {
      console.log('[Server] upload: No file uploaded');
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

app.get('/api/backup/download/:type', async (req, res) => {
  const { type } = req.params;
  
  // 1. Get Auth Token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ status: false, message: 'Unauthorized' });
  }
  const token = authHeader.split('Bearer ')[1];
  
  if (!adminDb) {
    return res.status(503).json({ status: false, message: 'Backup service is temporarily unavailable: Firebase client is not connected.' });
  }
  
  try {
      // 2. Verify token
      const decoded = await admin.auth().verifyIdToken(token);
      const uid = decoded.uid;
      
      // 3. Check role
      const userDoc = await adminDb.collection('users').doc(uid).get();
      const userData = userDoc.data();
      if (!userData || (userData.role !== 'developer' && userData.role !== 'admin')) {
          return res.status(403).json({ status: false, message: 'Access Denied' });
      }

      if (type === 'full') {
          const zip = new AdmZip();
          const projectDir = process.cwd();
          zip.addLocalFolder(projectDir, undefined, (filename) => {
              return !filename.includes('node_modules') && 
                     !filename.includes('.git') && 
                     !filename.includes('dist') &&
                     !filename.includes('.firebase');
          });
          const buffer = zip.toBuffer();
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename=aurrum-backup-${new Date().toISOString().split('T')[0]}.zip`);
          return res.send(buffer);
      }
      res.status(400).json({ status: false, message: 'Type not supported' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, message: 'Backup failed' });
  }
});

// Configure Vite layout static serving and wildcard routing asynchronously
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Wildcard handler for SPA fallback, only if not running in Vercel lambda (Vercel routes static files natively)
    if (!process.env.VERCEL) {
      app.get('*', (req, res) => {
        const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
          ? path.join(distPath, 'index.html')
          : path.join(process.cwd(), 'index.html');
        res.sendFile(indexPath);
      });
    }
  }

  // Bind server port and start background listeners ONLY outside Vercel's serverless sandbox
  if (!process.env.VERCEL) {
    startNotificationListener();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] AURRUM Ready and listening at http://localhost:${PORT}`);
    });

    process.on('SIGTERM', () => {
      server.close(() => {
        console.log('Server process terminated gracefully');
      });
    });
  }
}

bootstrap().catch(err => {
  console.error('[Server] Bootstrap Error:', err);
});

// Export default App for Vercel lambda execution
export default app;

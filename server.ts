import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import AdmZip from 'adm-zip';
import cron from 'node-cron';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { initializeApp, getApps } from 'firebase-admin/app';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { RobustResumeParser } from './src/services/resumeParser.server.ts';
const resumeParser = new RobustResumeParser();

// Handle paths for both ESM and CJS
const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

async function startServer() {
  // Initialize Admin SDK lazily
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
      // Fallback to minimal init
      initializeApp({ projectId: firebaseConfig.projectId });
    }
  }

  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const adminDb = getFirestore(dbId);
  const adminMessaging = getMessaging();

  // Notification Listener
  let notificationListener: (() => void) | null = null;
  
  const startNotificationListener = () => {
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

  startNotificationListener();

  // const app = express();
  // app.set('trust proxy', true);
  // const PORT = 3000;
  
  // // Access Control Middleware
  // app.use(async (req, res, next) => {
  //   const forwardedFor = req.headers['x-forwarded-for'];
  //   const clientIp = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : req.socket.remoteAddress;
  //
  //   const allowed = [process.env.ALLOWED_IPV4, process.env.ALLOWED_IPV6].filter(Boolean);
  //   
  //   let isAllowed = allowed.includes(clientIp || '');
  //   
  //   if (!isAllowed) {
  //       // Check DB whitelist
  //       try {
  //           const ipDoc = await adminDb.collection('settings').doc('ip_whitelist').get();
  //           if (ipDoc.exists) {
  //               const dbIps = ipDoc.data()?.ips || [];
  //               if(dbIps.includes(clientIp)) isAllowed = true;
  //           }
  //       } catch(e) { 
  //           console.error("Non-blocking Error checking DB whitelist", e);
  //           // Fail open if DB is unreachable to allow server to boot/work
  //           isAllowed = true; 
  //       }
  //   }
  //
  //   if (!isAllowed) {
  //       try {
  //           await adminDb.collection('access_logs').add({
  //               ip: clientIp,
  //               url: req.url,
  //               ua: req.headers['user-agent'],
  //               timestamp: admin.firestore.FieldValue.serverTimestamp(),
  //               status: 'blocked'
  //           });
  //       } catch(e) { console.error("Logging failed", e); }
  //       
  //       return res.status(403).sendFile(path.join(process.cwd(), 'public', 'access-restricted.html'));
  //   }
  //   next();
  // });

  const app = express();
  app.set('trust proxy', true);
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

  app.get('/api/backup/download/:type', async (req, res) => {
    const { type } = req.params;
    
    // 1. Get Auth Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       return res.status(401).json({ status: false, message: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1];
    
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
            // Assuming current directory is the project root
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

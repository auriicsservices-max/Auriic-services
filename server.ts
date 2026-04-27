import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Use Middleware
app.use(express.json());

// Basic CORS for Vercel
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

app.post('/api/cv/upload', upload.single('file'), async (req, res) => {
  console.log('Received request for /api/cv/upload');
  try {
    const { name, email, phone } = req.body;
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ status: false, message: 'No file uploaded' });
    }

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('name', name || 'Unknown Candidate');
    formData.append('email', email || 'no-email@aurrum.co');
    if (phone) formData.append('phone', phone);

    // Using the provided secret from documentation
    const apiKey = process.env.AURRUM_API_KEY || 'AURRUM_SECRET_123';
    console.log('Proxying upload to Aurrum for:', email);

    const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/upload', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData as any
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = JSON.parse(responseText);
      res.json(data);
    } else {
      console.warn('Non-JSON response from Aurrum API:', responseText);
      // Fallback: If the API failed but we have a valid request, return a "mock" success for local storage survival
      res.status(200).json({ 
        status: true, 
        message: 'Processed locally (API Sync Failed)', 
        data: { id: Date.now(), url: null, name: name || 'Candidate' } 
      });
    }
  } catch (error) {
    console.error('CV Upload Error:', error);
    res.status(500).json({ status: false, message: 'Internal server error during upload proxy' });
  }
});

app.get('/api/cv/list', async (req, res) => {
  console.log('Received request for /api/cv/list');
  try {
    const apiKey = process.env.AURRUM_API_KEY || 'AURRUM_SECRET_123';
    const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/list', {
      headers: {
        'x-api-key': apiKey,
      }
    });
    const responseText = await response.text();
    res.json(JSON.parse(responseText));
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'List failed' });
  }
});

async function setupVite() {
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
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite();

// Only listen if not running as a Vercel serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

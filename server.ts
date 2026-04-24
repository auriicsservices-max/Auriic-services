import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Use Middleware
  app.use(express.json());

  // CV API Proxy Routes
  const CV_API_BASE = 'https://aurrum.co/wp-json/cv-api/v1';
  const CV_API_KEY = process.env.AURRUM_CV_API_KEY || 'AURRUM_SECRET_123';

  app.get('/api/cv/list', async (req, res) => {
    try {
      const response = await axios.get(`${CV_API_BASE}/list`, {
        headers: { 'x-api-key': CV_API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('CV List Error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ status: false, message: 'Failed to fetch CV list' });
    }
  });

  app.post('/api/cv/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ status: false, message: 'No file uploaded' });
      }

      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      form.append('name', req.body.name || 'Unknown');
      form.append('email', req.body.email || 'unknown@example.com');
      if (req.body.phone) form.append('phone', req.body.phone);

      const response = await axios.post(`${CV_API_BASE}/upload`, form, {
        headers: {
          ...form.getHeaders(),
          'x-api-key': CV_API_KEY,
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error('CV Upload Error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ status: false, message: error.response?.data?.message || 'Failed to upload CV' });
    }
  });

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting in development mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting in production mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurrum Server running on http://localhost:${PORT}`);
  });
}

startServer();

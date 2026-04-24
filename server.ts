import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Use Middleware
  app.use(express.json());

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV });
  });

  const upload = multer({ storage: multer.memoryStorage() });

  app.post('/api/cv/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ status: false, message: 'No file uploaded' });
      }

      const { name, email, phone } = req.body;
      const formData = new FormData();
      formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
      formData.append('name', name || '');
      formData.append('email', email || '');
      formData.append('phone', phone || '');

      const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/upload', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.AURRUM_API_KEY || '',
        },
        body: formData as any
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        res.status(500).json({ status: false, message: 'Upload failed: Invalid response format' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Upload failed' });
    }
  });

  app.get('/api/cv/list', async (req, res) => {
    try {
      const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/list', {
        headers: {
          'x-api-key': process.env.AURRUM_API_KEY || '',
        }
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        res.status(500).json({ status: false, message: 'List failed: Invalid response format' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'List failed' });
    }
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

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

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  app.post('/api/cv/upload', upload.single('file'), async (req, res) => {
    console.log('Received request for /api/cv/upload');
    try {
      const { name, email, phone } = req.body;
      const formData = new FormData();
      
      // If file exists, we could send it, but user said "Remove that from APi"
      // So we will omit the file and only send metadata to Aurrum
      if (req.file) {
        console.log('File received but omitting from external API call as per requested optimization');
      }

      formData.append('name', name || '');
      formData.append('email', email || '');
      formData.append('phone', phone || '');
      formData.append('source', 'ai-studio-optimized');

      const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/upload', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.AURRUM_API_KEY || '',
        },
        body: formData as any
      });

      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      console.log('API Response Content-Type:', contentType);
      console.log('API Response Text:', responseText);
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = JSON.parse(responseText);
          res.json(data);
        } catch (e) {
          console.error('Failed to parse JSON:', responseText);
          res.status(500).json({ status: false, message: 'Upload failed: Invalid JSON. Raw: ' + responseText.substring(0, 100) });
        }
      } else {
        console.error('Non-JSON response:', responseText);
        res.status(500).json({ status: false, message: 'Upload failed: Invalid response format. Raw: ' + responseText.substring(0, 100) });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Upload failed' });
    }
  });

  app.get('/api/cv/list', async (req, res) => {
    console.log('Received request for /api/cv/list');
    try {
      const response = await fetch('https://aurrum.co/wp-json/cv-api/v1/list', {
        headers: {
          'x-api-key': process.env.AURRUM_API_KEY || '',
        }
      });
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = JSON.parse(responseText);
          res.json(data);
        } catch (e) {
          console.error('Failed to parse list JSON:', responseText);
          res.status(500).json({ status: false, message: 'List failed: Invalid JSON. Raw: ' + responseText.substring(0, 100) });
        }
      } else {
        console.error('Non-JSON response for list:', responseText);
        res.status(500).json({ status: false, message: 'List failed: Invalid response format. Raw: ' + responseText.substring(0, 100) });
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
      console.log('Serving static file for:', req.url);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurrum Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseResumeInternal } from './resumeParser.server';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  
  // Use Middleware
  app.use(express.json({ limit: '10mb' })); // Increase limit for base64 resumes

  // API Route for candidate resume parsing
  app.post('/api/v2/parse-resume', async (req, res) => {
    console.log('--- Incoming Parse Request (V2) ---');
    try {
      const { fileData } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: 'Missing file data' });
      }
      
      const parsedData = await parseResumeInternal(fileData);
      res.json(parsedData);
    } catch (error: any) {
      console.error('Server-side Parse Error:', error);
      res.status(500).json({ error: error.message || 'Failed to parse resume' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving logic
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

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import chatRoutes from './routes/chat.js';
import fileRoutes from './routes/files.js';
import pcbRoutes from './routes/pcb.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure required directories exist
const dirs = ['uploads', 'generated'];
dirs.forEach(dir => {
  const dirPath = join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/pcb', pcbRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 8090PCB Backend server running on port ${PORT}`);
  console.log(`🧠 Cerebras model: ${process.env.CEREBRAS_MODEL || 'not set'}`);
  console.log(`🖼️  KiCad CLI: ${process.env.KICAD_CLI_PATH || 'kicad-cli (PATH)'}`);
});

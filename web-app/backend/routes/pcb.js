import express from 'express';
import multer from 'multer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { validateUploadedDesign } from '../services/pcbValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function sanitizeFilename(filename) {
  return String(filename).replaceAll('/', '_').replaceAll('\\', '_');
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      if (!req.validationId) {
        req.validationId = `validation_${Date.now()}`;
      }

      const uploadDir = join(__dirname, '..', 'uploads', req.validationId);
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, sanitizeFilename(file.originalname));
    },
  }),
  limits: {
    files: 20,
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * POST /api/pcb/validate
 * Upload KiCad files and generate firmware plan + PRD summary outputs.
 *
 * Expected form-data:
 * - files: one or more files (recommended: .kicad_pro + .kicad_sch + .kicad_pcb)
 */
router.post('/validate', upload.array('files'), async (req, res) => {
  try {
    const files = req.files ?? [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const result = await validateUploadedDesign({
      validationId: req.validationId,
      uploadedFiles: files,
    });

    res.json(result);
  } catch (error) {
    console.error('PCB validation error:', error);
    res.status(500).json({
      error: 'Failed to generate plan',
      message: error.message,
    });
  }
});

export default router;

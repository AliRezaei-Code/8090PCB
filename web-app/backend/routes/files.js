import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * GET /api/files/preview/:filename
 * Preview file content (for text files)
 */
router.get('/preview/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = join(__dirname, '..', 'generated', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    
    res.json({
      filename,
      content,
      size: content.length
    });

  } catch (error) {
    console.error('File preview error:', error);
    res.status(500).json({
      error: 'Failed to preview file',
      message: error.message
    });
  }
});

/**
 * GET /api/files/:filename
 * Download generated files
 */
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = join(__dirname, '..', 'generated', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.kicad_pcb')) {
      contentType = 'application/x-kicad-pcb';
    } else if (filename.endsWith('.md')) {
      contentType = 'text/markdown';
    } else if (filename.endsWith('.json')) {
      contentType = 'application/json';
    } else if (filename.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (filename.endsWith('.png')) {
      contentType = 'image/png';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileContent = await fs.readFile(filePath);
    res.send(fileContent);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      error: 'Failed to download file',
      message: error.message
    });
  }
});

/**
 * GET /api/files/list
 * List all generated files
 */
router.get('/', async (req, res) => {
  try {
    const generatedDir = join(__dirname, '..', 'generated');
    
    const files = await fs.readdir(generatedDir);
    
    const fileDetails = await Promise.all(
      files.map(async (filename) => {
        const filePath = join(generatedDir, filename);
        const stats = await fs.stat(filePath);
        
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
    );

    res.json({ files: fileDetails });

  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({
      error: 'Failed to list files',
      message: error.message
    });
  }
});

export default router;

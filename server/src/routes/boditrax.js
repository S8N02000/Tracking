import { Router } from 'express';
import multer from 'multer';
import { importBoditraxData, getAllScans } from '../services/boditraxService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/boditrax/upload
router.post('/boditrax/upload', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Aucun fichier CSV fourni.' });
    }

    const csvContent = req.file.buffer.toString('utf8');
    const result = importBoditraxData(csvContent);

    res.json({
      success: true,
      message: `Importation réussie : ${result.inserted} nouveaux scans insérés, ${result.duplicatesIgnored} doublons ignorés.`,
      result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/boditrax/scans
router.get('/boditrax/scans', (req, res) => {
  const scans = getAllScans();
  res.json(scans);
});

export default router;

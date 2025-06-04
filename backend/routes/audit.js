import express from 'express';
import { auditCode, storeAudit } from '../controllers/auditController.js';

const router = express.Router();

router.post('/audit', auditCode);
router.post('/store', storeAudit);

export default router;

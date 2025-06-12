import express from 'express';
import { supabase } from '../db/supabase.js';
import { startAuditHandler, auditCode, storeAudit, getAuditPDF, getDashboardData } from '../controllers/auditController.js';


const router = express.Router();

router.get('/test', () => {
    res.json({ message: 'Audit API is working!' });
})

router.post('/audit', startAuditHandler);
// router.post('/audit', auditCode);
router.post('/store', storeAudit);
router.get('/report/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('Audit').select('*').eq('id', id).single();

    if (error || !data) return res.status(404).json({ error: 'Audit not found' });
    res.json(data);
});
router.get('/status/:id', async (req, res) => {
    console.log("Fetching audit status for ID:", req.params.id);
    const { id } = req.params;
    const { data, error } = await supabase.from('Audit').select('status').eq('id', id).single();

    if (error || !data) return res.status(404).json({ error: 'Audit not found' });
    res.json(data);
});

router.get('/audit/report/:id/pdf', getAuditPDF);

router.get('/user-audits/:email', getDashboardData)

export default router;

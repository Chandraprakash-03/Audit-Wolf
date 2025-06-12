import { ethers } from 'ethers';
import { supabase } from '../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { chooseModel, callAI } from '../services/aiService.js';
import { storeAuditHelper } from '../utils/storeAuditHelper.js';
import { generateAuditPDF } from '../utils/pdfHelper.js';
import { sendAuditReportEmail } from '../services/emailService.js';
import fs from 'fs';
import path from 'path';

export const auditCode = async (req, res) => {
    const { code } = req.body;
    try {
        const report = await callAI(code);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'AI audit failed', details: err.message });
    }
};

export const startAuditHandler = async (req, res) => {
    const { wallet, code, email } = req.body;
    const model = chooseModel(code);
    const id = uuidv4();
    const codeHash = ethers.keccak256(ethers.toUtf8Bytes(code));

    // Insert audit entry
    const { data, error } = await supabase.from('Audit').insert([
        { id, wallet, codeHash, model, status: 'pending', email }
    ]);

    if (error) {
        console.error("❌ Failed to insert audit record:", error);
        return res.status(500).json({ error: 'Failed to start audit', details: error.message });
    }
    console.log("✅ Inserted audit:", id);

    // Async processing for long audits
    if (model === "deepseek/deepseek-v3-base:free") {
        console.log("Long audit detected, offloading to next event loop tick");
        setTimeout(async () => {
            try {
                const result = await callAI(code);
                const { data, error } = await supabase.from('Audit').update({
                    auditJson: result.vulnerabilities,
                    gasOptimizations: result.gasOptimizations,
                    status: 'completed',
                    completedAt: new Date()
                }).eq('id', id).select();
                if (error) {
                    console.error("❌ Failed to update audit record:", error);
                    await supabase.from('Audit').update({ status: 'error' }).eq('id', id);
                    return;
                }
                console.log("✅ Updated audit:", id);

                if (email) {
                    try {
                        const pdfPath = await generateAuditPDF(id, { vulnerabilities: result.vulnerabilities, gasOptimizations: result.gasOptimizations });
                        await sendAuditReportEmail(email, id, pdfPath);
                        console.log(`📬 Email sent to ${email} with PDF audit`);
                    } catch (err) {
                        console.error("❌ Failed to generate/send PDF email:", err.message);
                    }
                }

                await storeAuditHelper({
                    id,
                    wallet,
                    code,
                    auditText: JSON.stringify(result),
                });
            } catch (err) {
                console.error("Audit processing failed:", err);
                await supabase.from('Audit').update({ status: 'error' }).eq('id', id);
            }
        }, 0);
    } else {
        console.log("Short audit detected, processing immediately");
        try {
            const result = await callAI(code);
            const { data, error } = await supabase.from('Audit').update({
                auditJson: result.vulnerabilities,
                gasOptimizations: result.gasOptimizations,
                status: 'completed',
                completedAt: new Date()
            }).eq('id', id).select();
            if (error) {
                console.error("❌ Failed to update audit record:", error);
                await supabase.from('Audit').update({ status: 'error' }).eq('id', id);
                return res.status(500).json({ error: 'Failed to update audit', details: error.message });
            }
            console.log("✅ Updated audit:", id);

            if (email) {
                try {
                    const pdfPath = await generateAuditPDF(id, { vulnerabilities: result.vulnerabilities, gasOptimizations: result.gasOptimizations });
                    await sendAuditReportEmail(email, id, pdfPath);
                    console.log(`📬 Email sent to ${email} with PDF audit`);
                } catch (err) {
                    console.error("❌ Failed to generate/send PDF email:", err.message);
                }
            }

            await storeAuditHelper({
                id,
                wallet,
                code,
                auditText: JSON.stringify(result),
            });
        } catch (err) {
            console.error("AI audit failed:", err);
            await supabase.from('Audit').update({ status: 'error' }).eq('id', id);
            return res.status(500).json({ error: 'AI audit failed', details: err.message });
        }
    }

    return res.json({ status: 'processing', auditId: id });
};

export const getAuditStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.from('Audit').select('status').eq('id', id).single();
        if (error) {
            return res.status(404).json({ error: 'Audit not found', details: error.message });
        }
        return res.json({ status: data.status });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch status', details: err.message });
    }
};

export const getAuditReport = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.from('Audit').select('*').eq('id', id).single();
        if (error) {
            return res.status(404).json({ error: 'Audit not found', details: error.message });
        }
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch report', details: err.message });
    }
};

export const getAuditPDF = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.from('Audit').select('auditJson, gasOptimizations').eq('id', id).single();
        if (error) {
            return res.status(404).json({ error: 'Audit not found', details: error.message });
        }

        const pdfPath = await generateAuditPDF(id, {
            vulnerabilities: data.auditJson,
            gasOptimizations: data.gasOptimizations,
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=audit-${id}.pdf`);
        const pdfStream = fs.createReadStream(pdfPath);
        pdfStream.pipe(res);

        // Clean up the file after streaming
        pdfStream.on('end', () => {
            fs.unlink(pdfPath, (err) => {
                if (err) console.error('Failed to delete PDF:', err);
            });
        });
    } catch (err) {
        console.error('PDF generation failed:', err);
        res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
    }
};

export const storeAudit = async (req, res) => {
    const { id, wallet, code, auditText } = req.body;
    try {
        const tx = await storeAuditHelper({ id, wallet, code, auditText });
        res.json({ tx });
    } catch (err) {
        res.status(500).json({ error: 'Blockchain write failed', details: err.message });
    }
};
export const getDashboardData = async (req, res) => {
    try {
        const { email } = req.params;
        const { data, error } = await supabase
            .from('Audit')
            .select('id, wallet, status, createdAt, auditJson, gasOptimizations')
            .eq('email', email)
            .eq('status', 'completed' || 'processing')
            .order('createdAt', { ascending: false });

        if (data.length === 0) {
            return res.status(204).json({ error: 'No audits found for this user' });
        }
        console.log(data)
        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch dashboard data', details: err.message });
    }
}
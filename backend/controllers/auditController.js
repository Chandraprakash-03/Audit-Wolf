import { ethers } from 'ethers';
import { supabase } from '../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { chooseModel, callAI } from '../services/aiService.js';
import { storeAuditHelper } from '../utils/storeAuditHelper.js';
import { generateAuditPDF } from '../utils/pdfHelper.js';
import { sendAuditReportEmail } from '../services/emailService.js';


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
    } else {
        console.log("✅ Inserted audit:", id);
    }


    // Async processing for long audits
    if (model === "deepseek/deepseek-v3-base:free") {
        console.log("Long audit detected, offloading to next event loop tick");
        setTimeout(async () => {
            try {
                const result = await callAI(code);
                console.log(result)
                const { data, error } = await supabase.from('Audit').update({
                    auditJson: result,
                    status: 'completed',
                    completedAt: new Date()
                }).eq('id', id).select();
                if (error) {
                    console.error("❌ Failed to insert audit record:", error);
                } else {
                    console.log("✅ Updated audit:", id);
                }
                if (email) {
                    try {
                        const pdfPath = await generateAuditPDF(id, result);
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
                await supabase.from('Audit').update({
                    status: 'error'
                }).eq('id', id);
            }
        }, 0); // offload to next event loop tick
    } else {
        console.log("Short audit detected, processing immediately");
        // Process immediately for light/medium/coder
        try {
            const result = await callAI(code);
            console.log(result)
            const { data, error } = await supabase.from('Audit').update({
                auditJson: result,
                status: 'completed',
                completedAt: new Date()
            }).eq('id', id).select();
            if (error) {
                console.error("❌ Failed to insert audit record:", error);
            } else {
                console.log("✅ Updated audit:", id);
            }
            if (email) {
                try {
                    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                    const pdfPath = await generateAuditPDF(id, parsedResult);
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
            await supabase.from('Audit').update({
                status: 'error'
            }).eq('id', id);
        }
    }

    return res.json({ status: 'processing', auditId: id });
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

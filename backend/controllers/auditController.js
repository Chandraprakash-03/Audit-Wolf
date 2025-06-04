import { callAI } from '../services/aiService.js';
import { uploadToIPFS } from '../services/ipfsService.js';
import { sendToBlockchain } from '../services/blockchainService.js';

export const auditCode = async (req, res) => {
    const { code } = req.body;
    try {
        const report = await callAI(code);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'AI audit failed', details: err.message });
    }
};

export const storeAudit = async (req, res) => {
    const { wallet, code, auditText } = req.body;
    try {
        const fileHash = ethers.utils.keccak256(Buffer.from(code));
        const ipfsHash = await uploadToIPFS(auditText);
        const tx = await sendToBlockchain(wallet, fileHash, ipfsHash);
        res.json({ tx });
    } catch (err) {
        res.status(500).json({ error: 'Blockchain write failed', details: err.message });
    }
};

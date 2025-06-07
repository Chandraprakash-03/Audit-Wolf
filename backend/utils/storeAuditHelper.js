import { ethers } from 'ethers';
import { uploadToIPFS } from '../services/ipfsService.js';
import { sendToBlockchain } from '../services/blockchainService.js';
import { supabase } from '../db/supabase.js';

export const storeAuditHelper = async ({ id, wallet, code, auditText }) => {
    const fileHash = ethers.keccak256(Buffer.from(code));
    const ipfsHash = await uploadToIPFS(auditText);
    const tx = await sendToBlockchain(wallet, fileHash, ipfsHash);

    const { data, error } = await supabase.from('Audit').update({
        txHash: tx,
        ipfsCID: ipfsHash,
    }).eq('id', id).select();

    if (error) {
        console.error("❌ Failed to store audit:", error);
        throw new Error("Storing audit failed");
    }

    console.log("✅ Stored audit:", id);
    return tx;
};
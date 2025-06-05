import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { AuditStorageAddress, AuditStorageAbi } from '../abis/AuditStorage.js'

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = AuditStorageAddress // Store deployed contract address in env for safety

// Connect contract instance with signer (wallet)
const auditContract = new ethers.Contract(contractAddress, AuditStorageAbi, wallet);

/**
 * Sends audit data to blockchain
 * @param {string} userWallet - The user's wallet address (optional, your contract uses msg.sender)
 * @param {string} codeHash - keccak256 hash of the audited contract code
 * @param {string} ipfsHash - IPFS CID of the audit report
 * @returns {string} Transaction hash on success
 */
export const sendToBlockchain = async (userWallet, codeHash, ipfsHash) => {
    try {
        // Call your smart contract method - assuming storeAudit(codeHash, ipfsHash)
        // If your contract requires msg.sender only, userWallet param might be just for reference
        const txResponse = await auditContract.storeAudit(codeHash, ipfsHash);
        console.log('Transaction sent. Waiting for confirmation...');

        // Wait for transaction to be mined
        const receipt = await txResponse.wait();
        console.log('Transaction mined:', receipt.logs[0].transactionHash);

        return receipt.logs[0].transactionHash;
    } catch (error) {
        console.error('Error sending audit to blockchain:', error);
        throw error;
    }
};

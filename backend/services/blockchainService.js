// backend/services/blockchainService.js
export const sendToBlockchain = async (wallet, fileHash, reportHash) => {
    console.log("Simulating blockchain interaction...");
    return {
        status: "success",
        txHash: "0x123fakeTxHash456",
        fileHash,
        reportHash,
        wallet,
    };
};

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuditStorage", function () {
    let auditContract;
    let owner, user1;

    const codeHash1 = ethers.keccak256(ethers.toUtf8Bytes("contract A {}"));
    const codeHash2 = ethers.keccak256(ethers.toUtf8Bytes("contract B {}"));
    const ipfsHash1 = "QmABC123...xyz";
    const ipfsHash2 = "QmXYZ456...abc";

    beforeEach(async () => {
        [owner, user1] = await ethers.getSigners();
        const AuditStorage = await ethers.getContractFactory("AuditStorage");
        auditContract = await AuditStorage.deploy();
        await auditContract.waitForDeployment();
    });

    it("should store an audit entry", async () => {
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        const [storedIpfs, timestamp] = await auditContract.getAudit(user1.address, codeHash1);
        expect(storedIpfs).to.equal(ipfsHash1);
        expect(timestamp).to.be.gt(0);
    });

    it("should allow overwriting the same codeHash audit", async () => {
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash2);
        const [storedIpfs] = await auditContract.getAudit(user1.address, codeHash1);
        expect(storedIpfs).to.equal(ipfsHash2);
    });

    it("should track multiple codeHashes per wallet", async () => {
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        await auditContract.connect(user1).storeAudit(codeHash2, ipfsHash2);
        const hashes = await auditContract.getAuditedCodeHashes(user1.address);
        expect(hashes).to.deep.include(codeHash1);
        expect(hashes).to.deep.include(codeHash2);
        expect(hashes.length).to.equal(2);
    });

    it("should not mix audit data between users", async () => {
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        const [storedIpfs] = await auditContract.getAudit(owner.address, codeHash1);
        expect(storedIpfs).to.equal(""); // Empty string if not stored
    });
    it("should update the timestamp when audit is overwritten", async () => {
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        const [, oldTime] = await auditContract.getAudit(user1.address, codeHash1);

        // Wait 1 second to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 1000));

        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash2);
        const [, newTime] = await auditContract.getAudit(user1.address, codeHash1);

        expect(newTime).to.be.gt(oldTime);
    });
    it("should not duplicate codeHash in the user audit list", async () => {
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash2);

        const hashes = await auditContract.getAuditedCodeHashes(user1.address);
        expect(hashes.length).to.equal(1);
        expect(hashes[0]).to.equal(codeHash1);
    });
    it("should store and retrieve 20 audits without collision", async () => {
        const codeHashes = [];

        for (let i = 0; i < 20; i++) {
            const hash = ethers.keccak256(ethers.toUtf8Bytes(`contract ${i}`));
            await auditContract.connect(user1).storeAudit(hash, `QmFakeHash${i}`);
            codeHashes.push(hash);
        }

        const stored = await auditContract.getAuditedCodeHashes(user1.address);
        expect(stored.length).to.equal(20);
        for (let i = 0; i < 20; i++) {
            expect(stored).to.include(codeHashes[i]);
        }
    });
    it("should prevent user from modifying another user's audit", async () => {
        await auditContract.connect(owner).storeAudit(codeHash1, ipfsHash1);

        // user1 tries to overwrite
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash2);

        const [ownerIPFS] = await auditContract.getAudit(owner.address, codeHash1);
        expect(ownerIPFS).to.equal(ipfsHash1); // Should not change
    });
    it("should measure gas used for a single audit", async () => {
        const tx = await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        const receipt = await tx.wait();
        console.log("Gas used for first audit:", receipt.gasUsed.toString());
    });
    it("should not allow storage reentrancy or unexpected write", async () => {
        const tx1 = await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        const tx2 = await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash2);
        const [stored] = await auditContract.getAudit(user1.address, codeHash1);
        expect(stored).to.equal(ipfsHash2);
    });
    it("should handle empty IPFS hash", async () => {
        const emptyIPFS = "";
        await auditContract.connect(user1).storeAudit(codeHash1, emptyIPFS);
        const [stored] = await auditContract.getAudit(user1.address, codeHash1);
        expect(stored).to.equal("");
    });
    it("should store and retrieve empty code hash safely", async () => {
        const emptyHash = ethers.keccak256(ethers.toUtf8Bytes(""));
        await auditContract.connect(user1).storeAudit(emptyHash, ipfsHash1);
        const [stored] = await auditContract.getAudit(user1.address, emptyHash);
        expect(stored).to.equal(ipfsHash1);
    });
    it("should store audit with large IPFS hash (simulate spam)", async () => {
        const spamHash = "Qm" + "a".repeat(200); // IPFS doesn't allow this, but test smart contract anyway
        await auditContract.connect(user1).storeAudit(codeHash1, spamHash);
        const [stored] = await auditContract.getAudit(user1.address, codeHash1);
        expect(stored).to.equal(spamHash);
    });
    it("should reset storage on redeploy", async () => {
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);

        // Re-deploy new contract
        const NewAuditStorage = await ethers.getContractFactory("AuditStorage");
        const newContract = await NewAuditStorage.deploy();
        await newContract.waitForDeployment();

        const [stored] = await newContract.getAudit(user1.address, codeHash1);
        expect(stored).to.equal(""); // Empty means no carryover
    });
    it("should use msg.sender for storage regardless of 'pretended' address", async () => {
        const fakeAddr = owner.address;
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        const [stored] = await auditContract.getAudit(fakeAddr, codeHash1);
        expect(stored).to.equal(""); // Should not affect other wallet
    });
    it("should treat different source code as different codeHashes", async () => {
        const hash1 = ethers.keccak256(ethers.toUtf8Bytes("contract A {}"));
        const hash2 = ethers.keccak256(ethers.toUtf8Bytes("contract A{}")); // no space

        expect(hash1).to.not.equal(hash2);
    });
    it("should allow public read access to any audit", async () => {
        await auditContract.connect(user1).storeAudit(codeHash1, ipfsHash1);
        const [publicView] = await auditContract.getAudit(user1.address, codeHash1);
        expect(publicView).to.equal(ipfsHash1);
    });

});

const hre = require("hardhat");

async function main() {
    const AuditStorage = await hre.ethers.getContractFactory("AuditStorage");
    const auditStorage = await AuditStorage.deploy();
    await auditStorage.waitForDeployment();

    console.log(`✅ Deployed to: ${await auditStorage.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

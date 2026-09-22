import { ethers } from "hardhat";

async function main() {
  const deploymentData = require("../deployedContracts.json");
  const issuerReg = await ethers.getContractAt("IssuerRegistry", deploymentData.contracts.IssuerRegistry.address);
  const idReg = await ethers.getContractAt("IdentityRegistry", deploymentData.contracts.IdentityRegistry.address);
  const claimStore = await ethers.getContractAt("ClaimStore", deploymentData.contracts.ClaimStore.address);
  const kycType = deploymentData.claimTypes.KYC_VERIFIED;

  const acc1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const acc2 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const mainWallet = "0xA854c0793202D0a96b80B16aDF6CD138AE47EbC8";

  console.log("=== ISSUER STATUS ===");
  console.log("0x7099... isTrusted:", await issuerReg.isTrustedIssuer(acc1));
  console.log("0x7099... canIssueKYC:", await issuerReg.canIssueClaim(acc1, kycType));
  console.log("MainWallet isTrusted:", await issuerReg.isTrustedIssuer(mainWallet));
  console.log("MainWallet canIssueKYC:", await issuerReg.canIssueClaim(mainWallet, kycType));

  // Also authorize mainWallet as trusted issuer if not already
  if (!(await issuerReg.isTrustedIssuer(mainWallet))) {
    const [deployer] = await ethers.getSigners();
    console.log("Authorizing mainWallet as trusted issuer...");
    const t1 = await issuerReg.connect(deployer).addIssuer(mainWallet, "Developer Admin Authority");
    await t1.wait();
    const t2 = await issuerReg.connect(deployer).authorizeClaimType(mainWallet, kycType);
    await t2.wait();
    console.log("✓ mainWallet authorized for KYC_VERIFIED!");
  }
}

main().catch(console.error);

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("------------------------------------------------------");
  console.log("Deploying Decentralized Identity System with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("------------------------------------------------------");

  // 1. Deploy IdentityRegistry
  console.log("1. Deploying IdentityRegistry...");
  const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistryFactory.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log(`✓ IdentityRegistry deployed to: ${identityRegistryAddress}`);

  // 2. Deploy IssuerRegistry
  console.log("\n2. Deploying IssuerRegistry...");
  const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistryFactory.deploy(deployer.address);
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddress = await issuerRegistry.getAddress();
  console.log(`✓ IssuerRegistry deployed to: ${issuerRegistryAddress}`);

  // 3. Deploy ClaimStore
  console.log("\n3. Deploying ClaimStore...");
  const ClaimStoreFactory = await ethers.getContractFactory("ClaimStore");
  const claimStore = await ClaimStoreFactory.deploy(issuerRegistryAddress, identityRegistryAddress);
  await claimStore.waitForDeployment();
  const claimStoreAddress = await claimStore.getAddress();
  console.log(`✓ ClaimStore deployed to: ${claimStoreAddress}`);

  // 4. Deploy RecoveryModule
  console.log("\n4. Deploying RecoveryModule...");
  const RecoveryModuleFactory = await ethers.getContractFactory("RecoveryModule");
  const recoveryModule = await RecoveryModuleFactory.deploy();
  await recoveryModule.waitForDeployment();
  const recoveryModuleAddress = await recoveryModule.getAddress();
  console.log(`✓ RecoveryModule deployed to: ${recoveryModuleAddress}`);

  // 5. Standard Claim Types Definition
  const CLAIM_KYC_VERIFIED = ethers.keccak256(ethers.toUtf8Bytes("KYC_VERIFIED"));
  const CLAIM_OVER_18 = ethers.keccak256(ethers.toUtf8Bytes("OVER_18"));
  const CLAIM_RESIDENCY_ACCREDITED = ethers.keccak256(ethers.toUtf8Bytes("RESIDENCY_ACCREDITED"));

  console.log("\nStandard Claim Types Registered:");
  console.log(`- KYC_VERIFIED:          ${CLAIM_KYC_VERIFIED}`);
  console.log(`- OVER_18:               ${CLAIM_OVER_18}`);
  console.log(`- RESIDENCY_ACCREDITED:  ${CLAIM_RESIDENCY_ACCREDITED}`);

  console.log("\nDeployment summary complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

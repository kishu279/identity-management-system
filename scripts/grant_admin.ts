import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const targetAddress = args[0] || process.env.WALLET_ADDRESS || "0xA854c0793202D0a96b80B16aDF6CD138AE47EbC8";

  console.log("--------------------------------------------------");
  console.log("Granting Admin Role & Local ETH Faucet");
  console.log("Target Address:", targetAddress);
  console.log("--------------------------------------------------");

  const [deployer] = await ethers.getSigners();
  const deploymentData = require("../deployedContracts.json");
  const issuerRegistryAddress = deploymentData.contracts.IssuerRegistry.address;

  const issuerReg = await ethers.getContractAt("IssuerRegistry", issuerRegistryAddress, deployer);
  const adminRole = await issuerReg.DEFAULT_ADMIN_ROLE();
  const managerRole = await issuerReg.ISSUER_MANAGER_ROLE();

  // 1. Check & fund local ETH
  const currentBal = await ethers.provider.getBalance(targetAddress);
  console.log(`Current Balance: ${ethers.formatEther(currentBal)} ETH`);

  if (currentBal < ethers.parseEther("1.0")) {
    console.log("Funding 100 ETH from deployer account...");
    const fundTx = await deployer.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther("100.0"),
    });
    await fundTx.wait();
    console.log("✓ 100 ETH successfully transferred to target account");
  }

  // 2. Grant roles
  console.log("Granting DEFAULT_ADMIN_ROLE...");
  const tx1 = await issuerReg.grantRole(adminRole, targetAddress);
  await tx1.wait();

  console.log("Granting ISSUER_MANAGER_ROLE...");
  const tx2 = await issuerReg.grantRole(managerRole, targetAddress);
  await tx2.wait();

  console.log("\n✅ SUCCESS: Target account is now fully empowered as an Admin!");
  console.log(`- Address: ${targetAddress}`);
  console.log(`- has DEFAULT_ADMIN_ROLE: ${await issuerReg.hasRole(adminRole, targetAddress)}`);
  console.log(`- has ISSUER_MANAGER_ROLE: ${await issuerReg.hasRole(managerRole, targetAddress)}`);
  console.log("--------------------------------------------------");
}

main().catch((err) => {
  console.error("Error granting admin:", err);
  process.exit(1);
});

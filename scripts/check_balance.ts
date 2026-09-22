import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  if (!signer) {
    console.error("No signer found. Check your PRIVATE_KEY in .env");
    process.exit(1);
  }

  const address = signer.address;
  const balance = await ethers.provider.getBalance(address);
  const formattedBalance = ethers.formatEther(balance);

  console.log("==================================================");
  console.log("             WALLET BALANCE CHECKER               ");
  console.log("==================================================");
  console.log(`Network:     ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Address:     ${address}`);
  console.log(`Balance:     ${formattedBalance} ETH (${balance.toString()} Wei)`);
  console.log("--------------------------------------------------");

  if (balance === 0n) {
    console.log("⚠️  Status:    INSUFFICIENT FUNDS (0 ETH)");
    console.log("👉 Action:    Fund this address via a faucet before deploying.");
  } else if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Status:    LOW BALANCE (< 0.01 ETH)");
    console.log("ℹ️  Note:      You may run out of gas during multi-contract deployment.");
  } else {
    console.log("✅ Status:    READY TO DEPLOY");
    console.log("ℹ️  Note:      Account has sufficient balance for contract deployment.");
  }
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Error checking balance:", error);
  process.exitCode = 1;
});

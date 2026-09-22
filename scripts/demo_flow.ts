import { ethers } from "hardhat";

async function main() {
  console.log("\n============================================================");
  console.log("   🚀 DECENTRALIZED IDENTITY SYSTEM — LIVE LOCAL DEMO");
  console.log("============================================================\n");

  const [admin, kycProvider, alice, bob] = await ethers.getSigners();

  console.log(`👤 Actors:`);
  console.log(`   Admin:        ${admin.address}`);
  console.log(`   KYC Provider: ${kycProvider.address}`);
  console.log(`   Alice (User): ${alice.address}`);
  console.log(`   Bob (Attacker/Unverified): ${bob.address}\n`);

  // --- Step 1: Deploy Contracts ---
  console.log("📦 1. Deploying Contracts...");
  const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistryFactory.deploy();
  await identityRegistry.waitForDeployment();

  const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistryFactory.deploy(admin.address);
  await issuerRegistry.waitForDeployment();

  const ClaimStoreFactory = await ethers.getContractFactory("ClaimStore");
  const claimStore = await ClaimStoreFactory.deploy(
    await issuerRegistry.getAddress(),
    await identityRegistry.getAddress()
  );
  await claimStore.waitForDeployment();

  const KYC_CLAIM_TYPE = ethers.keccak256(ethers.toUtf8Bytes("KYC_VERIFIED"));
  const GatedDeFiFactory = await ethers.getContractFactory("GatedDeFiService");
  const gatedDeFi = await GatedDeFiFactory.deploy(
    await claimStore.getAddress(),
    KYC_CLAIM_TYPE
  );
  await gatedDeFi.waitForDeployment();

  console.log(`   ✓ IdentityRegistry: ${await identityRegistry.getAddress()}`);
  console.log(`   ✓ IssuerRegistry:   ${await issuerRegistry.getAddress()}`);
  console.log(`   ✓ ClaimStore:       ${await claimStore.getAddress()}`);
  console.log(`   ✓ GatedDeFiService: ${await gatedDeFi.getAddress()}\n`);

  // --- Step 2: Admin configures KYC Provider ---
  console.log("🏛️  2. Admin Onboarding KYC Provider...");
  await issuerRegistry.connect(admin).addIssuer(kycProvider.address, "Global Identity Verifier");
  await issuerRegistry.connect(admin).authorizeClaimType(kycProvider.address, KYC_CLAIM_TYPE);
  console.log(`   ✓ KYC Provider added to IssuerRegistry`);
  console.log(`   ✓ KYC Provider authorized for claim type: KYC_VERIFIED\n`);

  // --- Step 3: Alice registers her Identity ---
  console.log("🆔 3. Alice Registers Her On-Chain Identity...");
  const aliceIpfsURI = "ipfs://QmAliceDIDDocumentHash123456";
  const aliceMetadataHash = ethers.keccak256(ethers.toUtf8Bytes("Alice Profile DID Document"));
  await identityRegistry.connect(alice).registerIdentity(aliceIpfsURI, aliceMetadataHash);
  console.log(`   ✓ Alice identity registered in IdentityRegistry`);
  console.log(`   ✓ Active status: ${await identityRegistry.hasActiveIdentity(alice.address)}\n`);

  // --- Step 4: KYC Provider verifies Alice off-chain & issues claim ---
  console.log("🔍 4. KYC Provider Issues Attestation to Alice...");
  // Simulated off-chain data (PII) -> hashed with salt
  const secretSalt = 1337420n;
  const claimHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "string", "string", "uint256"],
      ["Alice Smith", "PASSPORT_12345678", "US", secretSalt]
    )
  );
  console.log(`   Off-chain PII: ["Alice Smith", "PASSPORT_12345678", "US"]`);
  console.log(`   Salted Claim Hash stored on-chain (zero raw PII): ${claimHash}`);

  // 1 year expiration
  const oneYearExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
  await claimStore.connect(kycProvider).issueClaim(
    alice.address,
    KYC_CLAIM_TYPE,
    claimHash,
    oneYearExpiry
  );
  console.log(`   ✓ Claim successfully stored in ClaimStore\n`);

  // --- Step 5: Check Validity ---
  console.log("🔎 5. Real-Time Verification Check...");
  const [isValid, issuer, hash, expiry] = await claimStore.verifyClaim(alice.address, KYC_CLAIM_TYPE);
  console.log(`   Alice KYC Valid?     ${isValid}`);
  console.log(`   Issuing Authority:   ${issuer}`);
  console.log(`   Expiration:          ${new Date(Number(expiry) * 1000).toLocaleDateString()}\n`);

  // --- Step 6: Alice Interacts with Gated DeFi ---
  console.log("💰 6. Alice Deposits 1.0 ETH into Gated DeFi Service...");
  const depositAmount = ethers.parseEther("1.0");
  await gatedDeFi.connect(alice).deposit({ value: depositAmount });
  console.log(`   ✓ Deposit successful! Alice DeFi Balance: ${ethers.formatEther(await gatedDeFi.userBalances(alice.address))} ETH\n`);

  // --- Step 7: Bob (unverified) attempts deposit ---
  console.log("🚫 7. Unverified Bob Attempts to Deposit 1.0 ETH...");
  try {
    await gatedDeFi.connect(bob).deposit({ value: depositAmount });
    console.log(`   ❌ ERROR: Bob should not have been allowed!`);
  } catch (err: any) {
    console.log(`   ✓ BLOCKED as expected! Error: IdentityVerificationFailed for Bob\n`);
  }

  // --- Step 8: Revocation Demo ---
  console.log("⚠️  8. KYC Provider Revokes Alice's Claim (e.g. Compliance Flag)...");
  await claimStore.connect(kycProvider).revokeClaim(alice.address, KYC_CLAIM_TYPE);
  console.log(`   ✓ Alice's KYC revoked in ClaimStore.`);
  console.log(`   Is Alice still valid? ${await claimStore.isClaimValid(alice.address, KYC_CLAIM_TYPE)}\n`);

  console.log("🚫 9. Alice Attempts to Deposit Again After Revocation...");
  try {
    await gatedDeFi.connect(alice).deposit({ value: depositAmount });
    console.log(`   ❌ ERROR: Alice should not have been allowed!`);
  } catch (err: any) {
    console.log(`   ✓ BLOCKED in real-time! Error: IdentityVerificationFailed for Alice\n`);
  }

  console.log("============================================================");
  console.log("   🎉 ALL LOCAL DEMO STEPS COMPLETED SUCCESSFULLY!");
  console.log("============================================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

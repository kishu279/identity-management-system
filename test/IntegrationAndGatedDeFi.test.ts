import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ClaimStore,
  IdentityRegistry,
  IssuerRegistry,
  GatedDeFiService,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Integration: Gated DeFi Service", () => {
  let identityRegistry: IdentityRegistry;
  let issuerRegistry: IssuerRegistry;
  let claimStore: ClaimStore;
  let gatedDeFi: GatedDeFiService;

  let admin: SignerWithAddress;
  let kycIssuer: SignerWithAddress;
  let verifiedUser: SignerWithAddress;
  let unverifiedUser: SignerWithAddress;

  const KYC_CLAIM_TYPE = ethers.keccak256(ethers.toUtf8Bytes("KYC_VERIFIED"));
  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("Tier 2 Verified KYC"));

  beforeEach(async () => {
    [admin, kycIssuer, verifiedUser, unverifiedUser] = await ethers.getSigners();

    // Deploy contracts
    const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistryFactory.deploy();

    const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
    issuerRegistry = await IssuerRegistryFactory.deploy(admin.address);

    const ClaimStoreFactory = await ethers.getContractFactory("ClaimStore");
    claimStore = await ClaimStoreFactory.deploy(
      await issuerRegistry.getAddress(),
      await identityRegistry.getAddress()
    );

    const GatedDeFiFactory = await ethers.getContractFactory("GatedDeFiService");
    gatedDeFi = await GatedDeFiFactory.deploy(
      await claimStore.getAddress(),
      KYC_CLAIM_TYPE
    );

    // Setup entities
    await issuerRegistry.connect(admin).addIssuer(kycIssuer.address, "Global KYC Provider");
    await issuerRegistry.connect(admin).authorizeClaimType(kycIssuer.address, KYC_CLAIM_TYPE);

    await identityRegistry.connect(verifiedUser).registerIdentity(
      "ipfs://QmVerifiedUserDID",
      ethers.keccak256(ethers.toUtf8Bytes("doc"))
    );

    await claimStore.connect(kycIssuer).issueClaim(
      verifiedUser.address,
      KYC_CLAIM_TYPE,
      sampleHash,
      0 // permanent
    );
  });

  it("should allow verified user to deposit into DeFi protocol", async () => {
    const depositAmount = ethers.parseEther("1.0");

    await expect(
      gatedDeFi.connect(verifiedUser).deposit({ value: depositAmount })
    )
      .to.emit(gatedDeFi, "Deposited")
      .withArgs(verifiedUser.address, depositAmount);

    expect(await gatedDeFi.userBalances(verifiedUser.address)).to.equal(depositAmount);
  });

  it("should reject deposit from unverified user", async () => {
    const depositAmount = ethers.parseEther("1.0");

    await expect(
      gatedDeFi.connect(unverifiedUser).deposit({ value: depositAmount })
    ).to.be.revertedWithCustomError(gatedDeFi, "IdentityVerificationFailed")
     .withArgs(unverifiedUser.address, KYC_CLAIM_TYPE);
  });

  it("should immediately reject deposits if the user's KYC is revoked in real-time", async () => {
    // Revoke KYC
    await claimStore.connect(kycIssuer).revokeClaim(verifiedUser.address, KYC_CLAIM_TYPE);

    const depositAmount = ethers.parseEther("1.0");
    await expect(
      gatedDeFi.connect(verifiedUser).deposit({ value: depositAmount })
    ).to.be.revertedWithCustomError(gatedDeFi, "IdentityVerificationFailed")
     .withArgs(verifiedUser.address, KYC_CLAIM_TYPE);
  });
});

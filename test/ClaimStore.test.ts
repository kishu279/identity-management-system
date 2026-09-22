import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ClaimStore, IdentityRegistry, IssuerRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ClaimStore", () => {
  let claimStore: ClaimStore;
  let identityRegistry: IdentityRegistry;
  let issuerRegistry: IssuerRegistry;

  let admin: SignerWithAddress;
  let issuer: SignerWithAddress;
  let unauthorizedIssuer: SignerWithAddress;
  let user: SignerWithAddress;

  const KYC_CLAIM_TYPE = ethers.keccak256(ethers.toUtf8Bytes("KYC_VERIFIED"));
  const sampleClaimHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "string", "uint256"],
      ["John Doe", "Passport12345", 987654321n]
    )
  );

  beforeEach(async () => {
    [admin, issuer, unauthorizedIssuer, user] = await ethers.getSigners();

    // Deploy registries
    const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistryFactory.deploy();
    await identityRegistry.waitForDeployment();

    const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
    issuerRegistry = await IssuerRegistryFactory.deploy(admin.address);
    await issuerRegistry.waitForDeployment();

    // Deploy ClaimStore
    const ClaimStoreFactory = await ethers.getContractFactory("ClaimStore");
    claimStore = await ClaimStoreFactory.deploy(
      await issuerRegistry.getAddress(),
      await identityRegistry.getAddress()
    );
    await claimStore.waitForDeployment();

    // Setup: User registers identity
    await identityRegistry.connect(user).registerIdentity(
      "ipfs://QmUserDID",
      ethers.keccak256(ethers.toUtf8Bytes("user-doc"))
    );

    // Setup: Authorize issuer for KYC
    await issuerRegistry.connect(admin).addIssuer(issuer.address, "Verified KYC Authority");
    await issuerRegistry.connect(admin).authorizeClaimType(issuer.address, KYC_CLAIM_TYPE);
  });

  describe("Issuing Claims", () => {
    it("should allow an authorized issuer to issue a permanent claim", async () => {
      await expect(
        claimStore.connect(issuer).issueClaim(user.address, KYC_CLAIM_TYPE, sampleClaimHash, 0)
      )
        .to.emit(claimStore, "ClaimIssued")
        .withArgs(user.address, KYC_CLAIM_TYPE, sampleClaimHash, issuer.address, 0);

      const [valid, issuingEntity, hash, expiry] = await claimStore.verifyClaim(user.address, KYC_CLAIM_TYPE);
      expect(valid).to.be.true;
      expect(issuingEntity).to.equal(issuer.address);
      expect(hash).to.equal(sampleClaimHash);
      expect(expiry).to.equal(0n);
      expect(await claimStore.isClaimValid(user.address, KYC_CLAIM_TYPE)).to.be.true;
    });

    it("should reject claim issuance from unauthorized issuer", async () => {
      await expect(
        claimStore.connect(unauthorizedIssuer).issueClaim(user.address, KYC_CLAIM_TYPE, sampleClaimHash, 0)
      ).to.be.revertedWithCustomError(claimStore, "UnauthorizedIssuer")
       .withArgs(unauthorizedIssuer.address, KYC_CLAIM_TYPE);
    });

    it("should reject claim issuance for subject without active identity", async () => {
      const unregisteredUser = unauthorizedIssuer.address;
      await expect(
        claimStore.connect(issuer).issueClaim(unregisteredUser, KYC_CLAIM_TYPE, sampleClaimHash, 0)
      ).to.be.revertedWithCustomError(claimStore, "SubjectHasNoActiveIdentity")
       .withArgs(unregisteredUser);
    });
  });

  describe("Claim Expiration", () => {
    it("should verify claim as invalid after expiration date", async () => {
      const now = await time.latest();
      const expiresAt = now + 3600; // 1 hour validity

      await claimStore.connect(issuer).issueClaim(user.address, KYC_CLAIM_TYPE, sampleClaimHash, expiresAt);

      // Should be valid right now
      expect(await claimStore.isClaimValid(user.address, KYC_CLAIM_TYPE)).to.be.true;

      // Fast forward 2 hours
      await time.increase(7200);

      // Should now be invalid due to expiration
      const [valid] = await claimStore.verifyClaim(user.address, KYC_CLAIM_TYPE);
      expect(valid).to.be.false;
      expect(await claimStore.isClaimValid(user.address, KYC_CLAIM_TYPE)).to.be.false;
    });
  });

  describe("Claim Revocation", () => {
    beforeEach(async () => {
      await claimStore.connect(issuer).issueClaim(user.address, KYC_CLAIM_TYPE, sampleClaimHash, 0);
    });

    it("should allow original issuer to revoke a claim", async () => {
      expect(await claimStore.isClaimValid(user.address, KYC_CLAIM_TYPE)).to.be.true;

      await expect(claimStore.connect(issuer).revokeClaim(user.address, KYC_CLAIM_TYPE))
        .to.emit(claimStore, "ClaimRevoked")
        .withArgs(user.address, KYC_CLAIM_TYPE, issuer.address);

      expect(await claimStore.isClaimValid(user.address, KYC_CLAIM_TYPE)).to.be.false;
    });

    it("should reject revocation from unrelated parties", async () => {
      await expect(
        claimStore.connect(unauthorizedIssuer).revokeClaim(user.address, KYC_CLAIM_TYPE)
      ).to.be.revertedWithCustomError(claimStore, "UnauthorizedRevoker")
       .withArgs(unauthorizedIssuer.address);
    });
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { IssuerRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IssuerRegistry", () => {
  let issuerRegistry: IssuerRegistry;
  let admin: SignerWithAddress;
  let issuer1: SignerWithAddress;
  let attacker: SignerWithAddress;

  const KYC_CLAIM_TYPE = ethers.keccak256(ethers.toUtf8Bytes("KYC_VERIFIED"));
  const OVER_18_CLAIM_TYPE = ethers.keccak256(ethers.toUtf8Bytes("OVER_18"));

  beforeEach(async () => {
    [admin, issuer1, attacker] = await ethers.getSigners();
    const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
    issuerRegistry = await IssuerRegistryFactory.deploy(admin.address);
    await issuerRegistry.waitForDeployment();
  });

  describe("Admin & Issuer Management", () => {
    it("should allow admin to add an issuer", async () => {
      await expect(issuerRegistry.connect(admin).addIssuer(issuer1.address, "Chainalysis KYC Provider"))
        .to.emit(issuerRegistry, "IssuerAdded")
        .withArgs(issuer1.address, "Chainalysis KYC Provider", (val: bigint) => val > 0n);

      expect(await issuerRegistry.isTrustedIssuer(issuer1.address)).to.be.true;
      expect(await issuerRegistry.getIssuerName(issuer1.address)).to.equal("Chainalysis KYC Provider");
    });

    it("should prevent non-admin from adding issuers", async () => {
      await expect(
        issuerRegistry.connect(attacker).addIssuer(attacker.address, "Fake Issuer")
      ).to.be.revertedWithCustomError(issuerRegistry, "AccessControlUnauthorizedAccount");
    });

    it("should prevent adding an existing issuer or zero address", async () => {
      await issuerRegistry.connect(admin).addIssuer(issuer1.address, "Provider 1");

      await expect(
        issuerRegistry.connect(admin).addIssuer(issuer1.address, "Provider 1")
      ).to.be.revertedWithCustomError(issuerRegistry, "IssuerAlreadyExists")
       .withArgs(issuer1.address);

      await expect(
        issuerRegistry.connect(admin).addIssuer(ethers.ZeroAddress, "Provider Zero")
      ).to.be.revertedWithCustomError(issuerRegistry, "ZeroAddress");
    });

    it("should allow admin to remove an issuer", async () => {
      await issuerRegistry.connect(admin).addIssuer(issuer1.address, "Provider 1");
      expect(await issuerRegistry.isTrustedIssuer(issuer1.address)).to.be.true;

      await expect(issuerRegistry.connect(admin).removeIssuer(issuer1.address))
        .to.emit(issuerRegistry, "IssuerRemoved")
        .withArgs(issuer1.address, (val: bigint) => val > 0n);

      expect(await issuerRegistry.isTrustedIssuer(issuer1.address)).to.be.false;
    });
  });

  describe("Claim Type Permissions", () => {
    beforeEach(async () => {
      await issuerRegistry.connect(admin).addIssuer(issuer1.address, "Certifier");
    });

    it("should allow authorizing and revoking claim types for an issuer", async () => {
      expect(await issuerRegistry.canIssueClaim(issuer1.address, KYC_CLAIM_TYPE)).to.be.false;

      await expect(issuerRegistry.connect(admin).authorizeClaimType(issuer1.address, KYC_CLAIM_TYPE))
        .to.emit(issuerRegistry, "ClaimTypeAuthorized")
        .withArgs(issuer1.address, KYC_CLAIM_TYPE, (val: bigint) => val > 0n);

      expect(await issuerRegistry.canIssueClaim(issuer1.address, KYC_CLAIM_TYPE)).to.be.true;
      expect(await issuerRegistry.canIssueClaim(issuer1.address, OVER_18_CLAIM_TYPE)).to.be.false;

      // Revocation of claim type
      await expect(issuerRegistry.connect(admin).revokeClaimType(issuer1.address, KYC_CLAIM_TYPE))
        .to.emit(issuerRegistry, "ClaimTypeRevoked")
        .withArgs(issuer1.address, KYC_CLAIM_TYPE, (val: bigint) => val > 0n);

      expect(await issuerRegistry.canIssueClaim(issuer1.address, KYC_CLAIM_TYPE)).to.be.false;
    });
  });
});

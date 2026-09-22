import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IdentityRegistry", () => {
  let identityRegistry: IdentityRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const sampleURI = "ipfs://QmZtmD2qt8fJpq3CLHzNV2d9rXk39H1Y3n6Zp";
  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("did:eth:user1-profile-data"));

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistryFactory.deploy();
    await identityRegistry.waitForDeployment();
  });

  describe("Registration", () => {
    it("should allow a user to register an identity", async () => {
      await expect(identityRegistry.connect(user1).registerIdentity(sampleURI, sampleHash))
        .to.emit(identityRegistry, "IdentityRegistered")
        .withArgs(user1.address, sampleURI, sampleHash, (val: bigint) => val > 0n);

      const record = await identityRegistry.getIdentity(user1.address);
      expect(record.exists).to.be.true;
      expect(record.owner).to.equal(user1.address);
      expect(record.metadataURI).to.equal(sampleURI);
      expect(record.metadataHash).to.equal(sampleHash);
      expect(record.active).to.be.true;

      expect(await identityRegistry.hasActiveIdentity(user1.address)).to.be.true;
      expect(await identityRegistry.totalIdentities()).to.equal(1n);
    });

    it("should revert if user attempts to register twice", async () => {
      await identityRegistry.connect(user1).registerIdentity(sampleURI, sampleHash);

      await expect(
        identityRegistry.connect(user1).registerIdentity(sampleURI, sampleHash)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityAlreadyExists")
       .withArgs(user1.address);
    });

    it("should revert with empty URI or zero hash", async () => {
      await expect(
        identityRegistry.connect(user1).registerIdentity("", sampleHash)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidMetadata");

      await expect(
        identityRegistry.connect(user1).registerIdentity(sampleURI, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidMetadata");
    });
  });

  describe("Metadata Updates", () => {
    beforeEach(async () => {
      await identityRegistry.connect(user1).registerIdentity(sampleURI, sampleHash);
    });

    it("should allow owner to update metadata", async () => {
      const newURI = "ipfs://QmUpdated123456789";
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("updated-doc"));

      await expect(identityRegistry.connect(user1).updateMetadata(newURI, newHash))
        .to.emit(identityRegistry, "IdentityMetadataUpdated")
        .withArgs(user1.address, newURI, newHash, (val: bigint) => val > 0n);

      const record = await identityRegistry.getIdentity(user1.address);
      expect(record.metadataURI).to.equal(newURI);
      expect(record.metadataHash).to.equal(newHash);
    });

    it("should revert update if identity not registered", async () => {
      await expect(
        identityRegistry.connect(user2).updateMetadata(sampleURI, sampleHash)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityNotFound")
       .withArgs(user2.address);
    });
  });

  describe("Deactivation and Reactivation", () => {
    beforeEach(async () => {
      await identityRegistry.connect(user1).registerIdentity(sampleURI, sampleHash);
    });

    it("should allow owner to deactivate and reactivate their identity", async () => {
      await expect(identityRegistry.connect(user1).deactivateIdentity())
        .to.emit(identityRegistry, "IdentityDeactivated");

      expect(await identityRegistry.hasActiveIdentity(user1.address)).to.be.false;

      // Reactivation
      await expect(identityRegistry.connect(user1).reactivateIdentity())
        .to.emit(identityRegistry, "IdentityReactivated");

      expect(await identityRegistry.hasActiveIdentity(user1.address)).to.be.true;
    });

    it("should revert metadata updates while inactive", async () => {
      await identityRegistry.connect(user1).deactivateIdentity();

      await expect(
        identityRegistry.connect(user1).updateMetadata("ipfs://new", sampleHash)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityInactive")
       .withArgs(user1.address);
    });
  });
});

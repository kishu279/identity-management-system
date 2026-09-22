import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ClaimStore, IdentityRegistry, IssuerRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ClaimStore - EIP-712 Signed Claims", () => {
  let claimStore: ClaimStore;
  let identityRegistry: IdentityRegistry;
  let issuerRegistry: IssuerRegistry;

  let admin: SignerWithAddress;
  let issuer: SignerWithAddress;
  let user: SignerWithAddress;
  let relayer: SignerWithAddress;

  const KYC_CLAIM_TYPE = ethers.keccak256(ethers.toUtf8Bytes("KYC_VERIFIED"));
  const sampleClaimHash = ethers.keccak256(ethers.toUtf8Bytes("Off-chain KYC Credential payload"));

  beforeEach(async () => {
    [admin, issuer, user, relayer] = await ethers.getSigners();

    const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistryFactory.deploy();
    await identityRegistry.waitForDeployment();

    const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
    issuerRegistry = await IssuerRegistryFactory.deploy(admin.address);
    await issuerRegistry.waitForDeployment();

    const ClaimStoreFactory = await ethers.getContractFactory("ClaimStore");
    claimStore = await ClaimStoreFactory.deploy(
      await issuerRegistry.getAddress(),
      await identityRegistry.getAddress()
    );
    await claimStore.waitForDeployment();

    await identityRegistry.connect(user).registerIdentity(
      "ipfs://QmUserDID",
      ethers.keccak256(ethers.toUtf8Bytes("user-doc"))
    );

    await issuerRegistry.connect(admin).addIssuer(issuer.address, "Verified Authority");
    await issuerRegistry.connect(admin).authorizeClaimType(issuer.address, KYC_CLAIM_TYPE);
  });

  it("should issue claim using valid EIP-712 off-chain issuer signature via a relayer", async () => {
    const claimStoreAddress = await claimStore.getAddress();
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    const domain = {
      name: "DecentralizedIdentityClaimStore",
      version: "1",
      chainId: chainId,
      verifyingContract: claimStoreAddress,
    };

    const types = {
      IssueClaim: [
        { name: "issuer", type: "address" },
        { name: "subject", type: "address" },
        { name: "claimType", type: "bytes32" },
        { name: "claimHash", type: "bytes32" },
        { name: "expiresAt", type: "uint64" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const nonce = await claimStore.issuerNonces(issuer.address);
    const deadline = (await time.latest()) + 3600;
    const expiresAt = 0; // Permanent claim

    const message = {
      issuer: issuer.address,
      subject: user.address,
      claimType: KYC_CLAIM_TYPE,
      claimHash: sampleClaimHash,
      expiresAt: expiresAt,
      nonce: nonce,
      deadline: deadline,
    };

    // Issuer signs typed data off-chain
    const signature = await issuer.signTypedData(domain, types, message);

    // Relayer submits the transaction on-chain (user/issuer pays zero gas)
    await expect(
      claimStore.connect(relayer).issueClaimWithSignature(
        issuer.address,
        user.address,
        KYC_CLAIM_TYPE,
        sampleClaimHash,
        expiresAt,
        deadline,
        signature
      )
    )
      .to.emit(claimStore, "ClaimIssued")
      .withArgs(user.address, KYC_CLAIM_TYPE, sampleClaimHash, issuer.address, expiresAt);

    // Verify claim is now valid
    expect(await claimStore.isClaimValid(user.address, KYC_CLAIM_TYPE)).to.be.true;

    // Nonce should have incremented
    expect(await claimStore.issuerNonces(issuer.address)).to.equal(1n);
  });

  it("should revert if signature deadline has expired", async () => {
    const claimStoreAddress = await claimStore.getAddress();
    const network = await ethers.provider.getNetwork();

    const domain = {
      name: "DecentralizedIdentityClaimStore",
      version: "1",
      chainId: network.chainId,
      verifyingContract: claimStoreAddress,
    };

    const types = {
      IssueClaim: [
        { name: "issuer", type: "address" },
        { name: "subject", type: "address" },
        { name: "claimType", type: "bytes32" },
        { name: "claimHash", type: "bytes32" },
        { name: "expiresAt", type: "uint64" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const nonce = await claimStore.issuerNonces(issuer.address);
    const deadline = (await time.latest()) + 100;

    const message = {
      issuer: issuer.address,
      subject: user.address,
      claimType: KYC_CLAIM_TYPE,
      claimHash: sampleClaimHash,
      expiresAt: 0,
      nonce: nonce,
      deadline: deadline,
    };

    const signature = await issuer.signTypedData(domain, types, message);

    // Warp past deadline
    await time.increase(200);

    await expect(
      claimStore.connect(relayer).issueClaimWithSignature(
        issuer.address,
        user.address,
        KYC_CLAIM_TYPE,
        sampleClaimHash,
        0,
        deadline,
        signature
      )
    ).to.be.revertedWithCustomError(claimStore, "SignatureExpired");
  });
});

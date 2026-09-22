import { expect } from "chai";
import { ethers } from "hardhat";
import { RecoveryModule } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RecoveryModule (Social Recovery)", () => {
  let recoveryModule: RecoveryModule;
  let user: SignerWithAddress;
  let guardianA: SignerWithAddress;
  let guardianB: SignerWithAddress;
  let guardianC: SignerWithAddress;
  let newWallet: SignerWithAddress;
  let stranger: SignerWithAddress;

  beforeEach(async () => {
    [user, guardianA, guardianB, guardianC, newWallet, stranger] = await ethers.getSigners();

    const RecoveryModuleFactory = await ethers.getContractFactory("RecoveryModule");
    recoveryModule = await RecoveryModuleFactory.deploy();
    await recoveryModule.waitForDeployment();

    // User sets 2-of-3 guardian configuration
    await recoveryModule.connect(user).configureGuardians(
      [guardianA.address, guardianB.address, guardianC.address],
      2
    );
  });

  it("should configure guardians and threshold correctly", async () => {
    expect(await recoveryModule.isGuardian(user.address, guardianA.address)).to.be.true;
    expect(await recoveryModule.isGuardian(user.address, guardianB.address)).to.be.true;
    expect(await recoveryModule.isGuardian(user.address, stranger.address)).to.be.false;

    const config = await recoveryModule.guardianConfigs(user.address);
    expect(config.threshold).to.equal(2n);
    expect(config.initialized).to.be.true;
  });

  it("should allow guardians to approve and execute recovery when threshold is met", async () => {
    // Guardian A approves recovery to newWallet
    await expect(
      recoveryModule.connect(guardianA).approveRecovery(user.address, newWallet.address)
    )
      .to.emit(recoveryModule, "RecoveryInitiated")
      .withArgs(user.address, newWallet.address, guardianA.address);

    // Should fail to execute before threshold is reached
    await expect(
      recoveryModule.connect(newWallet).executeRecovery(user.address, newWallet.address)
    ).to.be.revertedWithCustomError(recoveryModule, "ThresholdNotMet");

    // Guardian B approves (2nd approval, threshold reached!)
    await expect(
      recoveryModule.connect(guardianB).approveRecovery(user.address, newWallet.address)
    )
      .to.emit(recoveryModule, "RecoveryApproved")
      .withArgs(user.address, newWallet.address, guardianB.address, 2n);

    // Now execute recovery
    await expect(
      recoveryModule.connect(newWallet).executeRecovery(user.address, newWallet.address)
    )
      .to.emit(recoveryModule, "RecoveryExecuted")
      .withArgs(user.address, newWallet.address);

    const req = await recoveryModule.recoveryRequests(user.address, newWallet.address);
    expect(req.executed).to.be.true;
  });

  it("should reject approval from non-guardians", async () => {
    await expect(
      recoveryModule.connect(stranger).approveRecovery(user.address, newWallet.address)
    ).to.be.revertedWithCustomError(recoveryModule, "NotGuardian");
  });
});

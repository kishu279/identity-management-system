// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RecoveryModule
 * @notice Guardian-based social recovery module for decentralized identities.
 * Enables M-of-N guardians to transfer identity control to a new address if private keys are lost.
 */
contract RecoveryModule {
    struct GuardianConfig {
        address[] guardians;
        uint256 threshold;
        bool initialized;
    }

    struct RecoveryRequest {
        address newOwner;
        uint256 approvalCount;
        uint64 executedAt;
        bool executed;
    }

    // owner => GuardianConfig
    mapping(address => GuardianConfig) public guardianConfigs;

    // owner => guardian => isGuardian
    mapping(address => mapping(address => bool)) public isGuardian;

    // owner => newOwner => RecoveryRequest
    mapping(address => mapping(address => RecoveryRequest)) public recoveryRequests;

    // owner => newOwner => guardian => hasApproved
    mapping(address => mapping(address => mapping(address => bool))) public hasApproved;

    event GuardiansConfigured(address indexed owner, address[] guardians, uint256 threshold);
    event RecoveryInitiated(address indexed owner, address indexed newOwner, address indexed guardian);
    event RecoveryApproved(address indexed owner, address indexed newOwner, address indexed guardian, uint256 currentApprovals);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);

    error InvalidThreshold();
    error AlreadyConfigured();
    error NotConfigured();
    error NotGuardian();
    error AlreadyApproved();
    error AlreadyExecuted();
    error ThresholdNotMet(uint256 current, uint256 required);
    error InvalidAddress();

    /**
     * @notice Configures social recovery guardians for the caller's identity.
     * @param guardians Array of guardian addresses.
     * @param threshold Minimum approvals needed to execute recovery (M-of-N).
     */
    function configureGuardians(address[] calldata guardians, uint256 threshold) external {
        if (guardians.length == 0 || threshold == 0 || threshold > guardians.length) {
            revert InvalidThreshold();
        }
        if (guardianConfigs[msg.sender].initialized) revert AlreadyConfigured();

        GuardianConfig storage config = guardianConfigs[msg.sender];
        config.threshold = threshold;
        config.initialized = true;

        for (uint256 i = 0; i < guardians.length; i++) {
            address g = guardians[i];
            if (g == address(0) || g == msg.sender || isGuardian[msg.sender][g]) {
                revert InvalidAddress();
            }
            isGuardian[msg.sender][g] = true;
            config.guardians.push(g);
        }

        emit GuardiansConfigured(msg.sender, guardians, threshold);
    }

    /**
     * @notice Guardian submits approval to recover an identity to a new address.
     * @param oldOwner Identity owner that lost access.
     * @param newOwner Target wallet address to assume identity.
     */
    function approveRecovery(address oldOwner, address newOwner) external {
        if (!guardianConfigs[oldOwner].initialized) revert NotConfigured();
        if (!isGuardian[oldOwner][msg.sender]) revert NotGuardian();
        if (newOwner == address(0) || newOwner == oldOwner) revert InvalidAddress();

        RecoveryRequest storage req = recoveryRequests[oldOwner][newOwner];
        if (req.executed) revert AlreadyExecuted();
        if (hasApproved[oldOwner][newOwner][msg.sender]) revert AlreadyApproved();

        hasApproved[oldOwner][newOwner][msg.sender] = true;
        req.approvalCount++;
        req.newOwner = newOwner;

        if (req.approvalCount == 1) {
            emit RecoveryInitiated(oldOwner, newOwner, msg.sender);
        }
        emit RecoveryApproved(oldOwner, newOwner, msg.sender, req.approvalCount);
    }

    /**
     * @notice Executes recovery once threshold of guardian approvals is met.
     */
    function executeRecovery(address oldOwner, address newOwner) external {
        GuardianConfig storage config = guardianConfigs[oldOwner];
        if (!config.initialized) revert NotConfigured();

        RecoveryRequest storage req = recoveryRequests[oldOwner][newOwner];
        if (req.executed) revert AlreadyExecuted();
        if (req.approvalCount < config.threshold) {
            revert ThresholdNotMet(req.approvalCount, config.threshold);
        }

        req.executed = true;
        req.executedAt = uint64(block.timestamp);

        emit RecoveryExecuted(oldOwner, newOwner);
    }
}

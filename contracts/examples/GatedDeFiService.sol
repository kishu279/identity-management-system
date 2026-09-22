// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IClaimStore} from "../interfaces/IClaimStore.sol";

/**
 * @title GatedDeFiService
 * @notice Example relying party (verifier) contract demonstrating how DApps consume verifiable credentials.
 * Only wallets with valid KYC / residency claims verified in real-time can deposit or interact.
 */
contract GatedDeFiService {
    IClaimStore public immutable claimStore;
    bytes32 public immutable requiredClaimType;

    mapping(address => uint256) public userBalances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    error IdentityVerificationFailed(address user, bytes32 claimType);
    error InsufficientBalance();
    error ZeroDeposit();

    constructor(address _claimStore, bytes32 _requiredClaimType) {
        claimStore = IClaimStore(_claimStore);
        requiredClaimType = _requiredClaimType;
    }

    /**
     * @notice Allows verified users to deposit funds into the protocol.
     */
    function deposit() external payable {
        if (msg.value == 0) revert ZeroDeposit();

        // Real-time verification: checks existence, active issuer, unrevoked, and unexpired status
        if (!claimStore.isClaimValid(msg.sender, requiredClaimType)) {
            revert IdentityVerificationFailed(msg.sender, requiredClaimType);
        }

        userBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Allows users to withdraw funds.
     */
    function withdraw(uint256 amount) external {
        if (userBalances[msg.sender] < amount) revert InsufficientBalance();

        userBalances[msg.sender] -= amount;
        emit Withdrawn(msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}

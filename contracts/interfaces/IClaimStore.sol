// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IClaimStore
 * @notice Interface for storing, verifying, and revoking cryptographic attestations / claims.
 */
interface IClaimStore {
    struct ClaimRecord {
        bytes32 claimHash; // Salted cryptographic hash of the claim attributes (zero raw PII)
        address issuer;    // Address of the issuing entity
        uint64 issuedAt;   // Unix timestamp of issuance
        uint64 expiresAt;  // Expiration timestamp (0 = does not expire)
        bool revoked;      // Revocation flag
    }

    event ClaimIssued(
        address indexed subject,
        bytes32 indexed claimType,
        bytes32 claimHash,
        address indexed issuer,
        uint64 expiresAt
    );

    event ClaimRevoked(
        address indexed subject,
        bytes32 indexed claimType,
        address indexed revoker
    );

    function issueClaim(
        address subject,
        bytes32 claimType,
        bytes32 claimHash,
        uint64 expiresAt
    ) external;

    function issueClaimWithSignature(
        address issuer,
        address subject,
        bytes32 claimType,
        bytes32 claimHash,
        uint64 expiresAt,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function revokeClaim(address subject, bytes32 claimType) external;

    function verifyClaim(
        address subject,
        bytes32 claimType
    )
        external
        view
        returns (
            bool valid,
            address issuer,
            bytes32 claimHash,
            uint64 expiresAt
        );

    function isClaimValid(address subject, bytes32 claimType) external view returns (bool);

    function getClaim(
        address subject,
        bytes32 claimType
    ) external view returns (ClaimRecord memory);
}
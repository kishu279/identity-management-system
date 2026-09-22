// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IIssuerRegistry
 * @notice Interface for managing approved claim issuers and their allowed claim types.
 */
interface IIssuerRegistry {
    event IssuerAdded(address indexed issuer, string name, uint64 timestamp);
    event IssuerRemoved(address indexed issuer, uint64 timestamp);
    event ClaimTypeAuthorized(address indexed issuer, bytes32 indexed claimType, uint64 timestamp);
    event ClaimTypeRevoked(address indexed issuer, bytes32 indexed claimType, uint64 timestamp);

    function addIssuer(address issuer, string calldata name) external;
    function removeIssuer(address issuer) external;
    function authorizeClaimType(address issuer, bytes32 claimType) external;
    function revokeClaimType(address issuer, bytes32 claimType) external;
    function isTrustedIssuer(address issuer) external view returns (bool);
    function canIssueClaim(address issuer, bytes32 claimType) external view returns (bool);
    function getIssuerName(address issuer) external view returns (string memory);
}

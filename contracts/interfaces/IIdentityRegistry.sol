// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IIdentityRegistry
 * @notice Interface for on-chain Decentralized Identity lifecycle management.
 */
interface IIdentityRegistry {
    struct IdentityRecord {
        bool exists;
        address owner;
        uint64 createdAt;
        uint64 updatedAt;
        string metadataURI; // Off-chain DID document or IPFS reference
        bytes32 metadataHash; // keccak256 hash of metadata for tamper-evidence
        bool active;
    }

    event IdentityRegistered(
        address indexed owner,
        string metadataURI,
        bytes32 metadataHash,
        uint64 timestamp
    );

    event IdentityMetadataUpdated(
        address indexed owner,
        string metadataURI,
        bytes32 metadataHash,
        uint64 timestamp
    );

    event IdentityDeactivated(address indexed owner, uint64 timestamp);
    event IdentityReactivated(address indexed owner, uint64 timestamp);

    function registerIdentity(string calldata metadataURI, bytes32 metadataHash) external;
    function updateMetadata(string calldata metadataURI, bytes32 metadataHash) external;
    function deactivateIdentity() external;
    function reactivateIdentity() external;
    function getIdentity(address owner) external view returns (IdentityRecord memory);
    function hasActiveIdentity(address owner) external view returns (bool);
}

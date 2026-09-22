// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";

/**
 * @title IdentityRegistry
 * @notice Core registry mapping Ethereum addresses to on-chain identity profiles.
 * Users maintain self-sovereignty over their identity lifecycle and metadata pointers.
 */
contract IdentityRegistry is IIdentityRegistry {
    // Mapping from wallet address to IdentityRecord
    mapping(address => IdentityRecord) private _identities;

    // Total registered identities counter
    uint256 public totalIdentities;

    error IdentityAlreadyExists(address owner);
    error IdentityNotFound(address owner);
    error IdentityInactive(address owner);
    error IdentityAlreadyActive(address owner);
    error InvalidMetadata();

    /**
     * @notice Registers a new on-chain identity for the caller.
     * @param metadataURI Off-chain reference URI (e.g. IPFS or DID doc).
     * @param metadataHash Cryptographic hash (keccak256) of the off-chain metadata.
     */
    function registerIdentity(string calldata metadataURI, bytes32 metadataHash) external {
        address owner = msg.sender;
        if (_identities[owner].exists) revert IdentityAlreadyExists(owner);
        if (bytes(metadataURI).length == 0 || metadataHash == bytes32(0)) revert InvalidMetadata();

        uint64 nowTs = uint64(block.timestamp);

        _identities[owner] = IdentityRecord({
            exists: true,
            owner: owner,
            createdAt: nowTs,
            updatedAt: nowTs,
            metadataURI: metadataURI,
            metadataHash: metadataHash,
            active: true
        });

        totalIdentities++;

        emit IdentityRegistered(owner, metadataURI, metadataHash, nowTs);
    }

    /**
     * @notice Updates off-chain metadata pointers for an existing active identity.
     * @param metadataURI New off-chain metadata URI.
     * @param metadataHash New hash of the metadata.
     */
    function updateMetadata(string calldata metadataURI, bytes32 metadataHash) external {
        address owner = msg.sender;
        IdentityRecord storage record = _identities[owner];

        if (!record.exists) revert IdentityNotFound(owner);
        if (!record.active) revert IdentityInactive(owner);
        if (bytes(metadataURI).length == 0 || metadataHash == bytes32(0)) revert InvalidMetadata();

        uint64 nowTs = uint64(block.timestamp);
        record.metadataURI = metadataURI;
        record.metadataHash = metadataHash;
        record.updatedAt = nowTs;

        emit IdentityMetadataUpdated(owner, metadataURI, metadataHash, nowTs);
    }

    /**
     * @notice Allows an owner to deactivate their own identity.
     */
    function deactivateIdentity() external {
        address owner = msg.sender;
        IdentityRecord storage record = _identities[owner];

        if (!record.exists) revert IdentityNotFound(owner);
        if (!record.active) revert IdentityInactive(owner);

        record.active = false;
        record.updatedAt = uint64(block.timestamp);

        emit IdentityDeactivated(owner, uint64(block.timestamp));
    }

    /**
     * @notice Allows an owner to reactivate their deactivated identity.
     */
    function reactivateIdentity() external {
        address owner = msg.sender;
        IdentityRecord storage record = _identities[owner];

        if (!record.exists) revert IdentityNotFound(owner);
        if (record.active) revert IdentityAlreadyActive(owner);

        record.active = true;
        record.updatedAt = uint64(block.timestamp);

        emit IdentityReactivated(owner, uint64(block.timestamp));
    }

    /**
     * @notice Returns the full IdentityRecord for an address.
     */
    function getIdentity(address owner) external view returns (IdentityRecord memory) {
        IdentityRecord memory record = _identities[owner];
        if (!record.exists) revert IdentityNotFound(owner);
        return record;
    }

    /**
     * @notice Quick check to see if an address has a registered and active identity.
     */
    function hasActiveIdentity(address owner) external view returns (bool) {
        return _identities[owner].exists && _identities[owner].active;
    }
}

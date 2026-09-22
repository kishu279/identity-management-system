// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IIssuerRegistry} from "./interfaces/IIssuerRegistry.sol";

/**
 * @title IssuerRegistry
 * @notice Manages trusted claim attesters and their authorized claim types using OpenZeppelin AccessControl.
 */
contract IssuerRegistry is AccessControl, IIssuerRegistry {
    bytes32 public constant ISSUER_MANAGER_ROLE = keccak256("ISSUER_MANAGER_ROLE");

    // Mapping: issuer => isTrusted
    mapping(address => bool) private _trustedIssuers;
    // Mapping: issuer => name/organization description
    mapping(address => string) private _issuerNames;
    // Mapping: issuer => claimType => isAuthorized
    mapping(address => mapping(bytes32 => bool)) private _authorizedClaimTypes;

    error ZeroAddress();
    error IssuerAlreadyExists(address issuer);
    error IssuerDoesNotExist(address issuer);
    error ClaimTypeAlreadyAuthorized(address issuer, bytes32 claimType);
    error ClaimTypeNotAuthorized(address issuer, bytes32 claimType);
    error EmptyName();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_MANAGER_ROLE, admin);
    }

    /**
     * @notice Registers a new trusted issuer.
     * @param issuer The address of the issuing entity.
     * @param name Descriptive name of the issuer.
     */
    function addIssuer(address issuer, string calldata name) external onlyRole(ISSUER_MANAGER_ROLE) {
        if (issuer == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyName();
        if (_trustedIssuers[issuer]) revert IssuerAlreadyExists(issuer);

        _trustedIssuers[issuer] = true;
        _issuerNames[issuer] = name;

        emit IssuerAdded(issuer, name, uint64(block.timestamp));
    }

    /**
     * @notice Removes a trusted issuer from the registry.
     * @param issuer The address of the issuing entity to remove.
     */
    function removeIssuer(address issuer) external onlyRole(ISSUER_MANAGER_ROLE) {
        if (!_trustedIssuers[issuer]) revert IssuerDoesNotExist(issuer);

        _trustedIssuers[issuer] = false;

        emit IssuerRemoved(issuer, uint64(block.timestamp));
    }

    /**
     * @notice Authorizes an issuer to attest to a specific claim type.
     * @param issuer The address of the issuing entity.
     * @param claimType keccak256 identifier for the claim category (e.g. KYC_VERIFIED).
     */
    function authorizeClaimType(address issuer, bytes32 claimType) external onlyRole(ISSUER_MANAGER_ROLE) {
        if (!_trustedIssuers[issuer]) revert IssuerDoesNotExist(issuer);
        if (_authorizedClaimTypes[issuer][claimType]) revert ClaimTypeAlreadyAuthorized(issuer, claimType);

        _authorizedClaimTypes[issuer][claimType] = true;

        emit ClaimTypeAuthorized(issuer, claimType, uint64(block.timestamp));
    }

    /**
     * @notice Revokes an issuer's permission for a specific claim type.
     * @param issuer The address of the issuing entity.
     * @param claimType keccak256 identifier for the claim category.
     */
    function revokeClaimType(address issuer, bytes32 claimType) external onlyRole(ISSUER_MANAGER_ROLE) {
        if (!_trustedIssuers[issuer]) revert IssuerDoesNotExist(issuer);
        if (!_authorizedClaimTypes[issuer][claimType]) revert ClaimTypeNotAuthorized(issuer, claimType);

        _authorizedClaimTypes[issuer][claimType] = false;

        emit ClaimTypeRevoked(issuer, claimType, uint64(block.timestamp));
    }

    /**
     * @notice Checks if an address is currently a trusted issuer.
     */
    function isTrustedIssuer(address issuer) external view returns (bool) {
        return _trustedIssuers[issuer];
    }

    /**
     * @notice Checks if an issuer is trusted AND authorized to issue a specific claim type.
     */
    function canIssueClaim(address issuer, bytes32 claimType) external view returns (bool) {
        return _trustedIssuers[issuer] && _authorizedClaimTypes[issuer][claimType];
    }

    /**
     * @notice Returns the registered name of an issuer.
     */
    function getIssuerName(address issuer) external view returns (string memory) {
        return _issuerNames[issuer];
    }
}

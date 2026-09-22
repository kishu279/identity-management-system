// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IIssuerRegistry} from "./interfaces/IIssuerRegistry.sol";
import {IIdentityRegistry} from "./interfaces/IIdentityRegistry.sol";
import {IClaimStore} from "./interfaces/IClaimStore.sol";

/**
 * @title ClaimStore
 * @notice Verifiable credential & attestation store with real-time verification and EIP-712 support.
 * Raw PII is never stored; only cryptographic claim hashes and metadata are anchored on-chain.
 */
contract ClaimStore is EIP712, IClaimStore {
    using ECDSA for bytes32;

    bytes32 public constant ISSUE_CLAIM_TYPEHASH = keccak256(
        "IssueClaim(address issuer,address subject,bytes32 claimType,bytes32 claimHash,uint64 expiresAt,uint256 nonce,uint256 deadline)"
    );

    IIssuerRegistry public immutable issuerRegistry;
    IIdentityRegistry public immutable identityRegistry;

    // subject => claimType => ClaimRecord
    mapping(address => mapping(bytes32 => ClaimRecord)) private _claims;

    // Issuer address => nonce for replay protection with EIP-712 signatures
    mapping(address => uint256) public issuerNonces;

    error ZeroAddress();
    error InvalidSubject();
    error InvalidClaimHash();
    error InvalidExpiry();
    error SubjectHasNoActiveIdentity(address subject);
    error UnauthorizedIssuer(address issuer, bytes32 claimType);
    error ClaimNotFound(address subject, bytes32 claimType);
    error ClaimAlreadyRevoked(address subject, bytes32 claimType);
    error UnauthorizedRevoker(address caller);
    error SignatureExpired();
    error InvalidSignature();

    constructor(
        address _issuerRegistry,
        address _identityRegistry
    ) EIP712("DecentralizedIdentityClaimStore", "1") {
        if (_issuerRegistry == address(0)) revert ZeroAddress();
        issuerRegistry = IIssuerRegistry(_issuerRegistry);
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    /**
     * @notice Issues an on-chain attestation for a subject.
     * @param subject The wallet address holding the identity.
     * @param claimType The keccak256 hash identifying the category of claim.
     * @param claimHash The salted hash of the underlying credential data (zero raw PII).
     * @param expiresAt Unix timestamp when the claim expires (0 for permanent).
     */
    function issueClaim(
        address subject,
        bytes32 claimType,
        bytes32 claimHash,
        uint64 expiresAt
    ) external {
        _issueClaimInternal(msg.sender, subject, claimType, claimHash, expiresAt);
    }

    /**
     * @notice Allows submitting an attestation signed off-chain by an authorized issuer via EIP-712.
     * @param issuer The address of the issuing authority who signed the claim.
     * @param subject The wallet address receiving the claim.
     * @param claimType Category of claim.
     * @param claimHash Salted hash of the credential attributes.
     * @param expiresAt Expiration timestamp.
     * @param deadline Unix timestamp after which the signature is invalid.
     * @param signature Cryptographic signature by the issuer.
     */
    function issueClaimWithSignature(
        address issuer,
        address subject,
        bytes32 claimType,
        bytes32 claimHash,
        uint64 expiresAt,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (issuer == address(0)) revert ZeroAddress();

        uint256 currentNonce = issuerNonces[issuer]++;

        bytes32 structHash = keccak256(
            abi.encode(
                ISSUE_CLAIM_TYPEHASH,
                issuer,
                subject,
                claimType,
                claimHash,
                expiresAt,
                currentNonce,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (signer != issuer) revert InvalidSignature();

        _issueClaimInternal(issuer, subject, claimType, claimHash, expiresAt);
    }

    /**
     * @notice Revokes a previously issued claim.
     * @dev Only the issuing entity or an authorized manager may revoke the claim.
     * @param subject Target identity owner.
     * @param claimType Claim category to revoke.
     */
    function revokeClaim(address subject, bytes32 claimType) external {
        ClaimRecord storage claim = _claims[subject][claimType];
        if (claim.issuer == address(0)) revert ClaimNotFound(subject, claimType);
        if (claim.revoked) revert ClaimAlreadyRevoked(subject, claimType);

        // Only original issuer or authorized manager
        if (msg.sender != claim.issuer && !issuerRegistry.canIssueClaim(msg.sender, claimType)) {
            revert UnauthorizedRevoker(msg.sender);
        }

        claim.revoked = true;

        emit ClaimRevoked(subject, claimType, msg.sender);
    }

    /**
     * @notice Real-time verification of a claim's validity.
     * @dev Checks existence, revocation, expiration, and issuer trustworthiness in real-time.
     * @param subject Target wallet address.
     * @param claimType Category of claim.
     */
    function verifyClaim(
        address subject,
        bytes32 claimType
    )
        public
        view
        returns (
            bool valid,
            address issuer,
            bytes32 claimHash,
            uint64 expiresAt
        )
    {
        ClaimRecord memory claim = _claims[subject][claimType];
        issuer = claim.issuer;
        claimHash = claim.claimHash;
        expiresAt = claim.expiresAt;

        if (issuer == address(0) || claim.revoked) {
            return (false, issuer, claimHash, expiresAt);
        }

        if (expiresAt != 0 && expiresAt <= block.timestamp) {
            return (false, issuer, claimHash, expiresAt);
        }

        // Issuer must still be trusted and authorized
        if (!issuerRegistry.canIssueClaim(issuer, claimType)) {
            return (false, issuer, claimHash, expiresAt);
        }

        return (true, issuer, claimHash, expiresAt);
    }

    /**
     * @notice Convenience boolean check for verifiers.
     */
    function isClaimValid(address subject, bytes32 claimType) external view returns (bool) {
        (bool valid, , , ) = verifyClaim(subject, claimType);
        return valid;
    }

    /**
     * @notice Retrieves raw claim record.
     */
    function getClaim(
        address subject,
        bytes32 claimType
    ) external view returns (ClaimRecord memory) {
        return _claims[subject][claimType];
    }

    /**
     * @notice Calculates the EIP-712 digest for an off-chain claim signature.
     */
    function getClaimDigest(
        address issuer,
        address subject,
        bytes32 claimType,
        bytes32 claimHash,
        uint64 expiresAt,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ISSUE_CLAIM_TYPEHASH,
                    issuer,
                    subject,
                    claimType,
                    claimHash,
                    expiresAt,
                    nonce,
                    deadline
                )
            )
        );
    }

    // --- Internal Helpers ---

    function _issueClaimInternal(
        address issuer,
        address subject,
        bytes32 claimType,
        bytes32 claimHash,
        uint64 expiresAt
    ) internal {
        if (subject == address(0)) revert InvalidSubject();
        if (claimHash == bytes32(0)) revert InvalidClaimHash();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry();

        // Verify issuer is authorized for this claim type
        if (!issuerRegistry.canIssueClaim(issuer, claimType)) {
            revert UnauthorizedIssuer(issuer, claimType);
        }

        // Check if identity registry is configured and requires active identity
        if (address(identityRegistry) != address(0)) {
            if (!identityRegistry.hasActiveIdentity(subject)) {
                revert SubjectHasNoActiveIdentity(subject);
            }
        }

        uint64 nowTs = uint64(block.timestamp);

        _claims[subject][claimType] = ClaimRecord({
            claimHash: claimHash,
            issuer: issuer,
            issuedAt: nowTs,
            expiresAt: expiresAt,
            revoked: false
        });

        emit ClaimIssued(subject, claimType, claimHash, issuer, expiresAt);
    }
}

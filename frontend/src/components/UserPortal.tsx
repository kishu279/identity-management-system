import React, { useState, useEffect } from 'react';
import { BrowserProvider, JsonRpcSigner, ethers } from 'ethers';
import {
  getContracts,
  CLAIM_TYPES,
  formatAddress,
  formatHash,
  formatTimestamp,
  parseContractError,
  hashString
} from '../utils/contracts';
import type { IdentityRecord, ClaimVerificationResult } from '../types';

interface UserPortalProps {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  account: string | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string, txHash?: string) => void;
  onIdentityChanged: () => void;
}

export const UserPortal: React.FC<UserPortalProps> = ({
  provider,
  signer,
  account,
  onShowToast,
  onIdentityChanged,
}) => {
  const [identity, setIdentity] = useState<IdentityRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Registration Form
  const [metadataURI, setMetadataURI] = useState('ipfs://bafkreiaegisidentitydocument2026');
  const [metadataHash, setMetadataHash] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Update Metadata Form
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newURI, setNewURI] = useState('');
  const [newHash, setNewHash] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Claims
  const [userClaims, setUserClaims] = useState<{
    [key: string]: ClaimVerificationResult & { label: string; description: string; rawClaim?: any };
  }>({});
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);

  useEffect(() => {
    if (metadataURI) {
      setMetadataHash(hashString(metadataURI));
    }
  }, [metadataURI]);

  useEffect(() => {
    if (provider && account) {
      loadUserIdentityAndClaims();
    } else {
      setIdentity(null);
      setUserClaims({});
    }
  }, [provider, account]);

  const loadUserIdentityAndClaims = async () => {
    if (!provider || !account) return;
    setIsLoading(true);
    try {
      const { identityRegistry, claimStore, issuerRegistry } = getContracts(provider);

      // Check if identity exists
      let idRecord: IdentityRecord | null = null;
      try {
        const res = await identityRegistry.getIdentity(account);
        idRecord = {
          exists: res.exists,
          owner: res.owner,
          createdAt: res.createdAt,
          updatedAt: res.updatedAt,
          metadataURI: res.metadataURI,
          metadataHash: res.metadataHash,
          active: res.active,
        };
        setIdentity(idRecord);
        onIdentityChanged();
      } catch (e) {
        setIdentity(null);
      }

      // Check user claims
      setIsLoadingClaims(true);
      const claimsMap: any = {};

      for (const [key, info] of Object.entries(CLAIM_TYPES)) {
        try {
          const [valid, issuer, claimHash, expiresAt] = await claimStore.verifyClaim(account, info.hash);
          let issuerName = '';
          if (issuer && issuer !== ethers.ZeroAddress) {
            try {
              issuerName = await issuerRegistry.getIssuerName(issuer);
            } catch (e) {
              // ignore
            }
          }

          let rawClaim = null;
          try {
            rawClaim = await claimStore.getClaim(account, info.hash);
          } catch (e) {}

          claimsMap[key] = {
            valid,
            issuer,
            issuerName,
            claimHash,
            expiresAt,
            label: info.label,
            description: info.description,
            rawClaim,
          };
        } catch (e) {
          // ignore
        }
      }

      setUserClaims(claimsMap);
    } catch (err) {
      console.error('Failed to load user info', err);
    } finally {
      setIsLoading(false);
      setIsLoadingClaims(false);
    }
  };

  const handleRegisterIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      onShowToast('error', 'Wallet Required', 'Please connect your Ethereum wallet to register.');
      return;
    }

    try {
      setIsRegistering(true);
      const { identityRegistry } = getContracts(signer);
      const tx = await identityRegistry.registerIdentity(metadataURI.trim(), metadataHash.trim());
      onShowToast('info', 'Transaction Submitted', 'Creating on-chain Self-Sovereign Identity...', tx.hash);
      await tx.wait();
      onShowToast('success', 'Identity Registered!', 'Your sovereign profile is now anchored on-chain.', tx.hash);
      await loadUserIdentityAndClaims();
    } catch (err: any) {
      onShowToast('error', 'Registration Failed', parseContractError(err));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleToggleActive = async (reactivate: boolean) => {
    if (!signer) return;
    try {
      const { identityRegistry } = getContracts(signer);
      const tx = reactivate
        ? await identityRegistry.reactivateIdentity()
        : await identityRegistry.deactivateIdentity();

      onShowToast('info', 'Transaction Submitted', 'Updating identity status...', tx.hash);
      await tx.wait();
      onShowToast('success', reactivate ? 'Identity Reactivated' : 'Identity Deactivated', '', tx.hash);
      await loadUserIdentityAndClaims();
    } catch (err: any) {
      onShowToast('error', 'Action Failed', parseContractError(err));
    }
  };

  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;
    try {
      setIsUpdating(true);
      const { identityRegistry } = getContracts(signer);
      const tx = await identityRegistry.updateMetadata(newURI.trim(), newHash.trim());
      onShowToast('info', 'Transaction Submitted', 'Updating metadata URI and hash...', tx.hash);
      await tx.wait();
      onShowToast('success', 'Metadata Updated', 'Identity pointers successfully updated.', tx.hash);
      setShowUpdateModal(false);
      await loadUserIdentityAndClaims();
    } catch (err: any) {
      onShowToast('error', 'Update Failed', parseContractError(err));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!account) {
    return (
      <div className="portal-container">
        <div className="connect-prompt-card">
          <div className="connect-icon">🔑</div>
          <h3>Connect Your Wallet</h3>
          <p>Please connect your Web3 wallet (e.g. MetaMask) to manage your decentralized identity and credentials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h2 className="portal-title">Sovereign Identity Profile</h2>
          <p className="portal-desc">
            Manage your on-chain identity root, off-chain DID document metadata, and review credentials issued to your wallet.
          </p>
        </div>

        <div className="identity-status-badge">
          {isLoading ? (
            <span className="badge badge-inactive">Loading Profile...</span>
          ) : identity ? (
            <span className={`badge ${identity.active ? 'badge-success' : 'badge-danger'}`}>
              {identity.active ? '● Identity Active' : '● Identity Deactivated'}
            </span>
          ) : (
            <span className="badge badge-warning">● No Registered Identity</span>
          )}
        </div>
      </div>

      {!identity ? (
        /* Registration Onboarding Form */
        <div className="card max-w-2xl mx-auto">
          <div className="card-header">
            <span className="card-icon">🆔</span>
            <div>
              <h3 className="card-title">Register Your Sovereign Identity</h3>
              <p className="card-subtitle">
                Establish an on-chain identity root. This is required before trusted issuers can anchor claims for your address.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegisterIdentity} className="form-stack">
            <div className="form-group">
              <label className="form-label">Wallet Address</label>
              <input type="text" className="input-text" value={account} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Off-Chain Metadata URI (IPFS / DID Document)</label>
              <input
                type="text"
                className="input-text"
                placeholder="ipfs://..."
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
                required
              />
              <span className="input-helper">Points to your decentralized DID document or encrypted profile.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Cryptographic Metadata Hash (Keccak256)</label>
              <input
                type="text"
                className="input-text"
                value={metadataHash}
                onChange={(e) => setMetadataHash(e.target.value)}
                required
              />
              <span className="input-helper">Tamper-proof integrity digest of your off-chain metadata.</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block mt-3"
              disabled={isRegistering}
            >
              {isRegistering ? 'Registering on Ethereum...' : 'Register Sovereign Identity'}
            </button>
          </form>
        </div>
      ) : (
        /* Registered Identity Details & Credentials */
        <div className="identity-layout">
          {/* Identity Card */}
          <div className="card identity-profile-card">
            <div className="card-header">
              <span className="card-icon">🪪</span>
              <div className="flex-1">
                <div className="flex-between">
                  <h3 className="card-title">Identity Profile</h3>
                  <span className={`badge ${identity.active ? 'badge-success' : 'badge-danger'}`}>
                    {identity.active ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <p className="card-subtitle">Registered on Ethereum Decentralized Identity Registry</p>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span className="detail-label">Identity Owner</span>
                <code className="detail-value">{formatAddress(identity.owner)}</code>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">Created At</span>
                <span className="detail-value">{formatTimestamp(identity.createdAt)}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">Last Updated</span>
                <span className="detail-value">{formatTimestamp(identity.updatedAt)}</span>
              </div>

              <div className="profile-detail-item col-span-2">
                <span className="detail-label">Metadata URI Pointer</span>
                <code className="detail-value break-all">{identity.metadataURI}</code>
              </div>

              <div className="profile-detail-item col-span-2">
                <span className="detail-label">Metadata Hash</span>
                <code className="detail-value break-all">{identity.metadataHash}</code>
              </div>
            </div>

            <div className="profile-actions-row">
              {identity.active ? (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleToggleActive(false)}
                >
                  Deactivate Identity
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleToggleActive(true)}
                >
                  Reactivate Identity
                </button>
              )}

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setNewURI(identity.metadataURI);
                  setNewHash(identity.metadataHash);
                  setShowUpdateModal(true);
                }}
              >
                Update Metadata
              </button>
            </div>
          </div>

          {/* Update Modal */}
          {showUpdateModal && (
            <div className="modal-overlay">
              <div className="modal-card">
                <h3>Update Identity Metadata</h3>
                <form onSubmit={handleUpdateMetadata} className="form-stack mt-4">
                  <div className="form-group">
                    <label className="form-label">New Metadata URI</label>
                    <input
                      type="text"
                      className="input-text"
                      value={newURI}
                      onChange={(e) => {
                        setNewURI(e.target.value);
                        setNewHash(hashString(e.target.value));
                      }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Metadata Hash</label>
                    <input
                      type="text"
                      className="input-text"
                      value={newHash}
                      onChange={(e) => setNewHash(e.target.value)}
                      required
                    />
                  </div>
                  <div className="btn-group mt-4">
                    <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                      {isUpdating ? 'Saving...' : 'Save Updates'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowUpdateModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* User's Credentials / Attestations */}
          <div className="mt-8">
            <div className="section-header">
              <h3 className="section-title">My Verifiable Credentials & Attestations</h3>
              <p className="section-subtitle">
                Cryptographic claims issued to your identity by recognized attestation authorities
                {isLoadingClaims && <span className="text-xs text-muted ml-2">(Checking on-chain...)</span>}
              </p>
            </div>

            <div className="credentials-grid">
              {Object.entries(CLAIM_TYPES).map(([key, info]) => {
                const claim = userClaims[key];
                const isValid = claim?.valid;
                const isRevoked = claim?.rawClaim?.revoked;
                const isExpired = claim?.expiresAt && Number(claim.expiresAt) !== 0 && Number(claim.expiresAt) <= Math.floor(Date.now() / 1000);
                const hasClaim = claim?.issuer && claim.issuer !== ethers.ZeroAddress;

                return (
                  <div key={key} className={`credential-card ${isValid ? 'verified' : 'unverified'}`}>
                    <div className="credential-top">
                      <div className="credential-icon">
                        {isValid ? '🛡️' : '📋'}
                      </div>
                      <div className="credential-status">
                        {isValid ? (
                          <span className="badge badge-success">✓ Verified & Valid</span>
                        ) : isRevoked ? (
                          <span className="badge badge-danger">✕ Revoked</span>
                        ) : isExpired ? (
                          <span className="badge badge-warning">⚠️ Expired</span>
                        ) : (
                          <span className="badge badge-inactive">Not Issued</span>
                        )}
                      </div>
                    </div>

                    <h4 className="credential-name">{info.label}</h4>
                    <p className="credential-desc">{info.description}</p>

                    {hasClaim ? (
                      <div className="credential-meta-box">
                        <div className="meta-line">
                          <span className="meta-label">Attester:</span>
                          <span className="meta-val font-semibold">
                            {claim.issuerName ? `${claim.issuerName} (${formatAddress(claim.issuer)})` : formatAddress(claim.issuer)}
                          </span>
                        </div>
                        <div className="meta-line">
                          <span className="meta-label">Expires:</span>
                          <span className="meta-val">{formatTimestamp(claim.expiresAt)}</span>
                        </div>
                        <div className="meta-line">
                          <span className="meta-label">Claim Hash:</span>
                          <code className="meta-val text-xs">{formatHash(claim.claimHash)}</code>
                        </div>
                      </div>
                    ) : (
                      <div className="credential-empty-box">
                        <span>No claim issued for this category yet.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

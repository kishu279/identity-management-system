import React, { useState } from 'react';
import { BrowserProvider, ethers } from 'ethers';
import {
  getContracts,
  CLAIM_TYPES,
  formatAddress,
  formatTimestamp,
  parseContractError
} from '../utils/contracts';

interface VerifierPortalProps {
  provider: BrowserProvider | null;
  account: string | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const VerifierPortal: React.FC<VerifierPortalProps> = ({
  provider,
  account,
  onShowToast,
}) => {
  const [subjectAddress, setSubjectAddress] = useState(account || '');
  const [selectedClaimType, setSelectedClaimType] = useState(CLAIM_TYPES.KYC_VERIFIED.hash);
  const [customClaimHash, setCustomClaimHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [result, setResult] = useState<{
    checked: boolean;
    valid: boolean;
    issuer: string;
    issuerName: string;
    isIssuerTrusted: boolean;
    claimHash: string;
    expiresAt: bigint;
    isRevoked: boolean;
    hasIdentity: boolean;
    identityActive: boolean;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) {
      onShowToast('error', 'Provider Required', 'Please connect your Web3 wallet or connect to network.');
      return;
    }
    if (!subjectAddress.trim()) {
      onShowToast('error', 'Missing Subject', 'Please provide a subject wallet address.');
      return;
    }

    const claimTypeToVerify = selectedClaimType === 'custom' ? customClaimHash.trim() : selectedClaimType;

    try {
      setIsVerifying(true);
      const { claimStore, issuerRegistry, identityRegistry } = getContracts(provider);
      const subject = subjectAddress.trim();

      // 1. Verify claim
      const [valid, issuer, claimHash, expiresAt] = await claimStore.verifyClaim(subject, claimTypeToVerify);

      // 2. Issuer details
      let issuerName = '';
      let isIssuerTrusted = false;
      if (issuer && issuer !== ethers.ZeroAddress) {
        try {
          isIssuerTrusted = await issuerRegistry.isTrustedIssuer(issuer);
          if (isIssuerTrusted) {
            issuerName = await issuerRegistry.getIssuerName(issuer);
          }
        } catch (e) {}
      }

      // 3. Raw claim record for revocation status
      let isRevoked = false;
      try {
        const raw = await claimStore.getClaim(subject, claimTypeToVerify);
        isRevoked = raw.revoked;
      } catch (e) {}

      // 4. Identity status
      let hasIdentity = false;
      let identityActive = false;
      try {
        const id = await identityRegistry.getIdentity(subject);
        hasIdentity = id.exists;
        identityActive = id.active;
      } catch (e) {}

      setResult({
        checked: true,
        valid,
        issuer,
        issuerName,
        isIssuerTrusted,
        claimHash,
        expiresAt,
        isRevoked,
        hasIdentity,
        identityActive,
      });

      if (valid) {
        onShowToast('success', 'Verification Succeeded', 'Claim is active, valid, and signed by a trusted issuer.');
      } else {
        onShowToast('info', 'Verification Result', 'Claim is invalid, missing, revoked, or expired.');
      }
    } catch (err: any) {
      onShowToast('error', 'Verification Failed', parseContractError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h2 className="portal-title">Real-Time Verifier & Claim Inspector</h2>
          <p className="portal-desc">
            Cryptographically verify on-chain attestations in real-time. Checks subject identity, issuer trust, signature status, and expiration.
          </p>
        </div>
      </div>

      <div className="card max-w-2xl mx-auto">
        <div className="card-header">
          <span className="card-icon">🔎</span>
          <div>
            <h3 className="card-title">Verify Any Subject Attestation</h3>
            <p className="card-subtitle">Zero-knowledge proof verification without exposing raw personal data</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="form-stack">
          <div className="form-group">
            <div className="flex-between">
              <label className="form-label">Subject Address to Verify</label>
              {account && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setSubjectAddress(account)}
                >
                  Use Connected Account
                </button>
              )}
            </div>
            <input
              type="text"
              className="input-text"
              placeholder="0x..."
              value={subjectAddress}
              onChange={(e) => setSubjectAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Claim Type to Verify</label>
            <select
              className="input-select"
              value={selectedClaimType}
              onChange={(e) => setSelectedClaimType(e.target.value)}
            >
              <option value={CLAIM_TYPES.KYC_VERIFIED.hash}>
                KYC_VERIFIED (Identity & AML Accreditation)
              </option>
              <option value={CLAIM_TYPES.OVER_18.hash}>
                OVER_18 (Age Verification)
              </option>
              <option value={CLAIM_TYPES.RESIDENCY_ACCREDITED.hash}>
                RESIDENCY_ACCREDITED (Jurisdiction)
              </option>
              <option value="custom">Custom Claim Type Hash</option>
            </select>
          </div>

          {selectedClaimType === 'custom' && (
            <div className="form-group">
              <label className="form-label">Custom Claim Type Hash</label>
              <input
                type="text"
                className="input-text"
                placeholder="0x..."
                value={customClaimHash}
                onChange={(e) => setCustomClaimHash(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block mt-3"
            disabled={isVerifying}
          >
            {isVerifying ? 'Performing On-Chain Verification...' : 'Verify Claim On-Chain'}
          </button>
        </form>

        {result && (
          <div className="verification-result-container mt-6">
            <div className={`result-hero-badge ${result.valid ? 'valid' : 'invalid'}`}>
              <div className="hero-badge-icon">
                {result.valid ? '✅' : '❌'}
              </div>
              <div className="hero-badge-text">
                <h4>{result.valid ? 'VALID & VERIFIED CLAIM' : 'INVALID OR UNVERIFIED'}</h4>
                <p>
                  {result.valid
                    ? 'The attestation exists, is currently valid, unexpired, and attested by an authorized trusted issuer.'
                    : result.isRevoked
                    ? 'Claim has been explicitly revoked by the issuing authority.'
                    : result.issuer === ethers.ZeroAddress
                    ? 'No claim of this type has been issued for this address.'
                    : !result.isIssuerTrusted
                    ? 'Issuing authority is no longer trusted or has been revoked by admin.'
                    : 'Claim does not meet active verification criteria.'}
                </p>
              </div>
            </div>

            <div className="result-breakdown-card mt-4">
              <h5 className="breakdown-title">Cryptographic Audit Trail</h5>
              
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <span className="b-label">Subject Identity Registered:</span>
                  <span className={`badge ${result.hasIdentity ? 'badge-success' : 'badge-danger'}`}>
                    {result.hasIdentity ? (result.identityActive ? 'Active Identity' : 'Deactivated Identity') : 'No Identity Record'}
                  </span>
                </div>

                <div className="breakdown-item">
                  <span className="b-label">Issuer Authority:</span>
                  <span className="b-val font-semibold">
                    {result.issuer !== ethers.ZeroAddress ? (
                      result.issuerName ? `${result.issuerName} (${formatAddress(result.issuer)})` : formatAddress(result.issuer)
                    ) : (
                      'None'
                    )}
                  </span>
                </div>

                <div className="breakdown-item">
                  <span className="b-label">Issuer Trust Status:</span>
                  <span className={`badge ${result.isIssuerTrusted ? 'badge-success' : 'badge-inactive'}`}>
                    {result.isIssuerTrusted ? 'Trusted Authority' : 'Untrusted / Inactive'}
                  </span>
                </div>

                <div className="breakdown-item">
                  <span className="b-label">Expiration Status:</span>
                  <span className="b-val">
                    {result.issuer !== ethers.ZeroAddress ? formatTimestamp(result.expiresAt) : 'N/A'}
                  </span>
                </div>

                <div className="breakdown-item col-span-2">
                  <span className="b-label">Salted Credential Hash:</span>
                  <code className="b-val break-all text-xs">
                    {result.claimHash !== ethers.ZeroHash ? result.claimHash : '0x0000...'}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

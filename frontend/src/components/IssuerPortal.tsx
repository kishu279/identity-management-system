import React, { useState, useEffect } from 'react';
import { BrowserProvider, JsonRpcSigner, ethers } from 'ethers';
import { getContracts, CLAIM_TYPES, parseContractError } from '../utils/contracts';

interface IssuerPortalProps {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  account: string | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string, txHash?: string) => void;
}

export const IssuerPortal: React.FC<IssuerPortalProps> = ({
  provider,
  signer,
  account,
  onShowToast,
}) => {
  // Issuer identity state
  const [isTrusted, setIsTrusted] = useState<boolean | null>(null);
  const [issuerName, setIssuerName] = useState<string>('');
  const [canKYC, setCanKYC] = useState(false);
  const [canOver18, setCanOver18] = useState(false);
  const [canResidency, setCanResidency] = useState(false);

  // Issue Form State
  const [subjectAddress, setSubjectAddress] = useState('');
  const [selectedClaimType, setSelectedClaimType] = useState(CLAIM_TYPES.KYC_VERIFIED.hash);
  const [durationPreset, setDurationPreset] = useState<'30d' | '1y' | '3y' | 'never'>('1y');

  // Simulated PII Builder
  const [fullName, setFullName] = useState('Alice Doe');
  const [docNumber, setDocNumber] = useState('PASSPORT-982341');
  const [countryCode, setCountryCode] = useState('US');
  const [salt, setSalt] = useState('4829104');
  const [computedHash, setComputedHash] = useState('');

  const [useCustomHash, setUseCustomHash] = useState(false);
  const [customClaimHash, setCustomClaimHash] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);

  // Revoke Form State
  const [revokeSubject, setRevokeSubject] = useState('');
  const [revokeClaimType, setRevokeClaimType] = useState(CLAIM_TYPES.KYC_VERIFIED.hash);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (provider && account) {
      checkIssuerStatus();
    } else {
      setIsTrusted(null);
      setIssuerName('');
    }
  }, [provider, account]);

  useEffect(() => {
    // Automatically recompute salted credential hash
    try {
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encoded = abiCoder.encode(
        ['string', 'string', 'string', 'uint256'],
        [fullName, docNumber, countryCode, BigInt(salt || '1')]
      );
      const hash = ethers.keccak256(encoded);
      setComputedHash(hash);
    } catch (e) {
      setComputedHash(ethers.keccak256(ethers.toUtf8Bytes(fullName + docNumber + countryCode + salt)));
    }
  }, [fullName, docNumber, countryCode, salt]);

  const checkIssuerStatus = async () => {
    if (!provider || !account) return;
    try {
      const { issuerRegistry } = getContracts(provider);
      const trusted = await issuerRegistry.isTrustedIssuer(account);
      setIsTrusted(trusted);
      if (trusted) {
        const name = await issuerRegistry.getIssuerName(account);
        setIssuerName(name);
        setCanKYC(await issuerRegistry.canIssueClaim(account, CLAIM_TYPES.KYC_VERIFIED.hash));
        setCanOver18(await issuerRegistry.canIssueClaim(account, CLAIM_TYPES.OVER_18.hash));
        setCanResidency(await issuerRegistry.canIssueClaim(account, CLAIM_TYPES.RESIDENCY_ACCREDITED.hash));
      }
    } catch (err) {
      console.error('Failed to load issuer status', err);
    }
  };

  const calculateExpiry = (): number => {
    const now = Math.floor(Date.now() / 1000);
    switch (durationPreset) {
      case '30d':
        return now + 30 * 24 * 3600;
      case '1y':
        return now + 365 * 24 * 3600;
      case '3y':
        return now + 3 * 365 * 24 * 3600;
      case 'never':
      default:
        return 0;
    }
  };

  const handleIssueClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      onShowToast('error', 'Wallet Not Connected', 'Please connect your authorized issuer wallet.');
      return;
    }
    if (!subjectAddress.trim()) {
      onShowToast('error', 'Missing Subject', 'Please provide the recipient user address.');
      return;
    }

    const finalHash = useCustomHash ? customClaimHash.trim() : computedHash;
    if (!finalHash || finalHash.length !== 66) {
      onShowToast('error', 'Invalid Hash', 'Claim hash must be a valid 32-byte hexadecimal string (0x...).');
      return;
    }

    const expiresAt = calculateExpiry();

    try {
      setIsIssuing(true);
      const { claimStore, issuerRegistry, identityRegistry } = getContracts(signer);
      const subject = subjectAddress.trim();
      const currentSigner = await signer.getAddress();

      // Pre-flight 1: Check issuer authorization
      const canIssue = await issuerRegistry.canIssueClaim(currentSigner, selectedClaimType);
      if (!canIssue) {
        onShowToast(
          'error',
          'Unauthorized Issuer Wallet',
          `Your connected wallet (${currentSigner.substring(0, 6)}...) is not authorized to issue this claim type. Authorize it in the Admin tab first.`
        );
        setIsIssuing(false);
        return;
      }

      // Pre-flight 2: Check subject identity status
      const hasActiveId = await identityRegistry.hasActiveIdentity(subject);
      if (!hasActiveId) {
        onShowToast(
          'error',
          'Recipient Has No Registered Identity',
          `Recipient wallet (${subject.substring(0, 6)}...) must first register on the "Identity Holder" tab before receiving claims.`
        );
        setIsIssuing(false);
        return;
      }

      const tx = await claimStore.issueClaim(
        subject,
        selectedClaimType,
        finalHash,
        expiresAt
      );

      onShowToast('info', 'Transaction Submitted', 'Issuing on-chain verifiable attestation...', tx.hash);
      await tx.wait();
      onShowToast('success', 'Attestation Issued!', `Claim anchored for ${subject.substring(0, 8)}...`, tx.hash);
    } catch (err: any) {
      onShowToast('error', 'Issuance Failed', parseContractError(err));
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRevokeClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      onShowToast('error', 'Wallet Not Connected', 'Please connect your issuer wallet.');
      return;
    }
    if (!revokeSubject.trim()) {
      onShowToast('error', 'Missing Address', 'Please provide the subject address to revoke.');
      return;
    }

    try {
      setIsRevoking(true);
      const { claimStore } = getContracts(signer);
      const tx = await claimStore.revokeClaim(revokeSubject.trim(), revokeClaimType);

      onShowToast('info', 'Transaction Submitted', 'Revoking attestation in ClaimStore...', tx.hash);
      await tx.wait();
      onShowToast('success', 'Claim Revoked!', `Credential has been revoked in real-time.`, tx.hash);
      setRevokeSubject('');
    } catch (err: any) {
      onShowToast('error', 'Revocation Failed', parseContractError(err));
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h2 className="portal-title">Attestation & Issuer Authority Portal</h2>
          <p className="portal-desc">
            Authorized institutions issue verifiable, privacy-preserving credential claims and manage lifecycle revocations.
          </p>
        </div>

        <div className="issuer-status-badge">
          {isTrusted === null ? (
            <span className="badge badge-inactive">Status: Checking...</span>
          ) : isTrusted ? (
            <div className="trusted-indicator">
              <span className="badge badge-success">✓ Authorized Authority</span>
              <span className="issuer-org-name">{issuerName || 'Verified Attester'}</span>
            </div>
          ) : (
            <span className="badge badge-warning">⚠️ Connected Account Not Registered as Issuer</span>
          )}
        </div>
      </div>

      {isTrusted && (
        <div className="permissions-bar">
          <span className="perm-label">Your Active Issuance Permissions:</span>
          <span className={`badge ${canKYC ? 'badge-success' : 'badge-inactive'}`}>
            {canKYC ? '✓ KYC_VERIFIED' : '✕ KYC_VERIFIED'}
          </span>
          <span className={`badge ${canOver18 ? 'badge-success' : 'badge-inactive'}`}>
            {canOver18 ? '✓ OVER_18' : '✕ OVER_18'}
          </span>
          <span className={`badge ${canResidency ? 'badge-success' : 'badge-inactive'}`}>
            {canResidency ? '✓ RESIDENCY_ACCREDITED' : '✕ RESIDENCY_ACCREDITED'}
          </span>
        </div>
      )}

      <div className="portal-grid">
        {/* Card 1: Issue Attestation */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🔏</span>
            <div>
              <h3 className="card-title">Issue Verifiable Attestation</h3>
              <p className="card-subtitle">Anchor cryptographic credential commitment onto Ethereum</p>
            </div>
          </div>

          <form onSubmit={handleIssueClaim} className="form-stack">
            <div className="form-group">
              <label className="form-label">Subject Wallet Address (Recipient User)</label>
              <input
                type="text"
                className="input-text"
                placeholder="0x... (User must hold active registered identity)"
                value={subjectAddress}
                onChange={(e) => setSubjectAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Claim Type</label>
              <select
                className="input-select"
                value={selectedClaimType}
                onChange={(e) => setSelectedClaimType(e.target.value)}
              >
                <option value={CLAIM_TYPES.KYC_VERIFIED.hash}>
                  KYC_VERIFIED — Full Identity & AML Accreditation
                </option>
                <option value={CLAIM_TYPES.OVER_18.hash}>
                  OVER_18 — Proof of Legal Adult Age
                </option>
                <option value={CLAIM_TYPES.RESIDENCY_ACCREDITED.hash}>
                  RESIDENCY_ACCREDITED — Verified Jurisdiction
                </option>
              </select>
            </div>

            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">Credential Payload (Zero Raw PII on-chain)</label>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setUseCustomHash(!useCustomHash)}
                >
                  {useCustomHash ? 'Switch to PII Form Hashing' : 'Enter Custom Hash'}
                </button>
              </div>

              {!useCustomHash ? (
                <div className="pii-box">
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-sublabel">Full Legal Name</label>
                      <input
                        type="text"
                        className="input-text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-sublabel">Document Serial / ID</label>
                      <input
                        type="text"
                        className="input-text"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row mt-2">
                    <div className="form-group flex-1">
                      <label className="form-sublabel">Country ISO</label>
                      <input
                        type="text"
                        className="input-text"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-sublabel">Private Blinding Salt</label>
                      <input
                        type="text"
                        className="input-text"
                        value={salt}
                        onChange={(e) => setSalt(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="hash-preview-row mt-3">
                    <span className="hash-label">Salted Keccak256 Hash stored on-chain:</span>
                    <code className="hash-code">{computedHash}</code>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  className="input-text"
                  placeholder="0x... (32-byte cryptographic hash)"
                  value={customClaimHash}
                  onChange={(e) => setCustomClaimHash(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Expiration Validity</label>
              <div className="preset-buttons">
                <button
                  type="button"
                  className={`btn-preset ${durationPreset === '30d' ? 'active' : ''}`}
                  onClick={() => setDurationPreset('30d')}
                >
                  30 Days
                </button>
                <button
                  type="button"
                  className={`btn-preset ${durationPreset === '1y' ? 'active' : ''}`}
                  onClick={() => setDurationPreset('1y')}
                >
                  1 Year
                </button>
                <button
                  type="button"
                  className={`btn-preset ${durationPreset === '3y' ? 'active' : ''}`}
                  onClick={() => setDurationPreset('3y')}
                >
                  3 Years
                </button>
                <button
                  type="button"
                  className={`btn-preset ${durationPreset === 'never' ? 'active' : ''}`}
                  onClick={() => setDurationPreset('never')}
                >
                  Permanent
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block mt-3"
              disabled={isIssuing || !account}
            >
              {isIssuing ? 'Issuing Attestation...' : 'Issue On-Chain Attestation'}
            </button>
          </form>
        </div>

        {/* Card 2: Revoke Attestation */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🚫</span>
            <div>
              <h3 className="card-title">Revoke Credential Attestation</h3>
              <p className="card-subtitle">Immediately invalidate compliance claims in real-time</p>
            </div>
          </div>

          <form onSubmit={handleRevokeClaim} className="form-stack">
            <div className="form-group">
              <label className="form-label">Subject Wallet Address</label>
              <input
                type="text"
                className="input-text"
                placeholder="0x..."
                value={revokeSubject}
                onChange={(e) => setRevokeSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Claim Type to Revoke</label>
              <select
                className="input-select"
                value={revokeClaimType}
                onChange={(e) => setRevokeClaimType(e.target.value)}
              >
                <option value={CLAIM_TYPES.KYC_VERIFIED.hash}>
                  KYC_VERIFIED
                </option>
                <option value={CLAIM_TYPES.OVER_18.hash}>
                  OVER_18
                </option>
                <option value={CLAIM_TYPES.RESIDENCY_ACCREDITED.hash}>
                  RESIDENCY_ACCREDITED
                </option>
              </select>
            </div>

            <div className="alert-warning">
              <span className="alert-icon">⚠️</span>
              <p className="alert-text">
                Revocation takes effect instantly across all integrated smart contracts, blocking any reliant DApps or DeFi pools immediately.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-danger btn-block mt-4"
              disabled={isRevoking || !account}
            >
              {isRevoking ? 'Revoking On-Chain...' : 'Revoke Credential Claim'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

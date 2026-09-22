import React, { useState, useEffect } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { getContracts, CLAIM_TYPES, CONTRACT_ADDRESSES, parseContractError } from '../utils/contracts';

interface AdminPortalProps {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  account: string | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string, txHash?: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  provider,
  signer,
  account,
  onShowToast,
}) => {
  // Form states
  const [newIssuerAddress, setNewIssuerAddress] = useState('');
  const [newIssuerName, setNewIssuerName] = useState('');
  const [isSubmittingIssuer, setIsSubmittingIssuer] = useState(false);

  const [permIssuerAddress, setPermIssuerAddress] = useState('');
  const [permClaimType, setPermClaimType] = useState(CLAIM_TYPES.KYC_VERIFIED.hash);
  const [customClaimHash, setCustomClaimHash] = useState('');
  const [isSubmittingPerm, setIsSubmittingPerm] = useState(false);

  // Inspector state
  const [inspectAddress, setInspectAddress] = useState('');
  const [inspectResult, setInspectResult] = useState<{
    searched: boolean;
    trusted: boolean;
    name: string;
    canIssueKYC: boolean;
    canIssueOver18: boolean;
    canIssueResidency: boolean;
  } | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // System stats
  const [totalIdentities, setTotalIdentities] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (provider) {
      loadStats();
    }
    if (provider && account) {
      checkAdminRole();
    } else {
      setIsAdmin(null);
    }
  }, [provider, account]);

  const checkAdminRole = async () => {
    if (!provider || !account) return;
    try {
      const { issuerRegistry } = getContracts(provider);
      const managerRole = await issuerRegistry.ISSUER_MANAGER_ROLE();
      const hasManager = await issuerRegistry.hasRole(managerRole, account);
      setIsAdmin(hasManager);
    } catch (e) {
      setIsAdmin(false);
    }
  };

  const loadStats = async () => {
    if (!provider) return;
    try {
      const { identityRegistry } = getContracts(provider);
      const count = await identityRegistry.totalIdentities();
      setTotalIdentities(Number(count));
    } catch (err) {
      console.error('Failed to load system stats', err);
    }
  };

  const handleAddIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      onShowToast('error', 'Wallet Not Connected', 'Please connect your admin wallet.');
      return;
    }
    if (isAdmin === false) {
      onShowToast(
        'error',
        'Unauthorized Account',
        'Connected wallet does not have Admin rights. Please switch to Account #0 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) in MetaMask.'
      );
      return;
    }
    if (!newIssuerAddress || !newIssuerName) {
      onShowToast('error', 'Missing Information', 'Please provide an issuer address and organization name.');
      return;
    }

    try {
      setIsSubmittingIssuer(true);
      const { issuerRegistry } = getContracts(signer);
      const tx = await issuerRegistry.addIssuer(newIssuerAddress.trim(), newIssuerName.trim());
      onShowToast('info', 'Transaction Submitted', 'Onboarding issuer into registry...', tx.hash);
      await tx.wait();
      onShowToast('success', 'Issuer Added!', `${newIssuerName} is now a trusted attester.`, tx.hash);
      setNewIssuerAddress('');
      setNewIssuerName('');
    } catch (err: any) {
      onShowToast('error', 'Failed to Add Issuer', parseContractError(err));
    } finally {
      setIsSubmittingIssuer(false);
    }
  };

  const handleClaimPermission = async (authorize: boolean) => {
    if (!signer) {
      onShowToast('error', 'Wallet Not Connected', 'Please connect your admin wallet.');
      return;
    }
    if (!permIssuerAddress) {
      onShowToast('error', 'Missing Address', 'Please provide an issuer address.');
      return;
    }

    const selectedType = permClaimType === 'custom' ? customClaimHash.trim() : permClaimType;
    if (!selectedType) {
      onShowToast('error', 'Missing Claim Type', 'Please specify a claim type hash.');
      return;
    }

    try {
      setIsSubmittingPerm(true);
      const { issuerRegistry } = getContracts(signer);
      const tx = authorize
        ? await issuerRegistry.authorizeClaimType(permIssuerAddress.trim(), selectedType)
        : await issuerRegistry.revokeClaimType(permIssuerAddress.trim(), selectedType);

      onShowToast('info', 'Transaction Submitted', 'Updating claim type permissions...', tx.hash);
      await tx.wait();
      onShowToast(
        'success',
        authorize ? 'Claim Type Authorized!' : 'Claim Type Revoked!',
        `Updated permissions for ${permIssuerAddress.substring(0, 8)}...`,
        tx.hash
      );
    } catch (err: any) {
      onShowToast('error', 'Permission Update Failed', parseContractError(err));
    } finally {
      setIsSubmittingPerm(false);
    }
  };

  const handleInspectIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !inspectAddress.trim()) return;

    try {
      setIsInspecting(true);
      const { issuerRegistry } = getContracts(provider);
      const target = inspectAddress.trim();

      const trusted = await issuerRegistry.isTrustedIssuer(target);
      const name = trusted ? await issuerRegistry.getIssuerName(target) : '';
      const canIssueKYC = await issuerRegistry.canIssueClaim(target, CLAIM_TYPES.KYC_VERIFIED.hash);
      const canIssueOver18 = await issuerRegistry.canIssueClaim(target, CLAIM_TYPES.OVER_18.hash);
      const canIssueResidency = await issuerRegistry.canIssueClaim(target, CLAIM_TYPES.RESIDENCY_ACCREDITED.hash);

      setInspectResult({
        searched: true,
        trusted,
        name,
        canIssueKYC,
        canIssueOver18,
        canIssueResidency,
      });
    } catch (err: any) {
      onShowToast('error', 'Lookup Failed', parseContractError(err));
    } finally {
      setIsInspecting(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h2 className="portal-title">System Administration</h2>
          <p className="portal-desc">
            Govern trusted authority issuers, grant cryptographic claim-type issuance privileges, and monitor registry health.
          </p>
        </div>
        <div className="stats-pill">
          <span className="stats-label">Total Registered Identities:</span>
          <span className="stats-value">{totalIdentities !== null ? totalIdentities : '...'}</span>
        </div>
      </div>

      <div className="contracts-summary-card">
        <div className="contract-entry">
          <span className="contract-label">IssuerRegistry:</span>
          <code className="contract-code">{CONTRACT_ADDRESSES.IssuerRegistry}</code>
        </div>
        <div className="contract-entry">
          <span className="contract-label">ClaimStore:</span>
          <code className="contract-code">{CONTRACT_ADDRESSES.ClaimStore}</code>
        </div>
        <div className="contract-entry">
          <span className="contract-label">IdentityRegistry:</span>
          <code className="contract-code">{CONTRACT_ADDRESSES.IdentityRegistry}</code>
        </div>
      </div>

      {account && isAdmin === false && (
        <div className="simulation-note note-warning">
          <span className="note-icon">⚠️</span>
          <div>
            <strong>Connected Wallet is NOT the Admin:</strong>
            <p className="mt-2">
              Your connected account <code>{account}</code> does not hold the <code>ISSUER_MANAGER_ROLE</code>.
              Only the deployer account (<strong><code>0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</code></strong> / Account #0) is authorized to onboard issuers.
              Please switch to <strong>Account #0</strong> in MetaMask.
            </p>
          </div>
        </div>
      )}

      {account && isAdmin === true && (
        <div className="simulation-note note-success">
          <span className="note-icon">✓</span>
          <div>
            <strong>Admin Verified:</strong>
            <p>You are connected with the authorized Admin wallet. You can onboard issuers and configure permissions.</p>
          </div>
        </div>
      )}

      <div className="portal-grid">
        {/* Card 1: Add Issuer */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">➕</span>
            <div>
              <h3 className="card-title">Onboard Trusted Attester</h3>
              <p className="card-subtitle">Register a recognized verification authority or KYC institution</p>
            </div>
          </div>
          <form onSubmit={handleAddIssuer} className="form-stack">
            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">Issuer Wallet Address</label>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setNewIssuerAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
                    setNewIssuerName('Global KYC Authority');
                  }}
                >
                  Auto-fill Account #1
                </button>
              </div>
              <input
                type="text"
                className="input-text"
                placeholder="0x..."
                value={newIssuerAddress}
                onChange={(e) => setNewIssuerAddress(e.target.value)}
                required
              />
              <span className="input-helper">The Ethereum address of the attestation authority.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Organization / Authority Name</label>
              <input
                type="text"
                className="input-text"
                placeholder="e.g. IdentityPass Global / ACME Certs"
                value={newIssuerName}
                onChange={(e) => setNewIssuerName(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isSubmittingIssuer || !account || isAdmin === false}
            >
              {isSubmittingIssuer ? 'Submitting Transaction...' : 'Add Trusted Issuer'}
            </button>
          </form>
        </div>

        {/* Card 2: Manage Permissions */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🔐</span>
            <div>
              <h3 className="card-title">Manage Claim Permissions</h3>
              <p className="card-subtitle">Authorize or revoke specific credential types for an issuer</p>
            </div>
          </div>
          <div className="form-stack">
            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">Target Issuer Address</label>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setPermIssuerAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')}
                >
                  Auto-fill Account #1
                </button>
              </div>
              <input
                type="text"
                className="input-text"
                placeholder="0x..."
                value={permIssuerAddress}
                onChange={(e) => setPermIssuerAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Claim Type</label>
              <select
                className="input-select"
                value={permClaimType}
                onChange={(e) => setPermClaimType(e.target.value)}
              >
                <option value={CLAIM_TYPES.KYC_VERIFIED.hash}>
                  KYC_VERIFIED (Identity & AML)
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

            {permClaimType === 'custom' && (
              <div className="form-group">
                <label className="form-label">Custom Keccak256 Claim Type Hash</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="0x..."
                  value={customClaimHash}
                  onChange={(e) => setCustomClaimHash(e.target.value)}
                />
              </div>
            )}

            <div className="btn-group">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleClaimPermission(true)}
                disabled={isSubmittingPerm || !account || isAdmin === false}
              >
                Authorize Type
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleClaimPermission(false)}
                disabled={isSubmittingPerm || !account || isAdmin === false}
              >
                Revoke Type
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Issuer Status Inspector */}
      <div className="card mt-6">
        <div className="card-header">
          <span className="card-icon">🔎</span>
          <div>
            <h3 className="card-title">Inspect Issuer Status</h3>
            <p className="card-subtitle">Query on-chain trustworthiness and authorization status for any address</p>
          </div>
        </div>

        <form onSubmit={handleInspectIssuer} className="form-inline">
          <input
            type="text"
            className="input-text flex-1"
            placeholder="Enter issuer address to inspect (0x...)"
            value={inspectAddress}
            onChange={(e) => setInspectAddress(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-secondary" disabled={isInspecting}>
            {isInspecting ? 'Querying...' : 'Inspect Address'}
          </button>
        </form>

        {inspectResult && (
          <div className="inspect-result-box mt-4">
            <div className="result-row">
              <span className="result-label">Status:</span>
              <span className={`badge ${inspectResult.trusted ? 'badge-success' : 'badge-danger'}`}>
                {inspectResult.trusted ? '✓ Trusted Authority' : '✕ Not Registered or Inactive'}
              </span>
            </div>
            {inspectResult.trusted && (
              <>
                <div className="result-row">
                  <span className="result-label">Name:</span>
                  <span className="result-value font-bold">{inspectResult.name}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Authorized Permissions:</span>
                  <div className="badge-list">
                    <span className={`badge ${inspectResult.canIssueKYC ? 'badge-success' : 'badge-inactive'}`}>
                      {inspectResult.canIssueKYC ? '✓ KYC_VERIFIED' : '– KYC_VERIFIED'}
                    </span>
                    <span className={`badge ${inspectResult.canIssueOver18 ? 'badge-success' : 'badge-inactive'}`}>
                      {inspectResult.canIssueOver18 ? '✓ OVER_18' : '– OVER_18'}
                    </span>
                    <span className={`badge ${inspectResult.canIssueResidency ? 'badge-success' : 'badge-inactive'}`}>
                      {inspectResult.canIssueResidency ? '✓ RESIDENCY_ACCREDITED' : '– RESIDENCY_ACCREDITED'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

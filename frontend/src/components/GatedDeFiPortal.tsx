import React, { useState, useEffect } from 'react';
import { BrowserProvider, JsonRpcSigner, ethers } from 'ethers';
import {
  getContracts,
  CLAIM_TYPES,
  CONTRACT_ADDRESSES,
  parseContractError
} from '../utils/contracts';

interface GatedDeFiPortalProps {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  account: string | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, desc?: string, txHash?: string) => void;
}

export const GatedDeFiPortal: React.FC<GatedDeFiPortalProps> = ({
  provider,
  signer,
  account,
  onShowToast,
}) => {
  const [userPoolBalance, setUserPoolBalance] = useState<string>('0.0');
  const [isKYCValid, setIsKYCValid] = useState<boolean | null>(null);
  const [depositAmount, setDepositAmount] = useState('0.05');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (provider && account) {
      loadDeFiState();
    } else {
      setUserPoolBalance('0.0');
      setIsKYCValid(null);
    }
  }, [provider, account]);

  const loadDeFiState = async () => {
    if (!provider || !account) return;
    try {
      const { gatedDeFi, claimStore } = getContracts(provider);

      // Check KYC status
      const [valid] = await claimStore.verifyClaim(account, CLAIM_TYPES.KYC_VERIFIED.hash);
      setIsKYCValid(valid);

      // Check pool balance
      const bal = await gatedDeFi.userBalances(account);
      setUserPoolBalance(ethers.formatEther(bal));
    } catch (err) {
      console.error('Failed to load DeFi state', err);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      onShowToast('error', 'Wallet Not Connected', 'Please connect your wallet.');
      return;
    }

    try {
      setIsDepositing(true);
      const { gatedDeFi } = getContracts(signer);
      const value = ethers.parseEther(depositAmount.trim() || '0.01');

      const tx = await gatedDeFi.deposit({ value });
      onShowToast('info', 'Transaction Submitted', 'Submitting deposit with real-time KYC check...', tx.hash);
      await tx.wait();
      onShowToast('success', 'Deposit Accepted!', `Successfully deposited ${depositAmount} ETH into compliant pool.`, tx.hash);
      await loadDeFiState();
    } catch (err: any) {
      const parsed = parseContractError(err);
      if (parsed.includes('IdentityVerificationFailed')) {
        onShowToast(
          'error',
          'Access Denied by Protocol',
          'REVERT: GatedDeFiService rejected deposit because your wallet has no valid KYC_VERIFIED credential.'
        );
      } else {
        onShowToast('error', 'Deposit Failed', parsed);
      }
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) return;

    try {
      setIsWithdrawing(true);
      const { gatedDeFi } = getContracts(signer);
      const amount = ethers.parseEther(withdrawAmount.trim() || userPoolBalance);

      const tx = await gatedDeFi.withdraw(amount);
      onShowToast('info', 'Transaction Submitted', 'Withdrawing funds...', tx.hash);
      await tx.wait();
      onShowToast('success', 'Withdrawal Complete', 'Funds returned to your wallet.', tx.hash);
      setWithdrawAmount('');
      await loadDeFiState();
    } catch (err: any) {
      onShowToast('error', 'Withdrawal Failed', parseContractError(err));
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h2 className="portal-title">Gated DeFi Protocol (Consumer DApp Demo)</h2>
          <p className="portal-desc">
            Demonstrates real-time composability. This liquidity protocol queries <code>ClaimStore.isClaimValid(msg.sender, KYC_VERIFIED)</code> on every deposit.
          </p>
        </div>
      </div>

      <div className="gated-hero-card">
        <div className="gated-status-row">
          <div className="status-item">
            <span className="status-label">Your KYC Compliance Status:</span>
            {isKYCValid === null ? (
              <span className="badge badge-inactive">Checking...</span>
            ) : isKYCValid ? (
              <span className="badge badge-success">✓ KYC Cleared (Eligible)</span>
            ) : (
              <span className="badge badge-danger">✕ Unverified (Ineligible)</span>
            )}
          </div>

          <div className="status-item">
            <span className="status-label">Your Deposited Pool Balance:</span>
            <span className="pool-balance-value">{parseFloat(userPoolBalance).toFixed(4)} ETH</span>
          </div>

          <div className="status-item">
            <span className="status-label">Protocol Contract:</span>
            <code className="contract-code">{CONTRACT_ADDRESSES.GatedDeFiService}</code>
          </div>
        </div>
      </div>

      <div className="portal-grid mt-6">
        {/* Deposit Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📥</span>
            <div>
              <h3 className="card-title">Deposit to Compliance Pool</h3>
              <p className="card-subtitle">Tests on-chain credential enforcement</p>
            </div>
          </div>

          <form onSubmit={handleDeposit} className="form-stack">
            <div className="form-group">
              <label className="form-label">Deposit Amount (ETH)</label>
              <input
                type="number"
                step="0.01"
                min="0.001"
                className="input-text"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
              />
            </div>

            <div className={`simulation-note ${isKYCValid ? 'note-success' : 'note-warning'}`}>
              <span className="note-icon">{isKYCValid ? '🟢' : '🔴'}</span>
              <p className="note-text">
                {isKYCValid
                  ? 'Your wallet has an active KYC_VERIFIED claim. The smart contract will accept your deposit.'
                  : 'Notice: If you attempt to deposit without an active KYC_VERIFIED claim, the contract will revert with IdentityVerificationFailed.'}
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block mt-3"
              disabled={isDepositing || !account}
            >
              {isDepositing ? 'Submitting Deposit...' : `Deposit ${depositAmount} ETH`}
            </button>
          </form>
        </div>

        {/* Withdraw Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📤</span>
            <div>
              <h3 className="card-title">Withdraw From Pool</h3>
              <p className="card-subtitle">Redeem your deposited protocol balance</p>
            </div>
          </div>

          <form onSubmit={handleWithdraw} className="form-stack">
            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">Withdrawal Amount (ETH)</label>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setWithdrawAmount(userPoolBalance)}
                >
                  Max Available ({parseFloat(userPoolBalance).toFixed(4)})
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                className="input-text"
                placeholder="0.0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary btn-block mt-3"
              disabled={isWithdrawing || !account || parseFloat(userPoolBalance) <= 0}
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw ETH'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

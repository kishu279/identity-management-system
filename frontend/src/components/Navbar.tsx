import React from 'react';
import { formatAddress } from '../utils/contracts';
import type { PortalTab } from '../types';

interface NavbarProps {
  account: string | null;
  balance: string | null;
  chainId: number | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchAccount: () => void;
  activeTab: PortalTab;
  setActiveTab: (tab: PortalTab) => void;
  isAdmin: boolean;
  isIssuer: boolean;
  hasIdentity: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  balance,
  chainId,
  isConnecting,
  onConnect,
  onDisconnect,
  onSwitchAccount,
  activeTab,
  setActiveTab,
  isAdmin,
  isIssuer,
  hasIdentity,
}) => {
  const getNetworkBadge = () => {
    if (!chainId) return null;
    if (chainId === 31337) {
      return <span className="badge badge-network">Hardhat Localhost (31337)</span>;
    }
    if (chainId === 11155111) {
      return <span className="badge badge-network">Sepolia Testnet (11155111)</span>;
    }
    if (chainId === 84532) {
      return <span className="badge badge-network">Base Sepolia</span>;
    }
    return <span className="badge badge-network">Chain ID: {chainId}</span>;
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand-section">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div className="brand-titles">
            <h1 className="brand-title">AegisID</h1>
            <span className="brand-subtitle">Decentralized Self-Sovereign Identity & Claim Registry</span>
          </div>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-link ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            <span className="nav-icon">👤</span>
            Identity Holder
            {hasIdentity && <span className="indicator-dot active" title="Registered Identity"></span>}
          </button>
          
          <button
            className={`nav-link ${activeTab === 'issuer' ? 'active' : ''}`}
            onClick={() => setActiveTab('issuer')}
          >
            <span className="nav-icon">🏢</span>
            Issuer Portal
            {isIssuer && <span className="indicator-dot issuer" title="Authorized Issuer"></span>}
          </button>

          <button
            className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <span className="nav-icon">👑</span>
            Admin
            {isAdmin && <span className="indicator-dot admin" title="Contract Admin"></span>}
          </button>

          <button
            className={`nav-link ${activeTab === 'verifier' ? 'active' : ''}`}
            onClick={() => setActiveTab('verifier')}
          >
            <span className="nav-icon">🔍</span>
            Verifier
          </button>

          <button
            className={`nav-link ${activeTab === 'defi' ? 'active' : ''}`}
            onClick={() => setActiveTab('defi')}
          >
            <span className="nav-icon">⚡</span>
            Gated DeFi Demo
          </button>
        </nav>

        <div className="wallet-section">
          {getNetworkBadge()}
          {account ? (
            <div className="wallet-connected">
              <div className="wallet-info">
                <span className="wallet-balance">{balance ? `${parseFloat(balance).toFixed(4)} ETH` : '...'}</span>
                <span className="wallet-address" title={account}>{formatAddress(account)}</span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onSwitchAccount}
                title="Switch active MetaMask account"
              >
                Switch Account
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onDisconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-connect"
              onClick={onConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="btn-loading">Connecting...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="14" x="2" y="5" rx="2"/>
                    <line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

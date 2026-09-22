import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner, ethers } from 'ethers';
import { Navbar } from './components/Navbar';
import { AdminPortal } from './components/AdminPortal';
import { IssuerPortal } from './components/IssuerPortal';
import { UserPortal } from './components/UserPortal';
import { VerifierPortal } from './components/VerifierPortal';
import { GatedDeFiPortal } from './components/GatedDeFiPortal';
import { Toast } from './components/Toast';
import type { PortalTab, ToastMessage } from './types';
import { getContracts } from './utils/contracts';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const App: React.FC = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [activeTab, setActiveTab] = useState<PortalTab>('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isIssuer, setIsIssuer] = useState(false);
  const [hasIdentity, setHasIdentity] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: 'success' | 'error' | 'info', title: string, description?: string, txHash?: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, description, txHash }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const checkRoles = useCallback(async (currentProvider: BrowserProvider, currentAccount: string) => {
    try {
      const { issuerRegistry, identityRegistry } = getContracts(currentProvider);

      // Check admin
      const adminRole = await issuerRegistry.DEFAULT_ADMIN_ROLE();
      const adminStatus = await issuerRegistry.hasRole(adminRole, currentAccount);
      setIsAdmin(adminStatus);

      // Check issuer
      const issuerStatus = await issuerRegistry.isTrustedIssuer(currentAccount);
      setIsIssuer(issuerStatus);

      // Check registered identity
      const idStatus = await identityRegistry.hasActiveIdentity(currentAccount);
      setHasIdentity(idStatus);
    } catch (err) {
      console.error('Error checking roles:', err);
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      showToast('error', 'MetaMask Required', 'Please install MetaMask or another Web3 extension.');
      return;
    }

    try {
      setIsConnecting(true);
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const currentSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      const currentAccount = accounts[0];
      const bal = await browserProvider.getBalance(currentAccount);

      setProvider(browserProvider);
      setSigner(currentSigner);
      setAccount(currentAccount);
      setChainId(Number(network.chainId));
      setBalance(ethers.formatEther(bal));

      await checkRoles(browserProvider, currentAccount);
      showToast('success', 'Wallet Connected', `Connected to ${currentAccount.substring(0, 6)}...`);
    } catch (err: any) {
      showToast('error', 'Connection Failed', err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setBalance(null);
    setChainId(null);
    setIsAdmin(false);
    setIsIssuer(false);
    setHasIdentity(false);
    showToast('info', 'Disconnected', 'Wallet disconnected.');
  };

  const switchAccount = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_accounts', []);
      if (accounts && accounts.length > 0) {
        const currentSigner = await browserProvider.getSigner();
        const currentAccount = accounts[0];
        const bal = await browserProvider.getBalance(currentAccount);
        const network = await browserProvider.getNetwork();

        setProvider(browserProvider);
        setSigner(currentSigner);
        setAccount(currentAccount);
        setBalance(ethers.formatEther(bal));
        setChainId(Number(network.chainId));
        await checkRoles(browserProvider, currentAccount);
        showToast('info', 'Switched Account', `Active wallet: ${currentAccount.substring(0, 6)}...`);
      }
    } catch (err: any) {
      if (err?.code !== 4001) {
        console.error('Account switch failed', err);
      }
    }
  };

  const switchNetworkToLocal = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // 31337 in hex
      });
    } catch (switchError: any) {
      // If chain not added to metamask, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x7a69',
                chainName: 'Hardhat Localhost',
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['http://127.0.0.1:8545'],
              },
            ],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      // Auto-connect if already authorized
      const checkAuthorized = async () => {
        const browserProvider = new BrowserProvider(window.ethereum);
        const accounts = await browserProvider.listAccounts();
        if (accounts.length > 0) {
          const currentSigner = await browserProvider.getSigner();
          const network = await browserProvider.getNetwork();
          const currentAccount = accounts[0].address;
          const bal = await browserProvider.getBalance(currentAccount);

          setProvider(browserProvider);
          setSigner(currentSigner);
          setAccount(currentAccount);
          setChainId(Number(network.chainId));
          setBalance(ethers.formatEther(bal));

          await checkRoles(browserProvider, currentAccount);
        }
      };
      checkAuthorized();

      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          const browserProvider = new BrowserProvider(window.ethereum);
          const currentSigner = await browserProvider.getSigner();
          const bal = await browserProvider.getBalance(accounts[0]);
          setProvider(browserProvider);
          setSigner(currentSigner);
          setAccount(accounts[0]);
          setBalance(ethers.formatEther(bal));
          await checkRoles(browserProvider, accounts[0]);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkRoles]);

  return (
    <div className="app-layout">
      <Navbar
        account={account}
        balance={balance}
        chainId={chainId}
        isConnecting={isConnecting}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        onSwitchAccount={switchAccount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        isIssuer={isIssuer}
        hasIdentity={hasIdentity}
      />

      {chainId && chainId !== 31337 && chainId !== 11155111 && (
        <div className="network-warning-banner">
          <span>⚠️ You are connected to Chain ID {chainId}. Our local node runs on Hardhat (31337) and testnet on Sepolia (11155111).</span>
          <button className="btn-banner-action" onClick={switchNetworkToLocal}>
            Switch to Hardhat Localhost (31337)
          </button>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'user' && (
          <UserPortal
            provider={provider}
            signer={signer}
            account={account}
            onShowToast={showToast}
            onIdentityChanged={() => provider && account && checkRoles(provider, account)}
          />
        )}

        {activeTab === 'issuer' && (
          <IssuerPortal
            provider={provider}
            signer={signer}
            account={account}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPortal
            provider={provider}
            signer={signer}
            account={account}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'verifier' && (
          <VerifierPortal
            provider={provider}
            account={account}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'defi' && (
          <GatedDeFiPortal
            provider={provider}
            signer={signer}
            account={account}
            onShowToast={showToast}
          />
        )}
      </main>

      <Toast toasts={toasts} onDismiss={dismissToast} />

      <footer className="app-footer">
        <div className="footer-container">
          <span>AegisID Protocol — Privacy-Preserving Self-Sovereign Identity on Ethereum</span>
          <div className="footer-links">
            <span>EIP-712 Attestations</span>
            <span>•</span>
            <span>Zero Raw PII On-Chain</span>
            <span>•</span>
            <span>Real-Time Revocation</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

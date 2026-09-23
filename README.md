# AegisID — Decentralized Identity Management System

<p align="center">
  <strong>Self-Sovereign Identity • Verifiable Credentials • On-Chain Verification</strong>
</p>

<p align="center">
  A modular Ethereum-based identity layer for user-controlled identities,
  trusted attestations, privacy-preserving claims, real-time verification,
  and claim-gated applications.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity" alt="Solidity 0.8.24">
  <img src="https://img.shields.io/badge/Hardhat-2.x-FFF100?logo=hardhat&logoColor=black" alt="Hardhat">
  <img src="https://img.shields.io/badge/OpenZeppelin-Contracts-4E5EE4?logo=openzeppelin" alt="OpenZeppelin">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8">
  <img src="https://img.shields.io/badge/ethers.js-6-3C3C3D?logo=ethereum&logoColor=white" alt="ethers.js 6">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-usage-flow">Usage Flow</a> •
  <a href="#-testing">Testing</a> •
  <a href="#-roadmap">Roadmap</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 🌐 Overview

**AegisID** is a decentralized self-sovereign identity (SSI) system built around Ethereum smart contracts.

Instead of putting personal information directly on a blockchain, the system keeps sensitive identity attributes **off-chain** while anchoring cryptographic commitments, issuer status, credential state, revocation, and expiration **on-chain**. This gives users full ownership of their identity data while still allowing anyone to trustlessly verify a credential's authenticity in real time.

The system models the complete identity lifecycle:

```text
Identity Holder
      ↓
Trusted Issuer
      ↓
Verifiable Claim
      ↓
Verifier
      ↓
Application / Protocol
```

A holder creates a decentralized identifier (DID) tied to their wallet. A whitelisted issuer (a university, employer, KYC provider, government body, etc.) attests to a claim about that holder — e.g. *"is over 18"*, *"holds a valid degree"*, *"passed KYC"* — and anchors a hash of that claim on-chain. Any verifier or dApp can then check the claim's validity, issuer authenticity, and revocation status directly against the contract, without ever seeing the underlying document or contacting the issuer.

---

## 🏗 Architecture

```text
                      claim                         query
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│ Identity Holder  │─────────▶ Smart Contracts   │─────────▶ Verifier / dApp  │
└──────────────────┘          └──────────────────┘          └──────────────────┘
          ▲  issues credential          ▲  store / retrieve
          │                             │
┌──────────────────┐          ┌──────────────────┐
│  Trusted Issuer  │          │Off-chain Storage │
└──────────────────┘          └──────────────────┘
```

**Design principle:** only what's needed for trustless verification lives on-chain — DID ↔ address mapping, issuer registry, claim hash, schema ID, issuance/expiry timestamps, and revocation flag. The actual PII (documents, images, personal data) stays off-chain, encrypted, and is only ever shared peer-to-peer between the holder and a verifier who has been explicitly granted access.

---

## ✨ Features

- 🔑 **Self-sovereign DIDs** — every user controls their own identity, tied to their wallet, with no central registry owning it.
- 🏛 **Issuer registry & trust management** — contract owner/DAO can whitelist, suspend, or revoke issuers; every claim is traceable to a verifiable issuer.
- 📜 **Verifiable claims** — issuers attest to specific attributes (age, KYC status, qualifications, membership) as cryptographically signed, hash-anchored claims.
- 🕵️ **Privacy-preserving verification** — verifiers check claim validity and issuer trust without ever accessing the underlying raw document.
- ⛔ **Revocation & expiry** — claims can be revoked or set to expire; verifiers always query current, live status rather than a cached copy.
- ⚡ **Real-time on-chain verification** — a single `view` call returns whether a claim is valid, current, and issued by a trusted party.
- 🔌 **Claim-gated applications** — any dApp can gate functionality (e.g. age-restricted access, KYC-gated DeFi, verified-alumni features) behind a claim check.
- 🧩 **Modular contract design** — identity registry, issuer registry, and claim/credential logic are separated for easier auditing and upgrades.
- 🖥 **Wallet-based frontend** — connect via MetaMask, register identity, request/view claims, and share verification links.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity `0.8.24`, OpenZeppelin Contracts |
| Dev / Test / Deploy | Hardhat, Hardhat Network, Ethers.js |
| Off-chain Storage | IPFS (Pinata / web3.storage) for encrypted documents |
| Frontend | React 19, Vite 8 |
| Blockchain Interaction | ethers.js v6, MetaMask |
| Testing | Hardhat + Chai/Mocha, `hardhat-gas-reporter`, `solidity-coverage` |
| Networks | Hardhat local network, Sepolia testnet |

---

## 📁 Repository Structure

```text
aegisid/
├── contracts/
│   ├── IdentityRegistry.sol       # DID ↔ address registration & lookup
│   ├── IssuerRegistry.sol         # Trusted issuer whitelist / suspension
│   ├── ClaimRegistry.sol          # Issue, verify, revoke claims
│   └── interfaces/                # Shared interfaces for cross-contract calls
├── scripts/
│   ├── deploy.js                  # Deployment script (local / testnet)
│   └── seed.js                    # Seed sample issuers & claims for demo
├── test/
│   ├── IdentityRegistry.test.js
│   ├── IssuerRegistry.test.js
│   └── ClaimRegistry.test.js
├── frontend/
│   ├── src/
│   │   ├── components/            # Wallet connect, claim cards, forms
│   │   ├── hooks/                 # useContract, useWallet, useClaims
│   │   ├── pages/                 # Register, Issue, Verify dashboards
│   │   └── utils/                 # Hashing, IPFS upload helpers
│   ├── index.html
│   └── vite.config.js
├── hardhat.config.js
├── .env.example
└── README.md
```

> Adjust this tree to match your actual folder layout — this is the conventional structure the setup steps below assume.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18.x
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MetaMask](https://metamask.io/) browser extension
- A [Sepolia](https://sepolia.dev/) RPC URL (via [Alchemy](https://www.alchemy.com/) / [Infura](https://www.infura.io/)) and a funded test wallet, if deploying beyond localhost

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/aegisid.git
cd aegisid
npm install
cd frontend && npm install && cd ..
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_wallet_private_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
ETHERSCAN_API_KEY=your_etherscan_api_key
IPFS_API_KEY=your_pinata_or_web3storage_key
```

> ⚠️ Never commit your `.env` file or private keys. `.env` is already listed in `.gitignore`.

### 3. Compile contracts

```bash
npx hardhat compile
```

### 4. Run a local blockchain

```bash
npx hardhat node
```

### 5. Deploy contracts (in a new terminal)

```bash
# Local network
npx hardhat run scripts/deploy.js --network localhost

# Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia
```

### 6. Run the frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`, connect MetaMask (pointed at the same network you deployed to), and you're ready to go.

---

## 🔄 Usage Flow

1. **Register identity** — a user connects their wallet and registers a DID via `IdentityRegistry`.
2. **Issuer onboarding** — the contract owner/DAO whitelists a trusted issuer address in `IssuerRegistry`.
3. **Claim issuance** — the issuer generates a hash of the credential (e.g. degree certificate), uploads the encrypted document to IPFS, and calls `issueClaim()` with the hash, schema ID, and expiry.
4. **Claim storage** — `ClaimRegistry` stores the claim hash, issuer address, and status against the holder's DID.
5. **Verification** — a verifier (or dApp) calls `verifyClaim(holder, claimId)`, which checks: issuer is trusted → claim not expired → claim not revoked → hash matches.
6. **Revocation (optional)** — the issuer (or holder, depending on claim type) can revoke a claim at any time via `revokeClaim()`, instantly invalidating it for all future verifications.

---

## 🧪 Testing

Run the full contract test suite:

```bash
npx hardhat test
```

Check gas usage:

```bash
REPORT_GAS=true npx hardhat test
```

Check test coverage:

```bash
npx hardhat coverage
```

---

## 🗺 Roadmap

- [ ] Zero-knowledge proof support for fully selective disclosure (e.g. prove age > 18 without revealing DOB)
- [ ] Multi-chain / cross-chain DID resolution (W3C DID method compliance)
- [ ] Layer-2 deployment (Base / Arbitrum / Polygon) to reduce gas costs
- [ ] Soulbound token (SBT) representation for non-transferable credentials
- [ ] Issuer reputation & staking mechanism
- [ ] Mobile wallet support (WalletConnect)
- [ ] Governance module for decentralized issuer approval


---

## 🙏 Acknowledgements

- [OpenZeppelin](https://www.openzeppelin.com/) for secure, audited contract primitives
- [Hardhat](https://hardhat.org/) for the development and testing framework
- [Ethereum Foundation](https://ethereum.org/) for the underlying infrastructure this system is built on

---

<p align="center">:).</p>

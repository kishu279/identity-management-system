Absolutely, boss. Here’s the **complete polished `README.md`** ready to replace the existing one.

````markdown
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
</p>

---

## 🌐 Overview

**AegisID** is a decentralized self-sovereign identity (SSI) system built around Ethereum smart contracts.

Instead of putting personal information directly on a blockchain, the system keeps sensitive identity attributes off-chain while anchoring cryptographic commitments, issuer status, credential state, revocation, and expiration on-chain.

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
````

### Core Principle

> **Keep sensitive identity data off-chain and make trust, verification, and credential state programmable on-chain.**

---

# ✨ Key Features

| Feature                          | Description                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| 🆔 **Self-Sovereign Identity**   | Users can register, update, deactivate, and reactivate their identity.                    |
| 🏛️ **Trusted Issuers**          | Administrators manage trusted issuers and their authorized claim types.                   |
| 🔐 **Privacy-Preserving Claims** | Sensitive attributes are represented using cryptographic commitments rather than raw PII. |
| ✅ **Live Verification**          | Claims can be verified against their current on-chain state.                              |
| ✍️ **EIP-712 Attestations**      | Supports typed off-chain signatures for claim issuance.                                   |
| 🚫 **Claim Revocation**          | Previously issued credentials can be revoked.                                             |
| ⏳ **Credential Expiration**      | Claims can automatically become invalid after their expiry timestamp.                     |
| 👥 **Social Recovery**           | M-of-N guardian recovery workflow.                                                        |
| 💰 **Gated DeFi**                | Example relying-party protocol uses identity claims for access control.                   |
| 🖥️ **Web3 Dashboard**           | Admin, Issuer, User, Verifier and Gated DeFi portals.                                     |

---

# 🏗️ System Architecture

```text
                         ┌───────────────────────────┐
                         │      Identity Holder      │
                         │  Register / Manage ID     │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │     IdentityRegistry      │
                         │                           │
                         │ • Identity state          │
                         │ • Metadata URI            │
                         │ • Metadata hash            │
                         │ • Active / inactive       │
                         └─────────────┬─────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
          ┌─────────────────────┐             ┌────────────────────────┐
          │    IssuerRegistry   │             │       ClaimStore        │
          │                     │             │                        │
          │ • Trusted issuers   │────────────►│ • Claim storage         │
          │ • RBAC              │             │ • Issue / revoke        │
          │ • Claim permissions │             │ • Expiration checks     │
          └──────────┬──────────┘             │ • EIP-712 verification │
                     │                        └────────────┬───────────┘
                     │                                     │
                     │                                     ▼
                     │                         ┌────────────────────────┐
                     └────────────────────────►│       Verifier         │
                                               │  Live claim checking   │
                                               └────────────┬───────────┘
                                                            │
                                                            ▼
                                               ┌────────────────────────┐
                                               │    GatedDeFiService    │
                                               │   Example Relying App │
                                               └────────────────────────┘


                    Recovery Flow
                    ─────────────

                 Identity Holder
                       │
                       ▼
                RecoveryModule
                       │
                       ▼
                Guardian Network
                       │
                       ▼
                  M-of-N Approval
                       │
                       ▼
                    Recovery
```

---

# 🔐 Smart Contracts

## `IdentityRegistry.sol`

The core identity registry.

It maps Ethereum addresses to identity records containing:

* Owner address
* Creation timestamp
* Update timestamp
* Metadata URI
* Metadata hash
* Active state

### Identity Lifecycle

```text
Register
   │
   ▼
 Active
   │
   ├───────────────► Update Metadata
   │
   ├───────────────► Deactivate
   │                       │
   │                       ▼
   │                    Inactive
   │                       │
   │                       ▼
   └──────────────────── Reactivate
```

---

## `IssuerRegistry.sol`

Manages trusted credential issuers.

It uses OpenZeppelin's `AccessControl` to manage:

* Administrator permissions
* Issuer-manager permissions
* Trusted issuer status
* Authorized claim types

An issuer must satisfy:

```text
Trusted Issuer
      +
Authorized Claim Type
      ↓
Eligible to Issue Claim
```

Example claim types:

```text
KYC_VERIFIED
OVER_18
RESIDENCY_VERIFIED
EDUCATION_VERIFIED
```

---

## `ClaimStore.sol`

The central credential and attestation layer.

Claims contain information such as:

* Subject
* Claim type
* Claim hash
* Issuer
* Issue timestamp
* Expiration timestamp
* Revocation state

The verification system checks:

```text
Claim Exists
     +
Not Revoked
     +
Not Expired
     +
Issuer Trusted
     +
Issuer Authorized
     ↓
Valid Claim
```

---

## `RecoveryModule.sol`

Provides guardian-based social recovery.

Example:

```text
3 Guardians
     +
2 Required Approvals
     ↓
2-of-3 Recovery
```

The module maintains guardian configuration and recovery approval state.

> The current module is a recovery component. Connecting recovery execution to the ownership model of a production identity registry requires additional application-level integration.

---

## `GatedDeFiService.sol`

An example relying-party application demonstrating how identity verification can become a reusable access-control primitive.

Example:

```solidity
if (!claimStore.isClaimValid(msg.sender, requiredClaimType)) {
    revert IdentityVerificationFailed(
        msg.sender,
        requiredClaimType
    );
}
```

This means another decentralized application can consume the identity layer without implementing its own identity verification system.

---

# 🛡️ Privacy Model

AegisID is designed so that **raw identity attributes are not stored directly on-chain**.

Instead, sensitive information can remain off-chain while a cryptographic commitment is anchored on-chain.

```text
                 Off-Chain Credential
                         │
             ┌───────────┼───────────┐
             │           │           │
           Name       Country     Attributes
             │           │           │
             └───────────┼───────────┘
                         │
                     Secret Salt
                         │
                         ▼
                   Cryptographic
                      Hash
                         │
                         ▼
                  ClaimStore
                         │
                         ▼
                 Blockchain State
```

Conceptually:

```text
claimHash =
keccak256(
    encode(
        subject,
        claimType,
        attributes,
        salt
    )
)
```

This allows applications to verify the anchored credential state without putting the original personal information into blockchain storage.

### ⚠️ Privacy Note

A cryptographic hash does **not** make blockchain activity anonymous.

Wallet addresses, transactions, smart-contract interactions, and any public metadata can remain observable.

---

# ✍️ EIP-712 Signed Claims

AegisID supports EIP-712 typed signatures for claim authorization.

```text
Issuer
   │
   │ Signs typed claim
   ▼
EIP-712 Signature
   │
   ▼
User / Relayer
   │
   ▼
ClaimStore.issueClaimWithSignature(...)
   │
   ├── Deadline validation
   ├── Nonce validation
   ├── Replay protection
   ├── Signature recovery
   ├── Issuer authorization
   └── Claim persistence
```

The signed claim contains information such as:

```text
Issuer
Subject
Claim Type
Claim Hash
Expiration
Nonce
Deadline
```

This allows issuers to authorize claims off-chain while another account can submit the signed authorization on-chain.

---

# 🔄 End-to-End Identity Flow

## 1️⃣ Admin Registers Issuer

The administrator registers a trusted issuer.

```text
Admin
  ↓
Register Issuer
  ↓
Authorize Claim Type
```

---

## 2️⃣ User Registers Identity

The user registers an identity.

```text
Wallet
  ↓
IdentityRegistry
  ↓
Active Identity
```

---

## 3️⃣ Issuer Verifies User

The trusted issuer performs its required verification process off-chain.

For example:

```text
User
 ↓
KYC Provider
 ↓
Verification
 ↓
KYC Credential
```

---

## 4️⃣ Claim Is Created

The issuer generates a cryptographic commitment representing the credential.

```text
Credential
    ↓
Claim Hash
    ↓
ClaimStore
```

---

## 5️⃣ Verifier Checks Claim

The verifier queries the blockchain.

```text
Subject
   +
Claim Type
   ↓
ClaimStore
   ↓
Verification
```

---

## 6️⃣ Application Enforces Access

A decentralized application can consume the verification result.

```text
Valid Claim
     ↓
Access Granted

Invalid / Expired / Revoked Claim
     ↓
Access Rejected
```

---

## 7️⃣ Revocation

If an issuer revokes the claim:

```text
Previously Valid Claim
        ↓
     Revoked
        ↓
Verification = Invalid
        ↓
Application Access Rejected
```

---

# 🖥️ Frontend

The project includes a React + Vite + TypeScript Web3 dashboard.

## Available Portals

| Portal                        | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| 👑 **Admin Portal**           | Manage trusted issuers and claim permissions.          |
| 🏢 **Issuer Portal**          | Issue and manage verifiable attestations.              |
| 👤 **Identity Holder Portal** | Register and view identity and credential information. |
| 🔎 **Verifier Portal**        | Verify claims directly against blockchain state.       |
| 💰 **Gated DeFi Portal**      | Test claim-based access control.                       |

Wallet connectivity is provided through MetaMask / EIP-1193 providers using `ethers.js`.

---

# 📁 Project Structure

```text
identity-management-system/
│
├── contracts/
│   ├── IdentityRegistry.sol
│   ├── IssuerRegistry.sol
│   ├── ClaimStore.sol
│   ├── RecoveryModule.sol
│   │
│   ├── examples/
│   │   └── GatedDeFiService.sol
│   │
│   └── interfaces/
│       ├── IClaimStore.sol
│       ├── IIdentityRegistry.sol
│       └── IIssuerRegistry.sol
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPortal.tsx
│   │   │   ├── IssuerPortal.tsx
│   │   │   ├── UserPortal.tsx
│   │   │   ├── VerifierPortal.tsx
│   │   │   ├── GatedDeFiPortal.tsx
│   │   │   └── Navbar.tsx
│   │   │
│   │   ├── contracts/
│   │   └── utils/
│   │
│   └── package.json
│
├── scripts/
│   ├── deploy.ts
│   ├── demo_flow.ts
│   ├── grant_admin.ts
│   ├── check_balance.ts
│   └── check_roles.ts
│
├── test/
│   ├── ClaimStore.test.ts
│   ├── EIP712Claims.test.ts
│   ├── IdentityRegistry.test.ts
│   ├── IntegrationAndGatedDeFi.test.ts
│   ├── IssuerRegistry.test.ts
│   └── RecoveryModule.test.ts
│
├── deployedContracts.json
├── hardhat.config.ts
├── .env.example
├── HOW_TO_USE.md
├── package.json
└── README.md
```

---

# ⚙️ Technology Stack

## Blockchain

* Solidity `0.8.24`
* Ethereum-compatible EVM
* Hardhat
* OpenZeppelin Contracts
* ethers.js v6
* EIP-712

## Frontend

* React 19
* TypeScript
* Vite
* ethers.js v6
* MetaMask
* EIP-1193

## Development

* Node.js 18+
* npm
* TypeChain
* dotenv
* Hardhat testing framework

---

# 🚀 Quick Start

## Prerequisites

Make sure you have:

* Node.js 18+
* npm
* MetaMask or another EVM-compatible wallet

---

## 1. Clone Repository

```bash
git clone https://github.com/kishu279/identity-management-system.git

cd identity-management-system
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Compile Smart Contracts

```bash
npm run compile
```

---

## 4. Run Tests

```bash
npm test
```

---

# 🧪 Run the Full Local Demo

The repository contains an end-to-end demo flow.

## Terminal 1 — Start Hardhat

```bash
npx hardhat node
```

Local network:

```text
RPC URL:  http://127.0.0.1:8545
Chain ID: 31337
```

---

## Terminal 2 — Run Demo

```bash
npm run demo
```

The demo covers:

```text
Deploy Contracts
       ↓
Configure Trusted Issuer
       ↓
Register Identity
       ↓
Issue KYC Claim
       ↓
Verify Claim
       ↓
Allow Verified DeFi Deposit
       ↓
Reject Unverified User
       ↓
Revoke Claim
       ↓
Reject User After Revocation
```

---

# 🖥️ Run the Web Dashboard

## 1. Deploy Contracts

After starting Hardhat:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

The deployment process exports the required contract addresses and ABIs for frontend integration.

---

## 2. Start Frontend

```bash
npm run frontend:dev
```

Open:

```text
http://localhost:5173
```

---

## 3. Configure MetaMask

Use:

```text
Network:   Hardhat Localhost
RPC URL:   http://127.0.0.1:8545
Chain ID:  31337
Currency:  ETH
```

For the complete Admin → User → Issuer → Verifier → DeFi walkthrough, see:

**[HOW_TO_USE.md](./HOW_TO_USE.md)**

---

# 🌍 Testnet Deployment

Hardhat is configured for Ethereum-compatible test networks including:

* Sepolia
* Base Sepolia

Create your environment file:

```bash
cp .env.example .env
```

Configure:

```env
SEPOLIA_RPC_URL="YOUR_SEPOLIA_RPC_URL"
PRIVATE_KEY="YOUR_PRIVATE_KEY"
ETHERSCAN_API_KEY="YOUR_ETHERSCAN_API_KEY"
```

### Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

### Base Sepolia

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

> ⚠️ **Never commit private keys, API secrets, or `.env` files to GitHub.**

---

# ✅ Testing

The repository includes tests covering the major smart-contract components.

```text
IdentityRegistry
       │
       ├── Registration
       ├── Deactivation
       └── Reactivation

IssuerRegistry
       │
       ├── Roles
       ├── Issuer Management
       └── Claim Permissions

ClaimStore
       │
       ├── Claim Issuance
       ├── Verification
       ├── Expiration
       └── Revocation

EIP712Claims
       │
       ├── Signature Verification
       ├── Nonces
       └── Replay Protection

RecoveryModule
       │
       └── Guardian Recovery

Integration
       │
       └── Gated DeFi
```

Run everything:

```bash
npm test
```

---

# 🛡️ Security Design

AegisID uses multiple layers of security.

### 🔐 Role-Based Access Control

Issuer administration uses OpenZeppelin `AccessControl`.

### 🏛️ Issuer Authorization

A claim can only be considered valid when its issuer is trusted and authorized for the relevant claim type.

### ✍️ EIP-712 Signature Verification

Typed signatures are recovered and verified against the expected issuer.

### 🔁 Replay Protection

Nonce-based validation prevents reuse of signed claim authorizations.

### ⏰ Deadline Protection

Signed claims can contain a deadline after which they cannot be submitted.

### 🚫 Revocation

Issuers or authorized managers can invalidate previously issued claims.

### ⌛ Expiration

Time-bound claims become invalid after their expiration timestamp.

### 🆔 Active Identity Requirement

Claim issuance can depend on an active identity registered in `IdentityRegistry`.

### 🔗 Composability

Other smart contracts can consume identity verification instead of implementing their own credential system.

---

# ⚠️ Production Considerations

This project is an engineering/reference implementation and should be independently audited before production deployment.

Before using it with real assets or sensitive identity workflows, consider:

* Independent smart-contract security auditing
* Secure private-key management
* Secure off-chain credential storage
* Encryption and access control for off-chain data
* Standardized credential schemas
* Issuer governance
* Recovery threat modeling
* Privacy threat modeling
* Frontend security
* Oracle / external data dependencies
* Upgrade and migration strategy
* Multi-chain consistency

### Important

The system's cryptographic commitments provide integrity and verification capabilities, but they should not be described as complete anonymity or guaranteed privacy.

---

# 🧭 Potential Use Cases

## 🏦 Compliance-Aware DeFi

Protocols can require an active KYC or eligibility credential before allowing access.

```text
Wallet
  ↓
Valid KYC Claim?
  ↓
YES ─────► DeFi Access
NO  ─────► Transaction Rejected
```

---

## 🎓 Verifiable Education

Universities can issue verifiable credentials representing:

* Degrees
* Certifications
* Course completion
* Student status

without publishing the underlying student records directly on-chain.

---

## 🏛️ Membership & Access Control

Organizations can issue membership credentials and allow decentralized applications to verify them.

---

## 🌍 Residency & Eligibility

Applications can verify issuer-backed eligibility claims without directly duplicating the issuer's database.

---

## 🔑 Web3 Account Recovery

Guardian-based recovery can provide an additional recovery mechanism for lost or compromised wallet access.

---

# 🧩 Future Extensions

Possible future improvements include:

* 🔐 Zero-Knowledge Proof verification
* 🕵️ Selective disclosure
* 🆔 DID integrations
* 📦 Verifiable Credential standards
* 🌐 IPFS / decentralized storage integrations
* 🏛️ Issuer reputation systems
* 🗳️ Issuer governance
* 🔄 Credential versioning
* ⛓️ Multi-chain deployments
* 🛡️ Advanced recovery policies
* 🔌 Protocol-specific verifier adapters

---

# 📚 Documentation

| Resource                         | Description                    |
| -------------------------------- | ------------------------------ |
| [HOW_TO_USE.md](./HOW_TO_USE.md) | Complete setup and usage guide |
| [contracts/](./contracts)        | Solidity smart contracts       |
| [frontend/](./frontend)          | React Web3 dashboard           |
| [scripts/](./scripts)            | Deployment and utility scripts |
| [test/](./test)                  | Smart-contract test suite      |

---

# 🤝 Contributing

Contributions are welcome.

### Create a feature branch

```bash
git checkout -b feature/your-feature
```

### Make your changes

```bash
npm run compile
npm test
```

### Commit

```bash
git add .

git commit -m "feat: add your feature"
```

### Push

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

Please include:

* Clear description
* Implementation details
* Tests for behavioral changes
* Security considerations
* Screenshots for UI changes where appropriate

---

# 📄 License

This project is released under the **MIT License**.

See the source files for individual license declarations.

---

# ⭐ Project Vision

AegisID demonstrates how blockchain can be used as a **verification and trust layer** without turning the blockchain into a database of personal information.

```text
Identity
    +
Trusted Issuers
    +
Cryptographic Commitments
    +
Verifiable Credentials
    +
On-Chain Verification
    +
Application Enforcement
    │
    ▼
Composable Decentralized Identity
Infrastructure
```

The goal is simple:

> **Make digital trust programmable while keeping sensitive identity information outside the blockchain whenever possible.**

---

<p align="center">
  <strong>Built with Solidity • Hardhat • OpenZeppelin • React • Vite • ethers.js</strong>
</p>

<p align="center">
  ⭐ Star the repository if you find the project useful.
</p>
```

### One important recommendation

For a **GitHub portfolio / placement project**, I would also add these near the top once you have them:

* **Live Demo**
* **Deployed Contract Addresses**
* **Screenshots/GIF of the dashboard**
* **Test coverage badge**
* **Demo video**
* **Architecture diagram**
* **Contributors**
* **Known limitations**

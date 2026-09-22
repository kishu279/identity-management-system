# Decentralized Identity Management System (SSI on Ethereum)

A modular, production-ready decentralized self-sovereign identity (SSI) and verifiable claim registry on Ethereum, built with Solidity `0.8.24`, Hardhat, OpenZeppelin Contracts, and a modern React + Vite frontend.

> 🚀 **Looking for how to run and test the frontend?**
> Read the complete step-by-step guide: **[HOW_TO_USE.md](./HOW_TO_USE.md)**.

---

## 🏛 System Architecture

```
                                  ┌───────────────────────────────┐
                                  │      IdentityRegistry         │
                                  │  - register / deactivate ID   │
                                  │  - metadata URI & hash        │
                                  └───────────────┬───────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │                                                 │
            ┌────────────▼────────────┐                       ┌────────────▼────────────┐
            │     IssuerRegistry      │                       │       ClaimStore        │
            │  - trusted issuers list │◄──────────────────────┤  - claims mapping       │
            │  - issuer permissions   │                       │  - issueClaim / revoke  │
            │  - authorized claimTypes│                       │  - verifyClaim (live)   │
            │  - OpenZeppelin RBAC    │                       │  - EIP-712 sig verify   │
            └─────────────────────────┘                       └────────────┬────────────┘
                                                                           │
                                                              ┌────────────▼────────────┐
                                                              │    GatedDeFiService     │
                                                              │  - Relying Party DApp   │
                                                              │  - Live KYC requirement │
                                                              └─────────────────────────┘
```

---

## 🔐 Core Contracts

| Contract | Description |
|---|---|
| **`IdentityRegistry.sol`** | Maps Ethereum addresses to on-chain identity records (`metadataURI`, `metadataHash`, active state). Prevents duplicate registration and supports self-deactivation. |
| **`IssuerRegistry.sol`** | Manages trusted attestation providers (KYC providers, universities, DAOs) and the specific claim categories (`claimType`) each is authorized to issue. Backed by OpenZeppelin `AccessControl`. |
| **`ClaimStore.sol`** | Anchors verifiable credentials on-chain without exposing PII. Features real-time verification (`verifyClaim`), revocations, expiration checks, and EIP-712 typed off-chain signatures (`issueClaimWithSignature`). |
| **`RecoveryModule.sol`** | Guardian-based social recovery enabling M-of-N guardians to transfer identity control to a new address if private keys are compromised. |
| **`GatedDeFiService.sol`** | Example relying party showing how third-party smart contracts gate access (e.g. KYC'd deposit pool) using live on-chain claim verification. |

---

## 🛡 Privacy & Zero PII Guarantee

On-chain privacy is strictly enforced:
- **Raw personal data is NEVER stored on-chain.**
- Claims store only a salted cryptographic hash:
  $$\text{claimHash} = \text{keccak256}(\text{abi.encode}(\text{subject}, \text{claimType}, \text{attributes}, \text{salt}))$$
- Off-chain verifiable credentials (stored in IPFS or user wallet) can be verified against this on-chain hash at any time.

---

## ✍️ EIP-712 Gasless Off-Chain Attestation

Issuers can sign claims off-chain without spending gas:
```
Issuer signs: IssueClaim(address issuer, address subject, bytes32 claimType, bytes32 claimHash, uint64 expiresAt, uint256 nonce, uint256 deadline)
     │
     ▼
User/Relayer calls: ClaimStore.issueClaimWithSignature(...)
     │
     ▼
ClaimStore verifies signature, checks nonce replay protection, checks issuer authorization, and records claim on-chain.
```

---

## 🚀 Quickstart & Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile Contracts
```bash
npm run compile
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Deploy Locally or to Testnet
```bash
# Local deployment
npx hardhat node
npm run deploy -- --network localhost

# Sepolia testnet deployment (requires SEPOLIA_RPC_URL and PRIVATE_KEY in .env)
npx hardhat run scripts/deploy.ts --network sepolia
```

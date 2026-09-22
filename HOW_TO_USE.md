# AegisID — Complete Step-by-Step Usage Guide

This guide walks you through starting the local blockchain, running the modern web dashboard, configuring MetaMask, and executing the complete decentralized identity lifecycle across all 3 key personas: **Admin**, **Issuer**, and **User (Identity Holder)**.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Starting the Local Network & Frontend](#2-starting-the-local-network--frontend)
3. [Configuring MetaMask](#3-configuring-metamask)
4. [The 4-Step Lifecycle Guide](#4-the-4-step-lifecycle-guide)
   - [Part A: Admin Onboards the Issuer](#part-a-admin-onboards-the-issuer)
   - [Part B: User Registers Sovereign Identity](#part-b-user-registers-sovereign-identity)
   - [Part C: Issuer Issues Verifiable Credential](#part-c-issuer-issues-verifiable-credential)
   - [Part D: Verifier & Gated DeFi Live Test](#part-d-verifier--gated-defi-live-test)
5. [Troubleshooting & Pro Tips](#5-troubleshooting--pro-tips)

---

## 1. Prerequisites

- **Node.js**: v18 or later
- **Browser**: Chrome, Brave, Edge, or Firefox with the **MetaMask** extension installed.

---

## 2. Starting the Local Network & Frontend

You will use three terminal tabs in this project directory:

### Terminal 1: Start the Local Blockchain Node
```bash
npx hardhat node
```
*Leave this running. It runs at `http://127.0.0.1:8545` (Chain ID: `31337`) and outputs 20 pre-funded test accounts with 10,000 ETH each.*

### Terminal 2: Deploy Contracts & Auto-Export Config
```bash
npx hardhat run scripts/deploy.ts --network localhost
```
*This deploys all 5 smart contracts and automatically exports addresses and ABIs directly to the frontend.*

> **Optional Helper**: If you want your primary MetaMask account (`0xA854c...`) funded with 100 ETH and granted Admin rights immediately, run:
> ```bash
> npx hardhat run scripts/grant_admin.ts --network localhost
> ```

### Terminal 3: Start the Web Dashboard
```bash
npm run frontend:dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 3. Configuring MetaMask

### A. Add the Local Network
In MetaMask:
1. Click the network dropdown (top-left) &rarr; **Add Network** &rarr; **Add a network manually**.
2. Fill in:
   - **Network Name**: `Hardhat Localhost`
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
3. Click **Save** and switch to this network.

### B. Import Test Accounts
In MetaMask, click your account icon &rarr; **Add account or hardware wallet** &rarr; **Import account** &rarr; Paste the private key:

| Role | Name | Address | Private Key |
| :--- | :--- | :--- | :--- |
| 👑 **Admin** | Account #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 🏢 **Issuer** | Account #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 👤 **User (Alice)** | Account #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb2f954080a0c04f500a94e54257e1df2d1a497` |

---

## 4. The 4-Step Lifecycle Guide

Open **[http://localhost:5173](http://localhost:5173)**.

---

### Part A: Admin Onboards the Issuer
*(Goal: Register Account #1 as a recognized verification authority and authorize it for `KYC_VERIFIED`).*

1. Connect with **Account #0** (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) or your primary wallet.
2. Click the **Admin** tab. You should see:
   > **✓ Admin Verified:** You are connected with the authorized Admin wallet.
3. In the **Onboard Trusted Attester** card:
   - Click the blue link **"Auto-fill Account #1"** (or paste `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
   - Authority Name: `Global KYC Authority`.
   - Click **Add Trusted Issuer** &rarr; Confirm in MetaMask.
4. In the **Manage Claim Permissions** card below:
   - Click **"Auto-fill Account #1"**.
   - Claim Type: Select **`KYC_VERIFIED`**.
   - Click **Authorize Type** &rarr; Confirm in MetaMask.

✅ **Result**: Account #1 is now an authorized on-chain attestation authority.

---

### Part B: User Registers Sovereign Identity
*(Goal: User anchors their root decentralized identifier on-chain. Required before any claims can be issued).*

1. Click the **"Switch Account"** button in the top-right navbar &rarr; select **Account #2** (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`).
2. Click the **Identity Holder** tab.
3. You will see the **"Register Your Sovereign Identity"** onboarding card.
4. Keep the default DID Document URI (`ipfs://...`) and cryptographic hash.
5. Click **Register Sovereign Identity** &rarr; Confirm in MetaMask.

✅ **Result**: Account #2 now has an active identity record on Ethereum with status: **● Identity Active**.

---

### Part C: Issuer Issues Verifiable Credential
*(Goal: The authorized issuer verifies Alice's KYC and stores a privacy-preserving cryptographic attestation on-chain).*

1. Click **"Switch Account"** in the top-right navbar &rarr; select **Account #1** (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
2. Click the **Issuer Portal** tab. You will see:
   > **✓ Authorized Authority (Global KYC Authority)**
   > **Active Permissions: ✓ KYC_VERIFIED**
3. In the **Issue Verifiable Attestation** card:
   - **Subject Wallet Address**: Paste Account #2's address:
     ```
     0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
     ```
   - **Claim Type**: Select `KYC_VERIFIED`.
   - **Credential Payload**: Type in user name (e.g. `Alice Smith`) and Country (`US`). Notice the salted Keccak256 hash automatically computed below (zero raw PII stored on-chain!).
   - **Expiration Validity**: Select `1 Year`.
   - Click **Issue On-Chain Attestation** &rarr; Confirm in MetaMask.

✅ **Result**: The credential claim is securely anchored in `ClaimStore.sol`.

---

### Part D: Verifier & Gated DeFi Live Test

#### 1. User Credential Verification
- Switch back to **Account #2** in MetaMask and open the **Identity Holder** tab.
- Look under **My Verifiable Credentials & Attestations**:
  - `KYC_VERIFIED` now shows: **✓ Verified & Valid** with issuer details and expiration date!

#### 2. Standalone Real-Time Verifier
- Click the **Verifier** tab.
- Enter Account #2's address (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`).
- Click **Verify Claim On-Chain**.
- You will see the green card: **✅ VALID & VERIFIED CLAIM** with the cryptographic audit trail.

#### 3. Test Gated DeFi Composability
- Click the **Gated DeFi Demo** tab.
- With **Account #2** connected:
  - Status shows **✓ KYC Cleared (Eligible)**.
  - Enter `0.05` ETH and click **Deposit ETH** &rarr; **Deposit Accepted!**
- Now switch to an unverified account (e.g. Account #3: `0x90F79bf...`):
  - Status shows **✕ Unverified (Ineligible)**.
  - Attempt to deposit &rarr; The smart contract immediately rejects and reverts the transaction with `IdentityVerificationFailed`!

---

## 5. Troubleshooting & Pro Tips

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **"Unauthorized: Connected wallet is not Admin"** | MetaMask is connected to a non-admin account on the Admin tab. | Click "Switch Account" in navbar & select Account #0 (`0xf39F...2266`), or run `npx hardhat run scripts/grant_admin.ts --network localhost` to make your current wallet admin. |
| **"Recipient Has No Registered Identity"** | Attempting to issue a claim to an address that hasn't completed Part B. | Recipient wallet must first click **Register Sovereign Identity** on the Identity Holder tab. |
| **"Nonce too high" or RPC error** | The local Hardhat node was restarted while MetaMask remembered old transactions. | In MetaMask: **Settings** &rarr; **Advanced** &rarr; **Clear activity tab data**. |
| **Unable to switch accounts** | MetaMask kept site bound to primary account. | Use the **"Switch Account"** button in the top-right navbar to trigger the MetaMask account selection popup. |

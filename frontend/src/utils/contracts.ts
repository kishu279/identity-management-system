import { ethers, BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
import deploymentData from '../contracts/deployedContracts.json';

export const CLAIM_TYPES = {
  KYC_VERIFIED: {
    name: 'KYC_VERIFIED',
    label: 'Identity & KYC Verified',
    hash: deploymentData.claimTypes.KYC_VERIFIED,
    description: 'Level 2 Identity verification meeting global AML/CFT standards'
  },
  OVER_18: {
    name: 'OVER_18',
    label: 'Age Verification (> 18)',
    hash: deploymentData.claimTypes.OVER_18,
    description: 'Proof of legal adult age without revealing date of birth'
  },
  RESIDENCY_ACCREDITED: {
    name: 'RESIDENCY_ACCREDITED',
    label: 'Residency Accredited',
    hash: deploymentData.claimTypes.RESIDENCY_ACCREDITED,
    description: 'Accredited resident verification for compliant jurisdictional participation'
  }
};

export const CONTRACT_ADDRESSES = {
  IdentityRegistry: deploymentData.contracts.IdentityRegistry.address,
  IssuerRegistry: deploymentData.contracts.IssuerRegistry.address,
  ClaimStore: deploymentData.contracts.ClaimStore.address,
  RecoveryModule: deploymentData.contracts.RecoveryModule.address,
  GatedDeFiService: deploymentData.contracts.GatedDeFiService.address,
};

export function getContracts(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  const identityRegistry = new Contract(
    deploymentData.contracts.IdentityRegistry.address,
    deploymentData.contracts.IdentityRegistry.abi,
    signerOrProvider
  );

  const issuerRegistry = new Contract(
    deploymentData.contracts.IssuerRegistry.address,
    deploymentData.contracts.IssuerRegistry.abi,
    signerOrProvider
  );

  const claimStore = new Contract(
    deploymentData.contracts.ClaimStore.address,
    deploymentData.contracts.ClaimStore.abi,
    signerOrProvider
  );

  const recoveryModule = new Contract(
    deploymentData.contracts.RecoveryModule.address,
    deploymentData.contracts.RecoveryModule.abi,
    signerOrProvider
  );

  const gatedDeFi = new Contract(
    deploymentData.contracts.GatedDeFiService.address,
    deploymentData.contracts.GatedDeFiService.abi,
    signerOrProvider
  );

  return {
    identityRegistry,
    issuerRegistry,
    claimStore,
    recoveryModule,
    gatedDeFi,
  };
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address || '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export function formatHash(hash: string): string {
  if (!hash || hash.length < 14) return hash || '';
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
}

export function formatTimestamp(timestamp: bigint | number): string {
  const val = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  if (val === 0) return 'Never / Permanent';
  return new Date(val * 1000).toLocaleString();
}

export function hashString(value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

export function parseContractError(error: any): string {
  // 1. Try decoding error data from contract ABIs
  const rawData = error?.data || error?.info?.error?.data || error?.error?.data;
  if (rawData && typeof rawData === 'string' && rawData.startsWith('0x')) {
    try {
      const claimStoreIf = new ethers.Interface(deploymentData.contracts.ClaimStore.abi);
      const parsed = claimStoreIf.parseError(rawData);
      if (parsed) {
        if (parsed.name === 'UnauthorizedIssuer') {
          return `Unauthorized Issuer: Wallet ${formatAddress(parsed.args[0])} is not authorized for this claim type.`;
        }
        if (parsed.name === 'SubjectHasNoActiveIdentity') {
          return `Subject Has No Identity: Recipient ${formatAddress(parsed.args[0])} has not registered an active identity in the Identity Holder tab.`;
        }
        if (parsed.name === 'ClaimAlreadyRevoked') {
          return 'Claim has already been revoked.';
        }
      }
    } catch (e) {}

    try {
      const issuerRegIf = new ethers.Interface(deploymentData.contracts.IssuerRegistry.abi);
      const parsed = issuerRegIf.parseError(rawData);
      if (parsed) {
        if (parsed.name === 'AccessControlUnauthorizedAccount') {
          return `Access Denied: Wallet ${formatAddress(parsed.args[0])} does not have admin permissions.`;
        }
        if (parsed.name === 'IssuerAlreadyExists') {
          return 'This issuer is already registered.';
        }
      }
    } catch (e) {}
  }

  const errMsg = (error?.message || '') + ' ' + (error?.shortMessage || '') + ' ' + (error?.reason || '');

  if (errMsg.includes('SubjectHasNoActiveIdentity')) {
    return 'Subject Has No Identity: The recipient address has not registered an active identity on-chain yet. Please register in the Identity Holder tab first.';
  }
  if (errMsg.includes('UnauthorizedIssuer')) {
    return 'Unauthorized Issuer: The connected wallet is not authorized to issue this claim type.';
  }
  if (errMsg.includes('AccessControlUnauthorizedAccount')) {
    return 'Access Denied: The connected wallet is not the Admin/Issuer Manager.';
  }
  if (errMsg.includes('IssuerAlreadyExists')) return 'This issuer address is already registered in IssuerRegistry.';
  if (errMsg.includes('IssuerDoesNotExist')) return 'Issuer is not registered in IssuerRegistry.';
  if (errMsg.includes('ClaimTypeAlreadyAuthorized')) return 'This claim type is already authorized for this issuer.';
  if (errMsg.includes('ClaimTypeNotAuthorized')) return 'This claim type is not currently authorized for this issuer.';
  if (errMsg.includes('IdentityAlreadyExists')) return 'Identity already registered for this address.';
  if (errMsg.includes('IdentityNotFound')) return 'Identity record not found.';
  if (errMsg.includes('IdentityInactive')) return 'Identity is currently deactivated.';
  if (errMsg.includes('IdentityVerificationFailed')) return 'Transaction reverted: Wallet fails required KYC credential verification.';
  if (errMsg.includes('ClaimAlreadyRevoked')) return 'Claim has already been revoked.';
  if (errMsg.includes('ClaimNotFound')) return 'Claim not found for this subject and claim type.';
  if (errMsg.includes('ZeroAddress')) return 'Invalid zero address provided.';
  if (errMsg.includes('EmptyName')) return 'Organization name cannot be empty.';

  if (error?.reason) return error.reason;
  if (error?.shortMessage) return error.shortMessage;
  if (error?.info?.error?.message) return error.info.error.message;
  if (error?.message) return error.message.slice(0, 160);
  return 'Transaction failed or rejected.';
}

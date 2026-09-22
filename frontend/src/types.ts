export interface IdentityRecord {
  exists: boolean;
  owner: string;
  createdAt: bigint;
  updatedAt: bigint;
  metadataURI: string;
  metadataHash: string;
  active: boolean;
}

export interface ClaimRecord {
  claimHash: string;
  issuer: string;
  issuedAt: bigint;
  expiresAt: bigint;
  revoked: boolean;
}

export interface ClaimVerificationResult {
  valid: boolean;
  issuer: string;
  issuerName?: string;
  claimHash: string;
  expiresAt: bigint;
}

export type PortalTab = 'admin' | 'issuer' | 'user' | 'verifier' | 'defi';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  txHash?: string;
}

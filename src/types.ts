export type Role = 'Admin' | 'Legal Reviewer' | 'Client';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface Contract {
  id: string;
  name: string;
  uploadDate: string;
  status: 'Pending' | 'Compliant' | 'Non-Compliant' | 'Warning';
  riskScore: number;
  hash: string;
  txId?: string;
  fileSize: string;
}

export interface BlockchainRecord {
  hash: string;
  txId: string;
  blockNumber: number;
  timestamp: string;
  status: 'Pending' | 'Confirmed' | 'Failed' | 'Local only' | 'Not registered';
  contractAddress: string;
  explorerUrl: string;
}

// MetaMask Provider Types
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface ComplianceIssue {
  clause: string;
  status: 'Missing' | 'Risk' | 'Compliant';
  description: string;
  recommendation: string;
}

export interface RegulatoryUpdate {
  id: string;
  title: string;
  date: string;
  summary: string;
  impact: 'High' | 'Medium' | 'Low';
}

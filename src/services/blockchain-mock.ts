// Mock Blockchain Service - No MetaMask Required
import { BLOCKCHAIN_CONFIG } from '../config/blockchain.config';

interface MockTransaction {
  hash: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: number;
  blockNumber: number;
}

class MockBlockchainService {
  private static instance: MockBlockchainService;
  private transactions: Map<string, MockTransaction> = new Map();
  private contractRecords: Map<string, { ipfsHash: string; timestamp: number; uploader: string }> = new Map();

  static getInstance(): MockBlockchainService {
    if (!MockBlockchainService.instance) {
      MockBlockchainService.instance = new MockBlockchainService();
    }
    return MockBlockchainService.instance;
  }

  // Simulate wallet connection
  async connectWallet(): Promise<{ address: string; network: string }> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      address: '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      network: BLOCKCHAIN_CONFIG.network.name
    };
  }

  // Generate mock transaction hash
  generateTxHash(): string {
    return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  // Simulate contract hash generation
  generateContractHash(fileContent: string): string {
    // Simple hash simulation
    let hash = 0;
    for (let i = 0; i < fileContent.length; i++) {
      const char = fileContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }

  // Store contract record (simulated)
  async storeContractHash(contractHash: string, ipfsHash: string): Promise<string> {
    const txHash = this.generateTxHash();
    const timestamp = Date.now();
    
    // Store the record
    this.contractRecords.set(contractHash, {
      ipfsHash,
      timestamp,
      uploader: '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')
    });

    // Store transaction
    this.transactions.set(txHash, {
      hash: txHash,
      status: 'success',
      timestamp,
      blockNumber: Math.floor(Math.random() * 1000000) + 4000000
    });

    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return txHash;
  }

  // Check if contract is registered
  isContractRegistered(contractHash: string): boolean {
    return this.contractRecords.has(contractHash);
  }

  // Get contract record
  getContractRecord(contractHash: string) {
    return this.contractRecords.get(contractHash);
  }

  // Get transaction details
  getTransaction(txHash: string) {
    return this.transactions.get(txHash);
  }

  // Generate explorer URL
  getExplorerUrl(txHash: string): string {
    return `${BLOCKCHAIN_CONFIG.network.explorerUrl}/tx/${txHash}`;
  }
}

export const mockBlockchain = MockBlockchainService.getInstance();

// Generate explorer URL
export const getExplorerUrl = (txHash: string): string => {
  return `${BLOCKCHAIN_CONFIG.network.explorerUrl}/tx/${txHash}`;
};

// Export functions that match the original blockchain service interface
export const connectWallet = () => mockBlockchain.connectWallet();
export const generateContractHash = (content: string) => mockBlockchain.generateContractHash(content);
export const submitToBlockchain = async (contractHash: string, ipfsHash: string) => {
  const txHash = await mockBlockchain.storeContractHash(contractHash, ipfsHash);
  return {
    hash: txHash,
    blockNumber: Math.floor(Math.random() * 1000000) + 4000000,
    gasUsed: Math.floor(Math.random() * 100000) + 50000
  };
};
export const isBlockchainRegistrationAvailable = () => true; // Always true for mock
export const verifyOnBlockchain = async (contractHash: string) => mockBlockchain.isContractRegistered(contractHash);
export const getValidatedContractAddress = () => '0x0000000000000000000000000000000000000000';

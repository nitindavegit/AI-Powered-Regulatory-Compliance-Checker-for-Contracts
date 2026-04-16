import { ethers, BrowserProvider, Contract, JsonRpcProvider, TransactionReceipt } from 'ethers';
import {
  BLOCKCHAIN_CONFIG,
  getConfiguredContractAddress,
  getConfiguredExplorerTxUrl,
  isMockBlockchainEnabled,
} from '../config/blockchain.config';

// Import mock service for zero-address configuration
import * as mockBlockchain from './blockchain-mock';

// Types
export interface WalletConnection {
  address: string;
  signer: ethers.Signer;
  provider: BrowserProvider;
  isConnected: boolean;
}

export interface BlockchainResult {
  txId: string;
  blockNumber: number;
  timestamp: string;
  status: 'Pending' | 'Confirmed' | 'Failed' | 'Local only';
  contractAddress: string;
  explorerUrl: string;
}

let walletConnection: WalletConnection | null = null;
const LOCAL_RPC_PREFIXES = ['http://127.0.0.1', 'http://localhost'];

const isLocalRpc = () =>
  LOCAL_RPC_PREFIXES.some((prefix) => BLOCKCHAIN_CONFIG.network.rpcUrl.startsWith(prefix));

const ensureRpcAvailable = async () => {
  if (!isLocalRpc()) {
    return;
  }

  try {
    const response = await fetch(BLOCKCHAIN_CONFIG.network.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error('RPC health check failed');
    }
  } catch {
    throw new Error(
      'The local blockchain RPC is offline. Start `start-chain.cmd`, refresh MetaMask on Localhost, and try again.'
    );
  }
};

const getDirectRpcProvider = () =>
  isLocalRpc() ? new JsonRpcProvider(BLOCKCHAIN_CONFIG.network.rpcUrl) : null;

const waitForReceipt = async (txHash: string): Promise<TransactionReceipt> => {
  const directProvider = getDirectRpcProvider();
  if (directProvider) {
    const receipt = await directProvider.waitForTransaction(txHash, 1, 30_000);
    if (!receipt) {
      throw new Error('Timed out waiting for the local blockchain confirmation.');
    }
    return receipt;
  }

  if (!walletConnection) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  const receipt = await walletConnection.provider.waitForTransaction(txHash, 1, 30_000);
  if (!receipt) {
    throw new Error('Timed out waiting for blockchain confirmation.');
  }
  return receipt;
};

const getValidatedContractAddress = (): string | null => {
  if (isMockBlockchainEnabled()) {
    return ethers.ZeroAddress;
  }

  const address = getConfiguredContractAddress()?.trim();
  if (!address) return null;

  try {
    const normalized = ethers.getAddress(address);
    return normalized;
  } catch {
    return null;
  }
};

export const isBlockchainRegistrationAvailable = (): boolean => {
  const address = getValidatedContractAddress();
  if (address === ethers.ZeroAddress) {
    return true;
  }
  return Boolean(address);
};

/**
 * Generate keccak256 hash of contract file
 */
export const generateContractHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hash = ethers.keccak256(new Uint8Array(buffer));
  return hash;
};

/**
 * Connect to the configured blockchain provider.
 * In mock mode this returns a simulated wallet-like identity.
 */
export const connectWallet = async (): Promise<WalletConnection> => {
  try {
    const address = getValidatedContractAddress();
    if (address === ethers.ZeroAddress) {
      const mockConnection = await mockBlockchain.connectWallet();
      walletConnection = {
        address: mockConnection.address,
        signer: null as any, // Mock signer
        provider: null as any, // Mock provider
        isConnected: true
      };
      return walletConnection;
    }

    await ensureRpcAvailable();

    if (!window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask to use blockchain features.');
    }

    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please connect your wallet.');
    }

    const currentChainIdHex = await window.ethereum.request({
      method: 'eth_chainId',
    });

    if (Number.parseInt(currentChainIdHex, 16) !== BLOCKCHAIN_CONFIG.network.chainId) {
      await switchNetwork();
    }

    // Create provider and signer after the network is confirmed.
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    walletConnection = {
      address: accounts[0],
      signer,
      provider,
      isConnected: true,
    };

    return walletConnection;
  } catch (error) {
    console.error('Wallet connection failed:', error);
    throw error;
  }
};

/**
 * Switch to the configured blockchain network
 */
export const switchNetwork = async () => {
  try {
    await window.ethereum?.request({
      method: 'wallet_switchEthereumChain',
      params: [
        {
          chainId: `0x${BLOCKCHAIN_CONFIG.network.chainId.toString(16)}`,
        },
      ],
    });
  } catch (switchError: any) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      const addChainParams: Record<string, unknown> = {
        chainId: `0x${BLOCKCHAIN_CONFIG.network.chainId.toString(16)}`,
        chainName: BLOCKCHAIN_CONFIG.network.name,
        rpcUrls: [BLOCKCHAIN_CONFIG.network.rpcUrl],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      };

      if (BLOCKCHAIN_CONFIG.network.explorerUrl) {
        addChainParams.blockExplorerUrls = [BLOCKCHAIN_CONFIG.network.explorerUrl];
      }

      await window.ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [addChainParams],
      });
    }
  }
};

/**
 * Disconnect wallet
 */
export const disconnectWallet = () => {
  walletConnection = null;
};

/**
 * Get current wallet connection
 */
export const getWalletConnection = (): WalletConnection | null => {
  return walletConnection;
};

/**
 * Submit contract hash to blockchain
 */
export const submitToBlockchain = async (
  contractHash: string,
  ipfsHash: string = ''
): Promise<BlockchainResult> => {
  try {
    // Check if using mock blockchain (zero address)
    const address = getValidatedContractAddress();
    if (address === ethers.ZeroAddress) {
      // Use mock blockchain submission
      const mockResult = await mockBlockchain.submitToBlockchain(contractHash, ipfsHash);
      return {
        txId: mockResult.hash,
        blockNumber: mockResult.blockNumber,
        timestamp: new Date().toISOString(),
        status: 'Confirmed' as const,
        contractAddress: address,
        explorerUrl: mockBlockchain.getExplorerUrl(mockResult.hash)
      };
    }

    await ensureRpcAvailable();

    if (!walletConnection) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    if (!address) {
      throw new Error(
        `Blockchain registration is not configured. Add VITE_CONTRACT_ADDRESS to enable ${BLOCKCHAIN_CONFIG.network.name} submission.`
      );
    }

    const { signer } = walletConnection;

    // Create contract instance
    const contract = new Contract(
      address,
      BLOCKCHAIN_CONFIG.contract.abi,
      signer
    );

    // Send transaction
    console.log('Submitting to blockchain...', { contractHash, ipfsHash });
    const tx = await contract.storeContractHash(contractHash, ipfsHash);

    const receipt = await waitForReceipt(tx.hash);

    if (!receipt) {
      throw new Error('Transaction failed');
    }

    const explorerUrl = getConfiguredExplorerTxUrl(receipt.hash);

    return {
      txId: receipt.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString(),
      status: 'Confirmed',
      contractAddress: address,
      explorerUrl,
    };
  } catch (error) {
    console.error('Blockchain submission failed:', error);
    throw error;
  }
};

/**
 * Verify contract on blockchain
 */
export const verifyOnBlockchain = async (contractHash: string): Promise<boolean> => {
  try {
    const contractAddress = getValidatedContractAddress();
    if (contractAddress === ethers.ZeroAddress) {
      return mockBlockchain.verifyOnBlockchain(contractHash);
    }

    if (!contractAddress || !window.ethereum) {
      return false;
    }

    const provider = new BrowserProvider(window.ethereum);
    const contract = new Contract(
      contractAddress,
      BLOCKCHAIN_CONFIG.contract.abi,
      provider
    );

    const result = await contract.isContractRegistered(contractHash);
    return result;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
};

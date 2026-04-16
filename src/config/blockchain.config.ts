export const BLOCKCHAIN_CONFIG = {
  network: {
    chainId: Number(import.meta.env.VITE_CHAIN_ID || 11155111),
    name: import.meta.env.VITE_NETWORK_NAME || 'Sepolia',
    rpcUrl: import.meta.env.VITE_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    explorerUrl: import.meta.env.VITE_EXPLORER_URL || 'https://sepolia.etherscan.io',
  },
  contract: {
    address: import.meta.env.VITE_CONTRACT_ADDRESS || '',
    abi: [
      {
        inputs: [
          { internalType: 'string', name: '_contractHash', type: 'string' },
          { internalType: 'string', name: '_ipfsHash', type: 'string' },
        ],
        name: 'storeContractHash',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [{ internalType: 'string', name: '_contractHash', type: 'string' }],
        name: 'getContractRecord',
        outputs: [
          { internalType: 'string', name: 'ipfsHash', type: 'string' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'address', name: 'uploader', type: 'address' },
          { internalType: 'bool', name: 'exists', type: 'bool' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [{ internalType: 'string', name: '_contractHash', type: 'string' }],
        name: 'isContractRegistered',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
  },
};

export const getRpcUrl = () => {
  return import.meta.env.VITE_RPC_URL || BLOCKCHAIN_CONFIG.network.rpcUrl;
};

export const getConfiguredContractAddress = () => BLOCKCHAIN_CONFIG.contract.address;
export const isMockBlockchainEnabled = () =>
  (getConfiguredContractAddress() || '').trim().toLowerCase() === '0x0000000000000000000000000000000000000000';
export const getConfiguredExplorerTxUrl = (txHash: string) =>
  BLOCKCHAIN_CONFIG.network.explorerUrl
    ? `${BLOCKCHAIN_CONFIG.network.explorerUrl.replace(/\/$/, '')}/tx/${txHash}`
    : '#';

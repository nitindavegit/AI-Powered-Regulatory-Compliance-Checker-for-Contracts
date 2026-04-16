# Blockchain Integration Guide - ComplyChain AI

## Overview
ComplyChain AI now has full blockchain integration using Ethereum Sepolia testnet. Contracts are stored immutably on the blockchain with keccak256 hashing.

## Quick Start

### 1. Install MetaMask
- Download MetaMask from https://metamask.io
- Create a wallet or import existing one
- Add Sepolia Testnet (automatically added by the app)

### 2. Get Testnet ETH
- Visit Sepolia faucet: https://www.sepoliafaucet.com
- Request 0.05 ETH (free)
- Wait for confirmation in MetaMask

### 3. Deploy Smart Contract

#### Option A: Using Remix IDE (Easiest)
1. Go to https://remix.ethereum.org
2. Create new file: `ContractRegistry.sol`
3. Copy contract code from `src/contracts/ContractRegistry.sol`
4. Compile (Ctrl+S)
5. Select Injected Provider (MetaMask)
6. Deploy contract
7. Copy deployed contract address

#### Option B: Using Hardhat (Advanced)
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Copy ContractRegistry.sol to contracts/ folder
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. Update Configuration
1. Copy deployed contract address
2. Open `src/config/blockchain.config.ts`
3. Replace `0x0000000000000000000000000000000000000000` with your address:
```typescript
  contract: {
    address: '0xYOUR_CONTRACT_ADDRESS_HERE',
    // ... rest of config
  }
```

### 5. Setup Infura RPC (Optional but Recommended)
1. Go to https://infura.io
2. Create free account
3. Create new project
4. Copy Sepolia RPC URL
5. Update `.env.local`:
```
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

## Usage

### Connect Wallet
1. Click "Connect Wallet" button on Upload page
2. Approve connection in MetaMask
3. Select Sepolia network if prompted

### Upload Contract
1. Drop contract file (PDF, DOCX, TXT)
2. Start Analysis
3. Approve transaction in MetaMask
4. Wait for confirmation (~15-30 seconds)
5. View results with blockchain verification

### Verify On-Chain
- All submitted contracts are immutably stored
- Transaction link provided in Analysis page
- Verify on Etherscan: https://sepolia.etherscan.io

## Cost
- **FREE** on Sepolia Testnet (test network)
- Mainnet deployment costs ~$0.50-$5 per transaction (depends on gas)

## Smart Contract Functions

### storeContractHash(string memory _contractHash, string memory _ipfsHash)
Stores a contract hash with optional IPFS reference
- **Access**: Public
- **Gas**: ~50,000 units
- **Cost**: Free on testnet

### getContractRecord(string memory _contractHash)
Retrieves stored contract record
- **Access**: Public (read-only)
- **Returns**: ipfsHash, timestamp, uploader, exists

### isContractRegistered(string memory _contractHash)
Check if contract is registered
- **Access**: Public (read-only)
- **Returns**: boolean

## Troubleshooting

### "MetaMask not installed"
- Install MetaMask extension from https://metamask.io

### "Wrong Network"
- App auto-switches to Sepolia
- If manual: Open MetaMask → Networks → Add Sepolia

### "Insufficient Balance"
- Need testnet ETH
- Get free ETH from: https://www.sepoliafaucet.com

### "Contract not found"
- Ensure contract address in `.env.local` matches deployed address
- Check Etherscan: https://sepolia.etherscan.io

### Transaction Fails
- Low gas might fail (app handles this)
- Try again or increase gas in MetaMask settings

## Architecture

```
User Browser
    ↓
React App (ethers.js)
    ↓
MetaMask (Private Key Management)
    ↓
Infura / Alchemy (RPC Provider)
    ↓
Ethereum Sepolia Testnet
    ↓
ContractRegistry Smart Contract
```

## Security Considerations

✅ **What's Secure:**
- Only hashes stored on-chain (not full documents)
- Private keys never leave your wallet (MetaMask)
- Immutable record via blockchain

⚠️ **What's Not:**
- IPFS hash could reference mutable content
- Gas costs not covered by this app
- Production: Use mainnet at your own risk

## Next Steps

1. **Production Ready**: Deploy to Ethereum Mainnet for real-world use
2. **IPFS Integration**: Store actual documents on IPFS for full decentralization
3. **Multi-Chain**: Add support for Polygon, Arbitrum, Optimism
4. **CI/CD**: Automate smart contract deployment

## Resources

- Ethereum Docs: https://ethereum.org/en/developers
- Solidity Docs: https://docs.soliditylang.org
- Ethers.js: https://docs.ethers.org
- Sepolia Testnet: https://sepolia.etherscan.io

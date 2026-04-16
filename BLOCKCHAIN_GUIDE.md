# ComplyChain AI - Blockchain Integration Guide

## What's New 🚀

ComplyChain AI now features **real blockchain integration** with Ethereum Sepolia testnet. Every contract you upload gets:

✅ **Keccak256 Hash** - Unique fingerprint of your document  
✅ **Immutable Record** - Stored forever on blockchain  
✅ **Wallet Verification** - Sign with your own Ethereum wallet  
✅ **Transaction Proof** - Public verification on Etherscan  
✅ **Zero Cost** - Free on testnet, optional mainnet deployment

---

## Architecture

```
┌─────────────────┐
│  Your Browser   │
│  + React App    │
└────────┬────────┘
         │
╔════════▼════════════════════╗
║    MetaMask Extension       ║ ← You control private keys
║  (Private Key Management)    ║
╚════════┬════════════════════╝
         │
┌────────▼────────────────────┐
│   Ethers.js Library         │
│  (Web3 Communication)        │
└────────┬────────────────────┘
         │
╔════════▼════════════════════╗
║   Infura RPC Provider       ║ ← Sepolia Testnet Gateway
║  (Blockchain Connection)     ║
╚════════┬════════════════════╝
         │
┌────────▼────────────────────────────────┐
│  Ethereum Sepolia Smart Contract        │
│  ContractRegistry (on-chain storage)    │
└─────────────────────────────────────────┘
```

---

## Quick Start (10 minutes)

### 1️⃣ Install MetaMask
- Download from https://metamask.io
- Create wallet (save seed phrase!)
- Skip initial setup screens

### 2️⃣ Get Testnet ETH
1. Open https://www.sepoliafaucet.com
2. Connect MetaMask
3. Request 0.05 ETH (free!)
4. Wait 1-2 minutes for confirmation

### 3️⃣ Deploy Smart Contract
Go to **[Remix IDE](https://remix.ethereum.org)**:

1. Create new file: `ContractRegistry.sol`
2. Copy contract code from: `src/contracts/ContractRegistry.sol`
3. Compiler settings:
   - Language: Solidity
   - Version: 0.8.19+
4. Click **Compile** (Ctrl+S)
5. Go to **Deploy & Run Transactions** tab:
   - Environment: Injected Provider - MetaMask
   - Contract: ContractRegistry
   - Click **Deploy**
6. **Approve** in MetaMask popup
7. Copy deployed address (shown in left panel)

### 4️⃣ Configure Application
Update `src/config/blockchain.config.ts`:

```typescript
contract: {
  address: '0x_PASTE_YOUR_ADDRESS_HERE_',  // ← Your deployed contract
  abi: [ ... ]  // Keep unchanged
}
```

### 5️⃣ Test It!
```bash
npm run dev
```
1. Navigate to **Upload** page  
2. Click **Connect Wallet**
3. Approve MetaMask popup
4. Select **Sepolia** network
5. Upload a contract
6. Click **Start Analysis**
7. Approve transaction
8. **See real blockchain verification!** ✅

---

## Usage

### Connect Wallet
```
[Connect Wallet] → MetaMask Popup → Select Account → Approve
```
- Only happens once per session
- Your private key never leaves MetaMask

### Upload & Verify
```
Select File → Connect Wallet → Start Analysis → Approve Tx → Done
```

**What happens:**
1. File is hashed locally (SHA-256/Keccak256)
2. Hash + your wallet verify transaction signature
3. Smart contract stores hash on-chain
4. Immutable record created forever

### View Results
- Analysis page shows real Etherscan link
- Click **View on Etherscan** to see:
  - Your wallet address
  - Transaction hash
  - Gas used
  - Contract hash stored

---

## Smart Contract Functions

### `storeContractHash(string _hash, string _ipfsHash)`
**Purpose:** Register a contract hash on blockchain  
**Who can call:** Anyone with MetaMask  
**Gas cost:** ~50,000 units (free on testnet, ~$1-5 mainnet)  
**Returns:** Event emission (no direct return)

```typescript
// Example
await contract.storeContractHash(
  "0x123abc...",  // Contract hash
  ""              // IPFS hash (optional)
);
```

### `getContractRecord(string _hash)`
**Purpose:** Look up stored contract record  
**Who can call:** Anyone (read-only)  
**Gas cost:** 0 (free)  
**Returns:** { ipfsHash, timestamp, uploader, exists }

```typescript
const record = await contract.getContractRecord("0x123abc...");
console.log(record.timestamp);  // When stored
console.log(record.uploader);   // Your wallet address
```

### `isContractRegistered(string _hash)`
**Purpose:** Check if contract exists  
**Who can call:** Anyone (read-only)  
**Gas cost:** 0 (free)  
**Returns:** boolean

```typescript
const exists = await contract.isContractRegistered("0x123abc...");
```

---

## Environment Variables

### Required
```bash
# Gemini API
VITE_GEMINI_API_KEY=your_key_here

# Optional but recommended (for better RPC performance)
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_CONTRACT_ADDRESS=0x_YOUR_DEPLOYED_ADDRESS
```

### Get Infura Key
1. Sign up: https://infura.io
2. Create new project
3. Copy Sepolia RPC URL
4. Paste in `.env.local`

---

## Troubleshooting

### "Wallet not found"
**Solution:** Install MetaMask from https://metamask.io

### "Wrong network"
**Solution:** App auto-switches to Sepolia. If manual:
1. Open MetaMask
2. Networks → Add Network
3. Enter:
   - Name: Sepolia
   - RPC: https://sepolia.infura.io/v3/YOUR_KEY
   - Chain ID: 11155111
   - Currency: ETH

### "Insufficient balance"
**Solution:** Get free testnet ETH
1. Open https://www.sepoliafaucet.com
2. Connect MetaMask
3. Request 0.05 ETH
4. Usually instant, sometimes takes 5 mins

### "Transaction failed"
**Causes & Solutions:**
- ❌ Insufficient gas → ✅ Usually auto-calculated, try again
- ❌ Wrong contract address → ✅ Verify address in config
- ❌ Network mismatch → ✅ Switch to Sepolia
- ❌ Gas price too low → ✅ Increase gas estimate in MetaMask

### Contract address not found
1. Verify you deployed correctly in Remix
2. Copy exact address (without checksums)
3. Check address on Etherscan: https://sepolia.etherscan.io
4. Update `blockchain.config.ts`

---

## Gas Costs Comparison

| Network | Cost per Tx | Best for |
|---------|-----------|----------|
| **Sepolia** | 🆓 FREE | Development/Testing ✓ |
| **Mainnet** | $1-5 | Production (real stakes) |
| **Polygon** | $0.01-0.1 | Production (cheaper) |

---

## Production Deployment

### Option 1: Mainnet (Real Ethereum)
```typescript
// Requires:
1. Real ETH (not testnet)
2. Deployed contract on mainnet
3. Production Infura key
4. Update blockchain.config.ts
```

### Option 2: Polygon (Cheaper)
```typescript
// Advantages:
- 99% cheaper than mainnet
- Same EVM compatibility
- Popular for production DApps
```

### Option 3: Testnet (Current Setup)
- ✅ Free testing
- ✅ Same functionality
- ✅ No real funds needed
- ❌ Data eventually cleared
- ❌ Not for real stakes

---

## File Structure

```
src/
├── services/blockchain.ts          ← Core blockchain functions
├── config/blockchain.config.ts     ← Network & contract config
├── contracts/ContractRegistry.sol  ← Smart contract code
├── types/ethereum.d.ts             ← Web3 type definitions
└── pages/Upload.tsx                ← UI wallet connection
```

---

## Key Functions Reference

### Connection
```typescript
import { 
  connectWallet,      // Connect MetaMask
  disconnectWallet,   // Disconnect
  getWalletConnection // Check status
} from './services/blockchain';

// Connect
const wallet = await connectWallet();
console.log(wallet.address);  // "0x123..."

// Get status
const current = getWalletConnection();
if (current?.isConnected) { /* ... */ }
```

### Hashing
```typescript
import { generateContractHash } from './services/blockchain';

const file = document.querySelector('input[type="file"]').files[0];
const hash = await generateContractHash(file);
// Returns: "0xab23cd..."
```

### Blockchain
```typescript
import { 
  submitToBlockchain,   // Store hash
  verifyOnBlockchain    // Check if exists
} from './services/blockchain';

// Submit
const result = await submitToBlockchain(hash);
console.log(result.txId);          // Transaction hash
console.log(result.explorerUrl);   // Etherscan link

// Verify
const verified = await verifyOnBlockchain(hash);
```

---

## Security Best Practices

### ✅ DO
- ✓ Keep MetaMask seed phrase safe
- ✓ Never share private keys
- ✓ Review transactions before signing
- ✓ Use testnet for development
- ✓ Test with small amounts first

### ❌ DON'T
- ✗ Share seed phrase
- ✗ Approve untrusted contracts
- ✗ Click links from emails
- ✗ Use mainnet for testing
- ✗ Leave large amounts in wallets

---

## Support & Resources

### Official Docs
- [Ethers.js Documentation](https://docs.ethers.org)
- [Solidity Docs](https://docs.soliditylang.org)
- [MetaMask Docs](https://docs.metamask.io)
- [Ethereum Dev Docs](https://ethereum.org/en/developers)

### Testnet Resources
- [Sepolia Faucet](https://www.sepoliafaucet.com)
- [Etherscan Sepolia](https://sepolia.etherscan.io)
- [Infura](https://infura.io)

### Learning
- [Web3 Fundamentals](https://ethereum.org/en)
- [Smart Contract Security](https://consensys.github.io/smart-contract-best-practices)
- [Gas Optimization](https://medium.com/coinmonks/gas-optimization-in-solidity)

---

## Next Steps

1. **Test on Testnet** - Deploy & verify contracts (you're here)
2. **Add IPFS** - Store full documents decentralized
3. **Multi-Chain** - Support Polygon, Arbitrum, Optimism
4. **DAO Governance** - Token holders approve contracts
5. **Mainnet** - Deploy to real Ethereum with real stakes

---

**Happy blockchain building! 🚀**

Questions? Check out the [Ethereum Developer Discord](https://discord.gg/InmSFdz5pd)

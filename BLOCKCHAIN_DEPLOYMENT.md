# Setup Instructions for Blockchain Integration

## Prerequisites
1. MetaMask installed (https://metamask.io)
2. Sepolia testnet ETH (free from faucet)
3. Smart contract deployed

## Step 1: Deploy Smart Contract

### Quick Deploy (Recommended - 5 minutes)
1. Open https://remix.ethereum.org
2. Click "Create new file" and paste:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ContractRegistry {
    struct ContractRecord {
        string ipfsHash;
        uint256 timestamp;
        address uploader;
        bool exists;
    }

    mapping(string => ContractRecord) public contracts;
    
    event ContractStored(
        string indexed contractHash,
        string ipfsHash,
        address indexed uploader,
        uint256 timestamp
    );

    function storeContractHash(
        string memory _contractHash,
        string memory _ipfsHash
    ) public {
        require(bytes(_contractHash).length > 0, "Contract hash cannot be empty");
        require(!contracts[_contractHash].exists, "Contract already registered");

        contracts[_contractHash] = ContractRecord({
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            uploader: msg.sender,
            exists: true
        });

        emit ContractStored(_contractHash, _ipfsHash, msg.sender, block.timestamp);
    }

    function getContractRecord(string memory _contractHash)
        public
        view
        returns (
            string memory ipfsHash,
            uint256 timestamp,
            address uploader,
            bool exists
        )
    {
        ContractRecord memory record = contracts[_contractHash];
        return (record.ipfsHash, record.timestamp, record.uploader, record.exists);
    }

    function isContractRegistered(string memory _contractHash) public view returns (bool) {
        return contracts[_contractHash].exists;
    }
}
```

3. Click Compile (Ctrl+S)
4. Go to Deploy tab
5. Select "Injected Provider - MetaMask"
6. Click "Deploy"
7. Approve in MetaMask popup
8. **Copy the deployed contract address**

## Step 2: Configure Application

### Update `src/config/blockchain.config.ts`:
```typescript
contract: {
  address: '0x_YOUR_DEPLOYED_ADDRESS_HERE', // Paste your address
  abi: [ ... ] // Keep as is
}
```

### Optional: Setup Infura for better RPC
1. Create account at https://infura.io
2. Create new project
3. Copy Sepolia RPC URL
4. Update `.env.local`:
```
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
VITE_CONTRACT_ADDRESS=0x_YOUR_ADDRESS
```

## Step 3: Test the Integration

1. Start dev server: `npm run dev`
2. Go to Upload page
3. Click "Connect Wallet"
4. Approve MetaMask connection
5. Select Sepolia network (auto-prompt)
6. Upload a contract file
7. Click "Start Analysis"
8. Approve transaction in MetaMask
9. View results with real blockchain verification!

## Verification

### Check your transaction:
1. Get transaction hash from Analysis page
2. Open: https://sepolia.etherscan.io/tx/[TX_HASH]
3. See your contract hash immutably stored

### Debug Issues:

**No wallet showing?**
- Install MetaMask: https://metamask.io

**Wrong network error?**
- Add Sepolia to MetaMask manually
- Click Networks → Add Network
- Name: Sepolia
- RPC: https://sepolia.infura.io/v3/YOUR_KEY
- Chain ID: 11155111

**Transaction fails?**
- Need Sepolia ETH: https://www.sepoliafaucet.com
- Request 0.05 ETH

**Contract not found?**
- Ensure contract address in config matches deployed
- Double-check on Etherscan

## Gas Costs

| Network | Cost/Transaction |
|---------|------|
| Sepolia (Testnet) | FREE ✓ |
| Mainnet | ~$0.50-$5 |

## Support

- Ethers.js Docs: https://docs.ethers.org
- Web3: https://web3.js.readthedocs.io
- Sepolia Faucet: https://www.sepoliafaucet.com
- Etherscan: https://sepolia.etherscan.io

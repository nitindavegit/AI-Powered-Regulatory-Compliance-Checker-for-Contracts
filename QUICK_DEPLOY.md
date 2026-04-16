# Quick Contract Deployment Guide

## Option 1: Remix Deployment (Recommended - 5 minutes)

1. **Open Remix IDE**: https://remix.ethereum.org

2. **Create New Contract**:
   - Click "File Explorer" → "Create New File"
   - Name it: `ContractRegistry.sol`
   - Paste this code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ContractRegistry {
    struct ContractRecord {
        string ipfsHash;
        uint256 timestamp;
        address uploader;
        bool exists;
    }

    mapping(string => ContractRecord) private records;

    event ContractStored(
        string contractHash,
        string ipfsHash,
        address indexed uploader,
        uint256 timestamp
    );

    function storeContractHash(
        string memory contractHash,
        string memory ipfsHash
    ) external {
        require(bytes(contractHash).length > 0, "Contract hash cannot be empty");
        require(!records[contractHash].exists, "Contract already registered");

        records[contractHash] = ContractRegistry({
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            uploader: msg.sender,
            exists: true
        });

        emit ContractStored(contractHash, ipfsHash, msg.sender, block.timestamp);
    }

    function getContractRecord(
        string memory contractHash
    )
        external
        view
        returns (string memory ipfsHash, uint256 timestamp, address uploader, bool exists)
    {
        ContractRecord memory record = records[contractHash];
        return (record.ipfsHash, record.timestamp, record.uploader, record.exists);
    }

    function isContractRegistered(string memory contractHash) external view returns (bool) {
        return records[contractHash].exists;
    }
}
```

3. **Compile**:
   - Go to "Solidity Compiler" tab
   - Select compiler version: 0.8.24 or higher
   - Click "Compile ContractRegistry.sol"

4. **Deploy to Sepolia**:
   - Go to "Deploy & Run Transactions" tab
   - Environment: "Injected Provider - MetaMask"
   - Make sure MetaMask is connected to Sepolia network
   - Click "Deploy"
   - Approve transaction in MetaMask

5. **Copy Contract Address**:
   - After deployment, scroll down in Remix
   - Find "Deployed Contracts" section
   - Copy the contract address (starts with 0x...)

6. **Update Your Project**:
   Create a `.env` file in your project root with:
   ```
   VITE_CONTRACT_ADDRESS=0x_YOUR_COPIED_ADDRESS_HERE
   ```

7. **Restart Your App**:
   ```bash
   npm run dev
   ```

## Option 2: Get Sepolia Test ETH

If you need test ETH for deployment:
1. Go to: https://www.sepoliafaucet.com
2. Enter your wallet address
3. Request 0.05 ETH
4. Wait for confirmation

## Verification

After deployment, your blockchain feature should be enabled! The warning message will disappear and you can:
- Connect wallet
- Upload contracts
- Store them on blockchain
- Verify transactions on Etherscan

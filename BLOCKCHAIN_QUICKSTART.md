# Blockchain Integration - Quick Checklist ✅

Complete these steps to enable real blockchain functionality:

## 1. Wallet Setup (5 min)
- [ ] Install MetaMask from https://metamask.io
- [ ] Create or import wallet
- [ ] Save seed phrase securely
- [ ] Add Sepolia network to MetaMask

## 2. Get Testnet ETH (2 min)
- [ ] Visit https://www.sepoliafaucet.com
- [ ] Connect MetaMask
- [ ] Request 0.05 ETH
- [ ] Wait for confirmation in MetaMask

## 3. Deploy Smart Contract (5 min)
- [ ] Open https://remix.ethereum.org
- [ ] Create new file: `ContractRegistry.sol`
- [ ] Copy code from: `src/contracts/ContractRegistry.sol`
- [ ] Click **Compile** (Ctrl+S)
- [ ] Go to **Deploy** tab
- [ ] Select **Injected Provider - MetaMask**
- [ ] Click **Deploy**
- [ ] Approve transaction in MetaMask
- [ ] **Copy deployed contract address** ← Important!

## 4. Configure App
- [ ] Open `src/config/blockchain.config.ts`
- [ ] Find line: `address: '0x0000000000000000000000000000000000000000'`
- [ ] Replace with your deployed address:
  ```typescript
  address: '0x_YOUR_ADDRESS_HERE'
  ```
- [ ] Save file

## 5. Optional: Setup Infura (for production)
- [ ] Create account at https://infura.io
- [ ] Create new project
- [ ] Copy Sepolia RPC URL
- [ ] Open `.env.local`
- [ ] Add: `VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY`

## 6. Test It!
- [ ] Run `npm run dev`
- [ ] Go to Upload page
- [ ] Click **Connect Wallet**
- [ ] Approve MetaMask popup
- [ ] Select **Sepolia** network (if prompted)
- [ ] Upload a test file
- [ ] Click **Start Analysis**
- [ ] Approve transaction in MetaMask
- [ ] Wait for confirmation (~30 sec)
- [ ] See real blockchain verification! ✅

## 7. Verify Success
- [ ] Analysis page shows transaction ID
- [ ] Click **View on Etherscan** link
- [ ] See your contract hash stored on-chain!

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Wallet not found" | Install MetaMask |
| "Wrong network" | MetaMask auto-switches to Sepolia |
| "Insufficient balance" | Get free ETH from faucet |
| "Contract not found" | Check address matches deployed |
| "Transaction fails" | Have enough Sepolia ETH, increase gas |

---

## Important Notes

⚠️ **Save your deployed contract address** - You'll need it!

🔒 **Never share:** Seed phrase, Private key, Infura secret key

💰 **Cost:** FREE on Sepolia testnet

📝 **Setup time:** ~15 minutes total

---

## Support
- Remix IDE Help: https://remix-ide.readthedocs.io
- MetaMask Support: https://support.metamask.io
- Etherscan: https://sepolia.etherscan.io
- Ethereum Dev Docs: https://ethereum.org/en/developers

---

**You're all set! Start uploading contracts with real blockchain verification! 🚀**

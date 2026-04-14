# Deploy DroEscrowFactory to Celo Sepolia

## Option 1: Remix IDE (Easiest)

1. Go to https://remix.ethereum.org
2. Create a new file `DroEscrowFactory.sol` and paste the contract code
3. In the Solidity compiler tab:
   - Compiler: 0.8.22
   - Enable optimization (200 runs)
4. Install OpenZeppelin via Remix plugin manager, or use imports from:
   ```
   @openzeppelin/contracts@5.1.0
   ```
5. Compile the contract
6. In Deploy tab:
   - Environment: "Injected Provider - MetaMask"
   - Make sure MetaMask is on Celo Sepolia (Chain ID: 84532)
   - Constructor args:
     - `_treasury`: Your treasury wallet address (where released funds go)
     - `_protocolFeeBps`: `100` (1% fee)
   - Click Deploy
7. Copy the deployed contract address
8. Update `/src/lib/contracts/addresses.ts`:
   ```
   export const ESCROW_FACTORY_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS";
   ```
9. Also update `TREASURY_ADDRESS` with your treasury wallet

## Option 2: Hardhat

```bash
cd contracts
npm init -y
npm install hardhat @openzeppelin/contracts @nomicfoundation/hardhat-toolbox
npx hardhat init
```

Create `hardhat.config.js`:
```js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.22",
  networks: {
    "celo-sepolia": {
      url: "https://sepolia.celo.org",
      accounts: ["YOUR_PRIVATE_KEY"],
      chainId: 84532,
    },
  },
};
```

Deploy script `scripts/deploy.js`:
```js
const { ethers } = require("hardhat");

async function main() {
  const treasury = "YOUR_TREASURY_ADDRESS";
  const feeBps = 100; // 1%

  const Factory = await ethers.getContractFactory("DroEscrowFactory");
  const factory = await Factory.deploy(treasury, feeBps);
  await factory.waitForDeployment();

  console.log("DroEscrowFactory deployed to:", await factory.getAddress());
}

main().catch(console.error);
```

```bash
npx hardhat run scripts/deploy.js --network celo-sepolia
```

## Getting Testnet CELO

Get test CELO from: https://faucet.celo.org/sepolia

## Verify Contract

After deployment, verify on Celoscan:
```
https://celo-sepolia.blockscout.com/address/YOUR_ADDRESS
```

## Contract Functions

| Function | Who Calls | When |
|----------|-----------|------|
| `createEscrow(orderId, buyer, token, amount, deadline)` | Platform (owner) | Order placed |
| `fundEscrow(escrowId)` | Buyer | After approving token |
| `releaseEscrow(escrowId)` | Platform (owner) | Delivery confirmed |
| `refundEscrow(escrowId)` | Platform (owner) | Manual refund |
| `disputeEscrow(escrowId)` | Buyer | Issue reported |
| `autoRefund(escrowId)` | Anyone | After deadline passes |
| `resolveDispute(escrowId, releaseToTreasury)` | Platform (owner) | Dispute resolved |

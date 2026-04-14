import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "CELO");

  if (balance === 0n) {
    console.error("ERROR: No CELO balance. Get test CELO from https://faucet.celo.org/sepolia");
    process.exit(1);
  }

  // Treasury = deployer for now (can be changed later via setTreasury)
  const treasury = deployer.address;
  const feeBps = 100; // 1%

  console.log("Deploying DroEscrowFactory...");
  console.log("  Treasury:", treasury);
  console.log("  Protocol fee:", feeBps, "bps (1%)");

  const Factory = await ethers.getContractFactory("DroEscrowFactory");
  const factory = await Factory.deploy(treasury, feeBps);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("\n✓ DroEscrowFactory deployed to:", address);
  console.log("  Explorer: https://celo-sepolia.blockscout.com/address/" + address);
  console.log("\nUpdate src/lib/contracts/addresses.ts:");
  console.log(`  export const ESCROW_FACTORY_ADDRESS = "${address}";`);
  console.log(`  export const TREASURY_ADDRESS = "${treasury}";`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

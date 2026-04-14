import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC = "https://rpc.ankr.com/celo_sepolia";
const PK = process.env.DEPLOYER_PRIVATE_KEY;
if (!PK) { console.error("Set DEPLOYER_PRIVATE_KEY"); process.exit(1); }

// Read contract source
const contractPath = path.join(__dirname, "DroEscrowFactory.sol");
const source = fs.readFileSync(contractPath, "utf8");

// Compile with solc
function compile() {
  const input = {
    language: "Solidity",
    sources: {
      "DroEscrowFactory.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };

  // Resolve OpenZeppelin imports
  function findImports(importPath) {
    const candidates = [
      path.join(__dirname, "node_modules", importPath),
      path.join(__dirname, "..", "node_modules", importPath),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return { contents: fs.readFileSync(p, "utf8") };
      }
    }
    return { error: `File not found: ${importPath}` };
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:");
      errors.forEach((e) => console.error(e.formattedMessage));
      process.exit(1);
    }
    // Print warnings
    output.errors.filter((e) => e.severity === "warning").forEach((e) => console.warn(e.formattedMessage));
  }

  const contract = output.contracts["DroEscrowFactory.sol"]["DroEscrowFactory"];
  return {
    abi: contract.abi,
    bytecode: "0x" + contract.evm.bytecode.object,
  };
}

async function main() {
  console.log("Compiling DroEscrowFactory.sol...");
  const { abi, bytecode } = compile();
  console.log("✓ Compiled. Bytecode size:", Math.round(bytecode.length / 2), "bytes");

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  console.log("Deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "CELO");

  if (balance === 0n) {
    console.error("\n✗ No CELO balance!");
    console.error("Get test CELO from: https://faucet.celo.org/sepolia");
    console.error("Wallet address:", wallet.address);
    process.exit(1);
  }

  // Treasury = deployer, fee = 1% (100 bps)
  const treasury = wallet.address;
  const feeBps = 100;

  console.log("\nDeploying...");
  console.log("  Treasury:", treasury);
  console.log("  Fee: 1% (100 bps)");

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(treasury, feeBps);
  console.log("  Tx hash:", contract.deploymentTransaction().hash);
  console.log("  Waiting for confirmation...");

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n═══════════════════════════════════════════");
  console.log("✓ DroEscrowFactory deployed!");
  console.log("  Address:", address);
  console.log("  Explorer: https://celo-sepolia.blockscout.com/address/" + address);
  console.log("═══════════════════════════════════════════");
  console.log("\nUpdate src/lib/contracts/addresses.ts:");
  console.log(`  ESCROW_FACTORY_ADDRESS = "${address}"`);
  console.log(`  TREASURY_ADDRESS = "${treasury}"`);

  // Save ABI
  fs.writeFileSync(path.join(__dirname, "DroEscrowFactory.abi.json"), JSON.stringify(abi, null, 2));
  console.log("\nABI saved to contracts/DroEscrowFactory.abi.json");
}

main().catch((err) => {
  console.error("Deploy failed:", err.message || err);
  process.exit(1);
});

import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = "https://rpc.ankr.com/celo_sepolia";
const PK = process.env.DEPLOYER_PRIVATE_KEY;

const source = fs.readFileSync(path.join(__dirname, "MockUSDC.sol"), "utf8");

function compile() {
  const input = {
    language: "Solidity",
    sources: { "MockUSDC.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };

  function findImports(importPath) {
    for (const base of [__dirname, path.join(__dirname, "..")]) {
      const p = path.join(base, "node_modules", importPath);
      if (fs.existsSync(p)) return { contents: fs.readFileSync(p, "utf8") };
    }
    return { error: `Not found: ${importPath}` };
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  const errors = (output.errors ?? []).filter((e) => e.severity === "error");
  if (errors.length) { errors.forEach((e) => console.error(e.formattedMessage)); process.exit(1); }

  const c = output.contracts["MockUSDC.sol"]["MockUSDC"];
  return { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
}

async function main() {
  console.log("Compiling MockUSDC...");
  const { abi, bytecode } = compile();

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  console.log("Deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "CELO");

  console.log("\nDeploying MockUSDC...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  console.log("  Tx:", contract.deploymentTransaction().hash);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✓ MockUSDC deployed to:", address);
  console.log("  Explorer: https://sepolia.celoscan.io/address/" + address);

  // Check deployer balance
  const usdc = new ethers.Contract(address, abi, wallet);
  const bal = await usdc.balanceOf(wallet.address);
  console.log("  Deployer USDC balance:", ethers.formatUnits(bal, 6));

  fs.writeFileSync(path.join(__dirname, "MockUSDC.abi.json"), JSON.stringify(abi, null, 2));
  console.log("\nUpdate src/lib/contracts/addresses.ts:");
  console.log(`  USDC_ADDRESS = "${address}"`);
}

main().catch((e) => { console.error(e); process.exit(1); });

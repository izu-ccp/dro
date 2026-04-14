// POST /api/faucet — Mint test USDC to a wallet address
import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet } from "ethers";

const RPC = "https://rpc.ankr.com/celo_sepolia";
const USDC_ADDRESS = "0xc5aDD550534048Ec1f5F65252653D1c744bB4Ac2";

// mint(address to, uint256 amount) selector
const MINT_SELECTOR = "0x40c10f19";

function encodeMint(to: string, amount: bigint): string {
  const addr = to.slice(2).toLowerCase().padStart(64, "0");
  const amt = amount.toString(16).padStart(64, "0");
  return MINT_SELECTOR + addr + amt;
}

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const pk = process.env.DEPLOYER_PRIVATE_KEY;
    if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");

    const provider = new JsonRpcProvider(RPC);
    const wallet = new Wallet(pk, provider);

    // Mint 1000 USDC (6 decimals)
    const amount = BigInt(1000 * 1e6);
    const data = encodeMint(address, amount);

    const tx = await wallet.sendTransaction({ to: USDC_ADDRESS, data });
    await tx.wait();

    return NextResponse.json({
      success: true,
      amount: "1000",
      token: "USDC",
      txHash: tx.hash,
      explorerUrl: `https://sepolia.celoscan.io/tx/${tx.hash}`,
    });
  } catch (error) {
    console.error("Faucet error:", error);
    return NextResponse.json({ error: "Faucet failed" }, { status: 500 });
  }
}

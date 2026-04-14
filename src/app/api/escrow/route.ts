// POST /api/escrow — Server-side escrow creation (requires deployer key)
// The DroEscrowFactory.createEscrow() is onlyOwner, so it must be called server-side
import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from "ethers";

const RPC = "https://rpc.ankr.com/celo_sepolia";
const ESCROW_FACTORY = "0xe175B28A80Cc36daE108B69172d44Feb5Ab57327";

// ABI-encode createEscrow(string,address,address,uint256,uint256)
function encodeCreateEscrow(orderId: string, buyer: string, token: string, amount: bigint, deadline: bigint): string {
  const selector = "0xb3f00674";

  const encAddr = (a: string) => a.slice(2).toLowerCase().padStart(64, "0");
  const encUint = (v: bigint) => v.toString(16).padStart(64, "0");

  // String is dynamic → offset points past 5 static params (5 * 32 = 160 = 0xa0)
  const offsetHex = encUint(BigInt(5 * 32));
  const buyerHex = encAddr(buyer);
  const tokenHex = encAddr(token);
  const amountHex = encUint(amount);
  const deadlineHex = encUint(deadline);

  // String encoding: length + padded utf8
  const strBytes = Buffer.from(orderId, "utf8");
  const lenHex = encUint(BigInt(strBytes.length));
  const dataHex = strBytes.toString("hex").padEnd(Math.ceil(strBytes.length / 32) * 64, "0");

  return selector + offsetHex + buyerHex + tokenHex + amountHex + deadlineHex + lenHex + dataHex;
}

// Sign and send transaction using deployer private key
async function sendTx(to: string, data: string): Promise<string> {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(pk, provider);

  const tx = await wallet.sendTransaction({ to, data });
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Transaction failed");
  return tx.hash;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, buyer, token, amount, deadlineDays } = body;

    if (!orderId || !buyer || !token || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const amountWei = BigInt(Math.round(amount * 1e6)); // 6 decimals
    const deadline = BigInt(Math.floor(Date.now() / 1000) + (deadlineDays ?? 14) * 86400);

    const data = encodeCreateEscrow(orderId, buyer, token, amountWei, deadline);
    const txHash = await sendTx(ESCROW_FACTORY, data);

    // Compute escrowId (keccak256 of orderId)
    const escrowId = keccak256(toUtf8Bytes(orderId));

    return NextResponse.json({
      escrowId,
      orderId,
      txHash,
      factoryAddress: ESCROW_FACTORY,
      deadline: Number(deadline),
      explorerUrl: `https://sepolia.celoscan.io/tx/${txHash}`,
    });
  } catch (error) {
    console.error("Escrow creation error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create escrow";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

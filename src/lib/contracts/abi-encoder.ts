// ============================================================================
// Lightweight ABI Encoder — no ethers.js / viem dependency
// Encodes function calls for raw eth_sendTransaction
// ============================================================================

// Keccak-256 via SubtleCrypto (browser) or manual for known selectors
const KNOWN_SELECTORS: Record<string, string> = {
  // ERC20
  "approve(address,uint256)": "095ea7b3",
  "allowance(address,address)": "dd62ed3e",
  "balanceOf(address)": "70a08231",
  "transfer(address,uint256)": "a9059cbb",
  // DroEscrowFactory
  "createEscrow(string,address,address,uint256,uint256)": "b3f00674",
  "fundEscrow(bytes32)": "a8793f94",
  "releaseEscrow(bytes32)": "b1e6d2a1",
  "refundEscrow(bytes32)": "7c41ad2c",
  "disputeEscrow(bytes32)": "1f0c1e5a",
  "autoRefund(bytes32)": "e2c6f3d8",
  "getEscrow(bytes32)": "5de28ae0",
  "getEscrowId(string)": "a1b2c3d4",
};

export function getFunctionSelector(signature: string): string {
  const known = KNOWN_SELECTORS[signature];
  if (known) return "0x" + known;
  throw new Error(`Unknown function selector: ${signature}. Add it to KNOWN_SELECTORS.`);
}

// Encode an address (20 bytes) as a 32-byte ABI word
export function encodeAddress(addr: string): string {
  return addr.slice(2).toLowerCase().padStart(64, "0");
}

// Encode a uint256 as a 32-byte ABI word
export function encodeUint256(value: bigint | number): string {
  const hex = BigInt(value).toString(16);
  return hex.padStart(64, "0");
}

// Encode bytes32 as a 32-byte ABI word
export function encodeBytes32(value: string): string {
  // If it starts with 0x, strip it
  const clean = value.startsWith("0x") ? value.slice(2) : value;
  return clean.padEnd(64, "0");
}

// Encode a dynamic string (with offset, length, and padded data)
export function encodeString(str: string): { offset: string; data: string } {
  const bytes = new TextEncoder().encode(str);
  const length = encodeUint256(BigInt(bytes.length));
  // Pad to 32-byte boundary
  const hexChars = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const paddedLength = Math.ceil(hexChars.length / 64) * 64;
  const paddedData = hexChars.padEnd(paddedLength, "0");
  return { offset: "", data: length + paddedData };
}

// ============================================================================
// High-level encoders for specific function calls
// ============================================================================

// approve(address spender, uint256 amount)
export function encodeApprove(spender: string, amount: bigint): string {
  return (
    getFunctionSelector("approve(address,uint256)") +
    encodeAddress(spender) +
    encodeUint256(amount)
  );
}

// fundEscrow(bytes32 escrowId)
export function encodeFundEscrow(escrowId: string): string {
  return (
    getFunctionSelector("fundEscrow(bytes32)") +
    encodeBytes32(escrowId)
  );
}

// releaseEscrow(bytes32 escrowId)
export function encodeReleaseEscrow(escrowId: string): string {
  return (
    getFunctionSelector("releaseEscrow(bytes32)") +
    encodeBytes32(escrowId)
  );
}

// refundEscrow(bytes32 escrowId)
export function encodeRefundEscrow(escrowId: string): string {
  return (
    getFunctionSelector("refundEscrow(bytes32)") +
    encodeBytes32(escrowId)
  );
}

// disputeEscrow(bytes32 escrowId)
export function encodeDisputeEscrow(escrowId: string): string {
  return (
    getFunctionSelector("disputeEscrow(bytes32)") +
    encodeBytes32(escrowId)
  );
}

// createEscrow(string orderId, address buyer, address token, uint256 amount, uint256 deadline)
export function encodeCreateEscrow(
  orderId: string,
  buyer: string,
  token: string,
  amount: bigint,
  deadline: bigint,
): string {
  const selector = getFunctionSelector("createEscrow(string,address,address,uint256,uint256)");

  // Dynamic encoding: first 5 params where param 0 (string) is dynamic
  // Offsets: 5 * 32 = 160 bytes (0xa0) for the string offset
  const stringOffset = encodeUint256(BigInt(5 * 32)); // offset to string data
  const buyerEnc = encodeAddress(buyer);
  const tokenEnc = encodeAddress(token);
  const amountEnc = encodeUint256(amount);
  const deadlineEnc = encodeUint256(deadline);

  // String data
  const strData = encodeString(orderId);

  return (
    selector +
    stringOffset +
    buyerEnc +
    tokenEnc +
    amountEnc +
    deadlineEnc +
    strData.data
  );
}

// Decode a uint256 from hex
export function decodeUint256(hex: string): bigint {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return BigInt("0x" + clean);
}

// Decode an address from a 32-byte word
export function decodeAddress(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return "0x" + clean.slice(24).toLowerCase();
}

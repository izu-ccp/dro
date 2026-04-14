"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  contractAddress: string | null; // null = native token
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  shortAddress: string | null;
  chain: string | null;
  chainId: number | null;
  balance: string | null; // native balance (CELO)
  tokens: TokenBalance[];
  provider: "metamask" | "walletconnect" | "coinbase" | "manual" | null;
}

interface WalletContextValue extends WalletState {
  connect: (provider?: "metamask" | "walletconnect" | "coinbase" | "manual", manualAddress?: string) => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  refreshBalances: () => Promise<void>;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  error: string | null;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Celo Config
// ---------------------------------------------------------------------------

const CELO_CHAIN_ID = 11142220; // Celo Sepolia Testnet (L2)
const CELO_RPC = "https://rpc.ankr.com/celo_sepolia";

const CHAINS: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  137: "Polygon",
  10: "Optimism",
  42220: "Celo",
  11142220: "Celo Sepolia",
};

const CELO_TOKENS: { symbol: string; address: string; decimals: number }[] = [
  { symbol: "USDC", address: "0xc5aDD550534048Ec1f5F65252653D1c744bB4Ac2", decimals: 6 },
  { symbol: "USDT", address: "0xC458e1a4eB04cD4E1Fb56B1990cB5E9d35028bb2", decimals: 6 },
];

const CELO_CHAIN_PARAMS = {
  chainId: `0x${CELO_CHAIN_ID.toString(16)}`,
  chainName: "Celo Sepolia Testnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: [CELO_RPC],
  blockExplorerUrls: ["https://sepolia.celoscan.io"],
};

// ERC-20 balanceOf(address) selector
const BALANCE_OF_SELECTOR = "0x70a08231";

function shorten(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// RPC helpers (works for both MetaMask and manual/read-only)
// ---------------------------------------------------------------------------

async function rpcCall(method: string, params: unknown[]): Promise<string> {
  const res = await fetch(CELO_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  return data.result as string;
}

async function fetchCeloBalance(address: string): Promise<string> {
  const hex = await rpcCall("eth_getBalance", [address, "latest"]);
  const wei = parseInt(hex, 16);
  return (wei / 1e18).toFixed(4);
}

async function fetchTokenBalance(address: string, tokenAddress: string, decimals: number): Promise<string> {
  const paddedAddress = "0x" + address.slice(2).padStart(64, "0");
  const data = BALANCE_OF_SELECTOR + paddedAddress.slice(2);

  const hex = await rpcCall("eth_call", [{ to: tokenAddress, data }, "latest"]);
  if (!hex || hex === "0x") return "0";
  const raw = BigInt(hex);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 2);
  return `${whole}.${fractionStr}`;
}

async function fetchAllBalances(address: string): Promise<{ native: string; tokens: TokenBalance[] }> {
  const [celoBalance, ...tokenResults] = await Promise.allSettled([
    fetchCeloBalance(address),
    ...CELO_TOKENS.map((t) => fetchTokenBalance(address, t.address, t.decimals)),
  ]);

  const native = celoBalance.status === "fulfilled" ? celoBalance.value : "0";

  const tokens: TokenBalance[] = [
    { symbol: "CELO", balance: native, decimals: 18, contractAddress: null },
    ...CELO_TOKENS.map((t, i) => ({
      symbol: t.symbol,
      balance: tokenResults[i].status === "fulfilled" ? (tokenResults[i] as PromiseFulfilledResult<string>).value : "0",
      decimals: t.decimals,
      contractAddress: t.address,
    })),
  ];

  return { native, tokens };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    shortAddress: null,
    chain: null,
    chainId: null,
    balance: null,
    tokens: [],
    provider: null,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dro_wallet");
      if (saved) {
        const parsed = JSON.parse(saved) as WalletState;
        if (parsed.connected && parsed.address) {
          setState(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist wallet state
  useEffect(() => {
    if (state.connected) {
      localStorage.setItem("dro_wallet", JSON.stringify(state));
    } else {
      localStorage.removeItem("dro_wallet");
    }
  }, [state]);

  // Fetch balances when connected
  useEffect(() => {
    if (state.connected && state.address) {
      fetchAllBalances(state.address).then(({ native, tokens }) => {
        setState((s) => ({ ...s, balance: native, tokens }));
      }).catch(() => {});
    }
  }, [state.connected, state.address, state.chainId]);

  // Listen for MetaMask account/chain changes
  useEffect(() => {
    const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: { on: (event: string, handler: (...args: unknown[]) => void) => void; removeListener: (event: string, handler: (...args: unknown[]) => void) => void } }).ethereum : undefined;
    if (!eth || state.provider !== "metamask") return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState((s) => ({
          ...s,
          address: accounts[0],
          shortAddress: shorten(accounts[0]),
        }));
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      const chainId = parseInt(chainIdHex, 16);
      setState((s) => ({
        ...s,
        chainId,
        chain: CHAINS[chainId] ?? `Chain ${chainId}`,
      }));
    };

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);

    return () => {
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
    };
  }, [state.provider]);

  // ---- Connect -----------------------------------------------------------

  const connect = useCallback(
    async (
      provider: "metamask" | "walletconnect" | "coinbase" | "manual" = "metamask",
      manualAddress?: string,
    ) => {
      setError(null);
      setLoading(true);

      try {
        if (provider === "manual") {
          if (!manualAddress || !/^0x[a-fA-F0-9]{40}$/.test(manualAddress)) {
            throw new Error("Invalid wallet address");
          }

          // Fetch Celo balances for manual address
          const { native, tokens } = await fetchAllBalances(manualAddress);

          setState({
            connected: true,
            address: manualAddress,
            shortAddress: shorten(manualAddress),
            chain: "Celo",
            chainId: CELO_CHAIN_ID,
            balance: native,
            tokens,
            provider: "manual",
          });
          setModalOpen(false);
          return;
        }

        // MetaMask / injected provider
        const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
        if (!eth) {
          throw new Error(
            provider === "metamask"
              ? "MetaMask not detected. Install it or paste your address manually."
              : `${provider} not available. Use MetaMask or paste your address.`,
          );
        }

        // Request accounts
        const accounts = (await eth.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts returned. Please unlock your wallet.");
        }

        // Try to switch to Celo
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: CELO_CHAIN_PARAMS.chainId }],
          });
        } catch {
          // If Celo not added, add it
          try {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [CELO_CHAIN_PARAMS],
            });
          } catch {
            // Continue even if chain switch fails
          }
        }

        // Get current chain
        const chainIdHex = (await eth.request({ method: "eth_chainId" })) as string;
        const chainId = parseInt(chainIdHex, 16);

        // Fetch balances via Celo RPC (works regardless of MetaMask chain)
        const { native, tokens } = await fetchAllBalances(accounts[0]);

        setState({
          connected: true,
          address: accounts[0],
          shortAddress: shorten(accounts[0]),
          chain: CHAINS[chainId] ?? `Chain ${chainId}`,
          chainId,
          balance: native,
          tokens,
          provider: provider === "coinbase" ? "coinbase" : "metamask",
        });

        setModalOpen(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ---- Disconnect --------------------------------------------------------

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      address: null,
      shortAddress: null,
      chain: null,
      chainId: null,
      balance: null,
      tokens: [],
      provider: null,
    });
    setError(null);
  }, []);

  // ---- Switch Chain ------------------------------------------------------

  const switchChain = useCallback(async (chainId: number) => {
    const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!eth) return;

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to switch chain";
      setError(msg);
    }
  }, []);

  // ---- Refresh Balances --------------------------------------------------

  const refreshBalances = useCallback(async () => {
    if (!state.address) return;
    try {
      const { native, tokens } = await fetchAllBalances(state.address);
      setState((s) => ({ ...s, balance: native, tokens }));
    } catch {
      // silent fail
    }
  }, [state.address]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        switchChain,
        refreshBalances,
        modalOpen,
        openModal: () => { setError(null); setModalOpen(true); },
        closeModal: () => setModalOpen(false),
        error,
        loading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

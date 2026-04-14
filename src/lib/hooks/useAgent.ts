"use client";

import { useState, useCallback, useRef } from "react";
import type {
  ChatResponse,
  SearchResponse,
  PurchaseResponse,
  TrackResponse,
  DisputeResponse,
  StreamEvent,
  AgentProduct,
  UserPreferences,
  ShippingAddress,
  PaymentMethod,
} from "../agents/types";

// ---------------------------------------------------------------------------
// Hook State
// ---------------------------------------------------------------------------

interface AgentState {
  loading: boolean;
  error: string | null;
  events: StreamEvent[];
  conversationId: string | null;
}

// ---------------------------------------------------------------------------
// useChat — Conversational agent interface
// ---------------------------------------------------------------------------

export function useChat() {
  const [state, setState] = useState<AgentState>({
    loading: false,
    error: null,
    events: [],
    conversationId: null,
  });
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; data?: unknown }>
  >([]);

  const conversationIdRef = useRef<string | null>(null);

  const send = useCallback(
    async (
      message: string,
      context?: { page?: string; productId?: string; orderId?: string },
      preferences?: Partial<UserPreferences>,
    ) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      setMessages((m) => [...m, { role: "user", content: message }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId: conversationIdRef.current,
            context,
            preferences,
          }),
        });

        if (!res.ok) throw new Error(`Agent error: ${res.status}`);

        const data: ChatResponse = await res.json();
        conversationIdRef.current = data.conversationId;

        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.message, data: data.data },
        ]);

        setState({
          loading: false,
          error: null,
          events: data.events,
          conversationId: data.conversationId,
        });

        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        setState((s) => ({ ...s, loading: false, error }));
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = null;
    setState({ loading: false, error: null, events: [], conversationId: null });
  }, []);

  return { ...state, messages, send, reset };
}

// ---------------------------------------------------------------------------
// useSearch — Product search
// ---------------------------------------------------------------------------

export function useSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AgentProduct[]>([]);
  const [searchMeta, setSearchMeta] = useState<{
    query: string;
    totalSources: number;
    searchTimeMs: number;
  } | null>(null);

  const search = useCallback(
    async (
      query: string,
      options?: {
        sources?: string[];
        maxResults?: number;
        sortBy?: "price_asc" | "price_desc" | "rating" | "relevance";
        filters?: {
          minPrice?: number;
          maxPrice?: number;
          tier?: ("verified" | "trusted" | "marketplace")[];
          inStock?: boolean;
        };
      },
    ) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, ...options }),
        });

        if (!res.ok) throw new Error(`Search error: ${res.status}`);

        const data: SearchResponse = await res.json();
        setResults(data.results);
        setSearchMeta({
          query: data.query,
          totalSources: data.totalSources,
          searchTimeMs: data.searchTimeMs,
        });
        setLoading(false);
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Search failed";
        setError(errorMsg);
        setLoading(false);
        return null;
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setResults([]);
    setSearchMeta(null);
    setError(null);
  }, []);

  return { loading, error, results, searchMeta, search, clear };
}

// ---------------------------------------------------------------------------
// usePurchase — Purchase flow
// ---------------------------------------------------------------------------

export function usePurchase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResponse | null>(null);

  const purchase = useCallback(
    async (params: {
      productId: string;
      source: string;
      paymentMethod: PaymentMethod;
      deliveryInfo: {
        type: "steam_trade" | "shipping";
        steamTradeUrl?: string;
        address?: ShippingAddress;
      };
      cardInfo?: { number: string; expiry: string; cvv: string };
      walletAddress?: string;
    }) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!res.ok) throw new Error(`Purchase error: ${res.status}`);

        const data: PurchaseResponse = await res.json();
        setResult(data);
        setLoading(false);
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Purchase failed";
        setError(errorMsg);
        setLoading(false);
        return null;
      }
    },
    [],
  );

  return { loading, error, result, purchase };
}

// ---------------------------------------------------------------------------
// useTracking — Order tracking
// ---------------------------------------------------------------------------

export function useTracking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackResponse["order"] | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);

  const track = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) throw new Error(`Tracking error: ${res.status}`);

      const data: TrackResponse = await res.json();
      setOrder(data.order);
      setEvents(data.events);
      setLoading(false);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Tracking failed";
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  }, []);

  return { loading, error, order, events, track };
}

// ---------------------------------------------------------------------------
// useDispute — Dispute management
// ---------------------------------------------------------------------------

export function useDispute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dispute, setDispute] = useState<DisputeResponse["dispute"] | null>(null);

  const openDispute = useCallback(
    async (orderId: string, reason: string, evidence?: string) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/dispute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, reason, evidence }),
        });

        if (!res.ok) throw new Error(`Dispute error: ${res.status}`);

        const data: DisputeResponse = await res.json();
        setDispute(data.dispute);
        setLoading(false);
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Dispute failed";
        setError(errorMsg);
        setLoading(false);
        return null;
      }
    },
    [],
  );

  return { loading, error, dispute, openDispute };
}

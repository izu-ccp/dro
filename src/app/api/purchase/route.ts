// ============================================================================
// POST /api/purchase — Purchase via Google ADK
// ============================================================================

import { NextResponse } from "next/server";
import type { PurchaseRequest, PurchaseResponse } from "@/lib/agents/types";
import { runAgent } from "@/lib/adk";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PurchaseRequest;
    if (!body.productId || !body.source || !body.paymentMethod) {
      return NextResponse.json(
        { error: "productId, source, and paymentMethod are required" },
        { status: 400 },
      );
    }

    const result = await runAgent(
      `Buy product ${body.productId} from ${body.source}`,
      {
        sessionData: {
          itemId: body.productId,
          itemName: body.itemName ?? `Product ${body.productId}`,
          source: body.source,
          price: body.price ?? 0,
          amount: body.price ?? 0,
          orderId: `DRO-${Date.now()}`,
          deliveryType: body.deliveryInfo.type,
          deliveryTarget: body.deliveryInfo.steamTradeUrl ?? "shipping",
          cardLast4: body.cardInfo?.number?.slice(-4),
          walletAddress: body.walletAddress,
          token: (body as unknown as Record<string, unknown>).token ?? "USDC",
          paymentMode: body.paymentMethod === "crypto" ? "crypto" : "fiat",
        },
      },
    );

    const data = result.data ?? {};
    const purchaseData = (typeof data.purchase_results === "string"
      ? JSON.parse(data.purchase_results)
      : data.purchase_results) as Record<string, unknown> | undefined;
    const paymentData = (typeof data.payment_results === "string"
      ? JSON.parse(data.payment_results)
      : data.payment_results) as Record<string, unknown> | undefined;

    const response: PurchaseResponse = {
      orderId: (purchaseData?.orderId as string) ?? `DRO-${Date.now()}`,
      status: (purchaseData?.status as string) ?? "processing",
      payment: paymentData as unknown as PurchaseResponse["payment"],
      escrow: (paymentData?.escrow ?? purchaseData?.escrow) as PurchaseResponse["escrow"],
      timeline: ((purchaseData?.timeline ?? []) as PurchaseResponse["timeline"]),
      events: [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Purchase API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

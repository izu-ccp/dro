// Tool 17/18 — Track Shipping
import type { ToolDefinition, ToolResult } from "../agents/types";

export const trackShippingTool: ToolDefinition = {
  name: "track_shipping",
  description: "Track a physical shipment via carrier tracking number (UPS, FedEx, USPS, DHL)",
  category: "tracking",
  parameters: [
    { name: "trackingId", type: "string", description: "Carrier tracking number", required: true },
    { name: "carrier", type: "string", description: "Shipping carrier", enum: ["UPS", "FedEx", "USPS", "DHL", "auto"] },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const trackingId = args.trackingId as string;

    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

    // Auto-detect carrier from tracking format
    let carrier = args.carrier as string;
    if (!carrier || carrier === "auto") {
      if (trackingId.startsWith("1Z")) carrier = "UPS";
      else if (/^\d{12,22}$/.test(trackingId)) carrier = "FedEx";
      else if (/^\d{20,}$/.test(trackingId)) carrier = "USPS";
      else carrier = "UPS";
    }

    const now = Date.now();
    const events = [
      { timestamp: new Date(now - 4 * 86400000).toISOString(), location: "Seller Warehouse, CA", status: "Label Created", detail: "Shipping label created, package ready for pickup" },
      { timestamp: new Date(now - 3.5 * 86400000).toISOString(), location: "Los Angeles, CA", status: "Picked Up", detail: `Package picked up by ${carrier}` },
      { timestamp: new Date(now - 3 * 86400000).toISOString(), location: "Los Angeles, CA", status: "Departed Facility", detail: "Package departed origin facility" },
      { timestamp: new Date(now - 2 * 86400000).toISOString(), location: "Phoenix, AZ", status: "In Transit", detail: "Package in transit to destination" },
      { timestamp: new Date(now - 1 * 86400000).toISOString(), location: "Louisville, KY", status: "In Transit", detail: "Arrived at distribution center" },
      { timestamp: new Date(now - 0.5 * 86400000).toISOString(), location: "Louisville, KY", status: "Out for Delivery", detail: "Package is out for delivery" },
    ];

    return {
      success: true,
      data: {
        trackingId,
        carrier,
        status: "In Transit",
        estimatedDelivery: new Date(now + 1 * 86400000).toISOString().split("T")[0],
        lastUpdate: events[events.length - 1],
        events,
        trackingUrl: carrier === "UPS"
          ? `https://www.ups.com/track?tracknum=${trackingId}`
          : carrier === "FedEx"
            ? `https://www.fedex.com/fedextrack/?trknbr=${trackingId}`
            : `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingId}`,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};

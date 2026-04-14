export interface Product {
  id: string;
  name: string;
  source: string;
  sourceIcon: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  tier: "verified" | "trusted" | "marketplace";
  priceHistory: number[];
  tags: string[];
  delivery: string;
  float?: number;
  wear?: string;
  inStock: boolean;
}

export interface Order {
  id: string;
  item: string;
  source: string;
  price: number;
  image?: string;
  status:
    | "processing"
    | "purchasing"
    | "shipped"
    | "in_transit"
    | "trade_sent"
    | "delivered"
    | "disputed";
  date: string;
  trackingId?: string;
  escrowAddress?: string;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  label: string;
  time: string;
  status: "done" | "active" | "pending";
  detail?: string;
}

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "AK-47 | Redline (Field-Tested)",
    source: "Steam Community Market",
    sourceIcon: "S",
    price: 27.45,
    rating: 4.2,
    reviews: 12400,
    image: "/products/ak47-redline.jpg",
    tier: "verified",
    priceHistory: [25, 26, 28, 27, 29, 31, 28, 27, 26, 27, 28, 27],
    tags: ["CS2", "Rifle", "Classified"],
    delivery: "Steam Trade",
    float: 0.21,
    wear: "Field-Tested",
    inStock: true,
  },
  {
    id: "2",
    name: "AK-47 | Redline (Field-Tested)",
    source: "Steam Community Market",
    sourceIcon: "S",
    price: 28.1,
    rating: 4.8,
    reviews: 8200,
    image: "/products/ak47-redline-2.jpg",
    tier: "verified",
    priceHistory: [26, 27, 29, 28, 30, 32, 29, 28, 27, 28, 29, 28],
    tags: ["CS2", "Rifle", "Classified"],
    delivery: "Steam Trade",
    float: 0.18,
    wear: "Field-Tested",
    inStock: true,
  },
  {
    id: "3",
    name: "AK-47 | Redline (Field-Tested)",
    source: "Skinport",
    sourceIcon: "SP",
    price: 25.9,
    rating: 4.5,
    reviews: 3200,
    image: "/products/ak47-redline-3.jpg",
    tier: "trusted",
    priceHistory: [24, 25, 26, 25, 27, 28, 26, 25, 25, 26, 26, 25],
    tags: ["CS2", "Rifle", "Instant"],
    delivery: "Instant delivery",
    float: 0.23,
    wear: "Field-Tested",
    inStock: true,
  },
  {
    id: "4",
    name: "AK-47 | Redline (Field-Tested)",
    source: "Buff163",
    sourceIcon: "B",
    price: 24.2,
    rating: 4.3,
    reviews: 5600,
    image: "/products/ak47-redline-4.jpg",
    tier: "trusted",
    priceHistory: [22, 23, 24, 23, 25, 26, 24, 23, 23, 24, 24, 24],
    tags: ["CS2", "Rifle", "2-5 min"],
    delivery: "2-5 min delivery",
    float: 0.25,
    wear: "Field-Tested",
    inStock: true,
  },
  {
    id: "5",
    name: "AK-47 | Redline (Field-Tested)",
    source: "G2A",
    sourceIcon: "G",
    price: 23.5,
    rating: 3.8,
    reviews: 1200,
    image: "/products/ak47-redline-5.jpg",
    tier: "marketplace",
    priceHistory: [21, 22, 24, 23, 24, 25, 23, 22, 22, 23, 23, 23],
    tags: ["CS2", "Rifle", "Key"],
    delivery: "Key delivery",
    float: 0.28,
    wear: "Field-Tested",
    inStock: true,
  },
  {
    id: "6",
    name: "AWP | Asiimov (Field-Tested)",
    source: "Steam Community Market",
    sourceIcon: "S",
    price: 34.5,
    rating: 4.6,
    reviews: 18000,
    image: "/products/awp-asiimov.jpg",
    tier: "verified",
    priceHistory: [32, 33, 35, 34, 36, 38, 35, 34, 33, 34, 35, 34],
    tags: ["CS2", "Sniper", "Covert"],
    delivery: "Steam Trade",
    float: 0.22,
    wear: "Field-Tested",
    inStock: true,
  },
  {
    id: "7",
    name: "M4A4 | Neo-Noir (Minimal Wear)",
    source: "Steam Community Market",
    sourceIcon: "S",
    price: 19.8,
    rating: 4.4,
    reviews: 9400,
    image: "/products/m4a4-neonoir.jpg",
    tier: "verified",
    priceHistory: [18, 19, 20, 19, 21, 22, 20, 19, 19, 20, 20, 19],
    tags: ["CS2", "Rifle", "Classified"],
    delivery: "Steam Trade",
    float: 0.12,
    wear: "Minimal Wear",
    inStock: true,
  },
  {
    id: "8",
    name: "Logitech MX Master 3S",
    source: "Amazon",
    sourceIcon: "A",
    price: 89.99,
    originalPrice: 99.99,
    rating: 4.7,
    reviews: 24500,
    image: "/products/mx-master.jpg",
    tier: "verified",
    priceHistory: [95, 92, 90, 89, 92, 95, 90, 88, 89, 90, 89, 89],
    tags: ["Electronics", "Mouse", "Wireless"],
    delivery: "2-day shipping",
    inStock: true,
  },
];

export const mockOrders: Order[] = [
  {
    id: "PB-20260407-0042",
    item: "AK-47 | Redline (FT)",
    source: "Steam",
    price: 28.0,
    image: "https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXncezAc_0STOb-IIvEDjGMzMX-HtDuP0d2y5LdFoNjahsLYRT9WjYqfURqV0v8mMeBSSEVfRuG_ycqAQ2d7IThFibakOQZu1MzEdQJG49C5q4yKlPDnMbmDk2kGu5dy3-icoY6j0VKx-UJqfSmtd8WL-Fng/360fx360f",
    status: "trade_sent",
    date: "2026-04-07",
    escrowAddress: "0x7a3b...f29d",
    timeline: [
      {
        label: "Payment Received",
        time: "4:32 PM",
        status: "done",
        detail: "Tx: 0x8f2a...d931",
      },
      {
        label: "Escrow Created",
        time: "4:32 PM",
        status: "done",
        detail: "Contract: 0x7a3b...f29d",
      },
      {
        label: "Purchasing from Steam",
        time: "4:33 PM",
        status: "done",
      },
      {
        label: "Trade Offer Sent",
        time: "4:35 PM",
        status: "active",
        detail: "Waiting for you to accept",
      },
      {
        label: "Delivery Confirmed",
        time: "",
        status: "pending",
      },
      {
        label: "Escrow Released",
        time: "",
        status: "pending",
      },
    ],
  },
  {
    id: "PB-20260406-0041",
    item: "Nike Dunk Low Panda",
    source: "Amazon",
    price: 115.0,
    image: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/af53d53d-561f-450a-a483-70a7ceee380f/dunk-low-retro-mens-shoes-76KnBL.png",
    status: "in_transit",
    date: "2026-04-06",
    trackingId: "1Z999AA10123456784",
    escrowAddress: "0x4c1e...a82b",
    timeline: [
      {
        label: "Payment Received",
        time: "2:15 PM",
        status: "done",
        detail: "Stripe: pi_3x...k9",
      },
      {
        label: "Escrow Created",
        time: "2:15 PM",
        status: "done",
        detail: "Contract: 0x4c1e...a82b",
      },
      {
        label: "Order Placed on Amazon",
        time: "2:18 PM",
        status: "done",
        detail: "Order: 114-2849531-7739482",
      },
      {
        label: "Shipped",
        time: "Apr 6, 6:45 PM",
        status: "done",
        detail: "UPS: 1Z999AA10123456784",
      },
      {
        label: "In Transit",
        time: "Apr 7, 10:22 AM",
        status: "active",
        detail: "Louisville, KY",
      },
      {
        label: "Delivery Confirmed",
        time: "",
        status: "pending",
      },
      {
        label: "Escrow Released",
        time: "",
        status: "pending",
      },
    ],
  },
];

export const pastOrders = [
  {
    id: "PB-20260405-0040",
    item: "Logitech MX Master 3S",
    source: "Amazon",
    price: 89.99,
    image: "https://resource.logitechg.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/non-702702702702702702702702702702702702/702702702702702702702702702702702702702702/mx-master-3s.png",
    status: "delivered" as const,
    date: "2026-04-05",
  },
  {
    id: "PB-20260403-0039",
    item: "CS2 Sport Gloves | Vice",
    source: "Steam",
    price: 245.0,
    image: "https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXncezAc_0STOb-IIvEDjGMzMX-HtDuP0d2y5LdFoNjahsLYRT9WjYqfURqV0v8mMeBSSEVfRuG_ycqAQ2d7IThFibakOQZu1MzEdQJG49C5q4yKlPDnMbmDk2kGu5dy3-icoY6j0VKx/360fx360f",
    status: "delivered" as const,
    date: "2026-04-03",
  },
  {
    id: "PB-20260401-0038",
    item: "Steam Gift Card $50",
    source: "G2A",
    price: 47.5,
    status: "delivered" as const,
    date: "2026-04-01",
  },
  {
    id: "PB-20260328-0037",
    item: "Razer DeathAdder V3",
    source: "Amazon",
    price: 69.99,
    image: "https://assets3.razerzone.com/tTMBOLPcuFLsdBr8rFWiX0gQwns=/1500x1000/https%3A%2F%2Fhybrismediaprod.blob.core.windows.net%2Fsys-master-phoenix-images-container%2Fh9e%2Fh19%2F9634045911070%2F230203-deathadder-v3-500x500.png",
    status: "delivered" as const,
    date: "2026-03-28",
  },
  {
    id: "PB-20260325-0036",
    item: "Desert Eagle | Blaze (FN)",
    source: "Steam",
    price: 310.0,
    image: "https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXncezAc_0STOb-IIvEDjGMzMX-HtDuP0d2y5LdFoNjahsLYRT9WjYqfURqV0v8mMeBSSEVfRuG_ycqAQ2d7IThFibakOQZu1MzEdQJG49C5q4yKlPDnMbmDk2kGu5d/360fx360f",
    status: "delivered" as const,
    date: "2026-03-25",
  },
];

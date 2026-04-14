// ============================================================================
// GET /api/oak/campaigns — Fetch live campaigns from Oak Network
// ============================================================================

import { NextResponse } from "next/server";

const OAK_URL = "https://app-dev.oaknetwork.org/";

const CATEGORY_NAMES: Record<string, string> = {
  "fa63cf88-7df0-434e-ace1-e5f2c95fd66c": "Technology",
  "f0011bad-49da-4bd5-a224-e27406e578f7": "Fashion",
  "0258f35e-29b1-4bab-9fc1-86dc57f16019": "Comics & Illustration",
  "a1b2c3d4-arts": "Arts",
  "a1b2c3d4-design": "Design",
  "a1b2c3d4-games": "Games",
  "a1b2c3d4-music": "Music",
};

function getCategoryName(id: string): string {
  return CATEGORY_NAMES[id] || "Other";
}

export async function GET() {
  try {
    const res = await fetch(OAK_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch Oak Network" }, { status: 502 });
    }

    const rawHtml = await res.text();

    // Next.js embeds data as double-escaped JSON in streaming format.
    // Unescape \\\" → \" so we can parse the project objects.
    const html = rawHtml.replace(/\\"/g, '"');

    const projects: Record<string, unknown>[] = [];

    // Split on project object boundaries: {"id":"<uuid>","walletId"
    const chunks = html.split(/(?=\{"id":"[a-f0-9-]{36}","walletId")/);

    for (const chunk of chunks) {
      if (!chunk.startsWith('{"id":"')) continue;

      // Find balanced closing brace for this object
      let depth = 0;
      let endIdx = 0;
      for (let i = 0; i < chunk.length && i < 10000; i++) {
        if (chunk[i] === "{") depth++;
        if (chunk[i] === "}") depth--;
        if (depth === 0 && i > 0) {
          endIdx = i + 1;
          break;
        }
      }

      if (endIdx > 0) {
        try {
          const obj = JSON.parse(chunk.substring(0, endIdx));
          if (obj.id && obj.title && obj.projectStatus) {
            if (!projects.some((p) => p.id === obj.id)) {
              projects.push(obj);
            }
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    // Filter to LAUNCHED only and map to clean format
    const live = projects
      .filter((p) => p.projectStatus === "LAUNCHED")
      .map((p) => ({
        id: p.id as string,
        title: p.title as string,
        subtitle: (p.subtitle as string) || "",
        projectStatus: p.projectStatus as string,
        categoryName: getCategoryName((p.categoryId as string) || (p.primaryCategoryId as string) || ""),
        fundingGoal: (p.fundingGoal as string) || "0.00",
        funded: (p.funded as string) || "0.00",
        launchDate: (p.launchDate as string) || "",
        endDate: (p.endDate as string) || "",
        contractAddress: (p.contractAddress as string) || "",
        campaignTreasury: (p.campaignTreasury as string) || "",
        projectImageUrl: (p.projectImageUrl as string) || "",
        pledgeCount: (p.pledgeCount as string) || undefined,
        fiatEnabled: (p.fiatEnabled as boolean) ?? false,
        projectType: (p.projectType as string) || "INDIVIDUAL",
        location: (p.location as string) || "",
      }));

    return NextResponse.json({
      campaigns: live,
      total: live.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Oak campaigns fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}

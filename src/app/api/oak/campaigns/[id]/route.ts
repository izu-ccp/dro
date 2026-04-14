// ============================================================================
// GET /api/oak/campaigns/[id] — Fetch campaign details + rewards from Oak
// ============================================================================

import { NextResponse } from "next/server";

const OAK_BASE = "https://app-dev.oaknetwork.org/backer/projects";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const res = await fetch(`${OAK_BASE}/${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const rawHtml = await res.text();
    const html = rawHtml.replace(/\\"/g, '"');

    // Extract project object that contains "rewards" array
    let project: Record<string, unknown> | null = null;
    const projectChunks = html.split(/(?=\{"id":"[a-f0-9-]{36}","walletId")/);

    for (const chunk of projectChunks) {
      if (!chunk.startsWith('{"id":"')) continue;

      // Find balanced closing brace (allow larger objects since they contain rewards)
      let depth = 0, end = 0;
      for (let i = 0; i < chunk.length && i < 30000; i++) {
        if (chunk[i] === "{") depth++;
        if (chunk[i] === "}") depth--;
        if (depth === 0 && i > 0) { end = i + 1; break; }
      }

      if (end > 0) {
        try {
          const obj = JSON.parse(chunk.substring(0, end));
          if (obj.id === id && obj.title) {
            project = obj;
            break;
          }
        } catch { /* skip */ }
      }
    }

    // Extract rewards from the project's "rewards" array
    const rawRewards = (project?.rewards ?? []) as Array<Record<string, unknown>>;

    const campaign = project
      ? {
          id: project.id,
          title: project.title,
          subtitle: project.subtitle || project.subTitle || "",
          projectStatus: project.projectStatus,
          fundingGoal: project.fundingGoal || "0.00",
          funded: project.funded || "0.00",
          launchDate: project.launchDate || "",
          endDate: project.endDate || "",
          contractAddress: project.contractAddress || "",
          projectImageUrl: project.projectImageUrl || "",
          fiatEnabled: project.fiatEnabled ?? false,
          description: project.description || project.story || "",
          location: project.location || "",
          pledgeCount: project.pledgeCount || "0",
        }
      : null;

    const rewards = rawRewards.map((r) => ({
      id: r.id as string,
      name: (r.name as string) || "",
      description: (r.description as string) || "",
      price: r.value as number ?? 0,
      image: (r.image as string) || "",
      quantity: r.rewardQuantity as number | null,
      estimatedDelivery: (r.estimatedDeliveryDate as string) || "",
      shippingType: (r.shippingType as string) || "digital",
    }));

    return NextResponse.json({ campaign, rewards });
  } catch (error) {
    console.error("Oak campaign detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign details" },
      { status: 500 },
    );
  }
}

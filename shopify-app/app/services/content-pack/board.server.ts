import prisma from "../../db.server";
import { parseAssets, type ContentPackAssets, type PackStatus } from "./types";

export type PackView = {
  id: string;
  eventId: string;
  headline: string;
  rationale: string;
  source: "agent" | "template";
  status: PackStatus;
  errorMessage: string | null;
  simulated: boolean;
  resultMessage: string | null;
  appliedAt: string | null;
  assets: ContentPackAssets;
  personaIds: string[];
  preview: { label: string; value: string }[];
};

export async function loadPackView(shopId: string, eventId: string): Promise<PackView | null> {
  const row = await prisma.contentPack.findUnique({
    where: { shopId_eventId: { shopId, eventId } },
  });
  if (!row) return null;
  const assets = parseAssets(row.assetsJson);
  let personaIds: string[] = [];
  try {
    personaIds = JSON.parse(row.personaIdsJson) as string[];
  } catch {
    personaIds = [];
  }
  let result: { simulated?: boolean; message?: string } = {};
  try {
    result = row.resultJson ? (JSON.parse(row.resultJson) as typeof result) : {};
  } catch {
    result = {};
  }
  return {
    id: row.id,
    eventId: row.eventId,
    headline: row.headline,
    rationale: row.rationale,
    source: row.source === "agent" ? "agent" : "template",
    status: row.status as PackStatus,
    errorMessage: row.errorMessage,
    simulated: Boolean(result.simulated),
    resultMessage: result.message ?? null,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    assets,
    personaIds,
    preview: [
      { label: "Blog", value: assets.blog.title },
      { label: "Page", value: assets.page.title },
      { label: "Banner", value: assets.banner.headline },
      { label: "Email", value: assets.email.subject },
      {
        label: "Segments",
        value: assets.segments.map((segment) => segment.personaName).join(", ") || "None",
      },
    ],
  };
}

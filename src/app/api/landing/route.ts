import { db } from "@/db";
import { landingSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureLanding } from "@/lib/data";
import { DEFAULT_LANDING } from "@/lib/defaults";

export const dynamic = "force-dynamic";

const EDITABLE = [
  "brandName", "badgeText", "mainTitle", "subtitle", "subjectLabel", "subjectValue",
  "facultyLabel", "facultyValue", "portalLabel", "portalValue", "chooseTitle",
  "chooseSubtitle", "footerText", "logoUrl", "personalImageUrl",
] as const;

export async function GET() {
  const row = await ensureLanding();
  return Response.json(row);
}

export async function PUT(req: Request) {
  await ensureLanding();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, string | Date> = {};
  for (const key of EDITABLE) {
    if (typeof body[key] === "string") patch[key] = body[key] as string;
  }
  patch.updatedAt = new Date();
  const [row] = await db
    .update(landingSettings)
    .set(patch)
    .where(eq(landingSettings.id, 1))
    .returning();
  return Response.json(row);
}

/** Reset landing page to original settings. */
export async function DELETE() {
  await ensureLanding();
  const [row] = await db
    .update(landingSettings)
    .set({ ...DEFAULT_LANDING, updatedAt: new Date() })
    .where(eq(landingSettings.id, 1))
    .returning();
  return Response.json(row);
}

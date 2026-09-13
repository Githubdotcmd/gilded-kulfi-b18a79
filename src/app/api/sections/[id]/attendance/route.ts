import { db } from "@/db";
import { sections, students } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSectionById, getStudents, parseId } from "@/lib/data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type Body =
  | { action: "mark"; studentId: number; status: "present" | "absent" | null }
  | { action: "markAll"; status: "present" | "absent" | null }
  | { action: "submit" }
  | { action: "resetSubmit" }
  | { action: "resetAll" };

export async function POST(req: Request, ctx: Ctx) {
  const id = parseId((await ctx.params).id);
  if (!id) return Response.json({ error: "Invalid id" }, { status: 400 });
  const sec = await getSectionById(id);
  if (!sec) return Response.json({ error: "Section not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;

  switch (body.action) {
    case "mark": {
      if (sec.attendanceSubmitted) {
        return Response.json({ error: "locked", locked: true }, { status: 423 });
      }
      await db
        .update(students)
        .set({ status: body.status })
        .where(and(eq(students.id, body.studentId), eq(students.sectionId, id)));
      break;
    }
    case "markAll": {
      if (sec.attendanceSubmitted) {
        return Response.json({ error: "locked", locked: true }, { status: 423 });
      }
      await db.update(students).set({ status: body.status }).where(eq(students.sectionId, id));
      break;
    }
    case "submit": {
      await db
        .update(sections)
        .set({
          attendanceSubmitted: true,
          submittedAt: new Date(),
          attendanceDate: new Date().toISOString().slice(0, 10),
          updatedAt: new Date(),
        })
        .where(eq(sections.id, id));
      break;
    }
    case "resetSubmit": {
      await db
        .update(sections)
        .set({ attendanceSubmitted: false, submittedAt: null, updatedAt: new Date() })
        .where(eq(sections.id, id));
      break;
    }
    case "resetAll": {
      await db.update(students).set({ status: null }).where(eq(students.sectionId, id));
      await db
        .update(sections)
        .set({
          attendanceSubmitted: false,
          submittedAt: null,
          attendanceDate: null,
          updatedAt: new Date(),
        })
        .where(eq(sections.id, id));
      break;
    }
    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const section = await getSectionById(id);
  const roster = await getStudents(id);
  return Response.json({ section, students: roster });
}

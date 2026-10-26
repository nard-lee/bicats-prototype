import "dotenv/config";
import { prisma } from "../src/db";

// Demo audit trail so the admin "Audit Logs" page is populated on a fresh DB.

type Template = {
  action: string;
  entityType: string;
  summary: (ref?: string) => string;
};

const TEMPLATES: Template[] = [
  { action: "auth.login", entityType: "auth", summary: () => "signed in" },
  { action: "user.create", entityType: "user", summary: () => "Created a staff account" },
  { action: "user.update", entityType: "user", summary: () => "Updated a staff account" },
  {
    action: "complaint.status.update",
    entityType: "complaint",
    summary: (ref) => `Status changed for ${ref ?? "a case"}`,
  },
  { action: "complaint.reopen", entityType: "complaint", summary: (ref) => `Reopened ${ref ?? "a case"}` },
  { action: "complaint.bulk_status", entityType: "complaint", summary: () => "Bulk status update" },
  { action: "hearing.create", entityType: "hearing", summary: (ref) => `Scheduled a mediation session for ${ref ?? "a case"}` },
  { action: "hearing.update", entityType: "hearing", summary: () => "Updated a mediation session" },
  { action: "hearing.cancel", entityType: "hearing", summary: () => "Cancelled a mediation session" },
  { action: "notice.create", entityType: "notice", summary: () => "Published a notice" },
  { action: "notice.update", entityType: "notice", summary: () => "Updated a notice" },
  { action: "notice.delete", entityType: "notice", summary: () => "Deleted a notice" },
];

const rand = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)] as T;

async function main() {
  console.log("🌱 Seeding audit logs...");

  await prisma.auditLog.deleteMany();

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, role: true },
  });

  if (users.length === 0) {
    console.log("   ↳ no users found — run db:seed:users first");
    return;
  }

  const complaints = await prisma.complaint.findMany({
    select: { id: true, reference: true },
    take: 40,
    orderBy: { id: "desc" },
  });

  const rows = Array.from({ length: 60 }, () => {
    const actor = rand(users);
    const template = rand(TEMPLATES);
    const complaint = rand(complaints);
    const daysAgo = Math.random() * 30;

    return {
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: template.action,
      entityType: template.entityType,
      entityId:
        template.entityType === "complaint"
          ? (complaint?.id ?? null)
          : template.entityType === "auth"
            ? actor.id
            : null,
      summary: `${actor.fullName} — ${template.summary(complaint?.reference)}`,
      ip: `192.168.1.${1 + Math.floor(Math.random() * 250)}`,
      createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    };
  });

  await prisma.auditLog.createMany({ data: rows });
  console.log(`✅ Seeded ${rows.length} audit entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

-- One-off: converts the enum-backed String columns in place, preserving rows.
-- `prisma db push` cannot alter a populated String column to an enum (no implicit
-- cast), so run this first on any database that already has data:
--   pnpm exec prisma db execute --file prisma/enum-conversion.sql
-- then `pnpm db:push` to confirm sync. Skip on empty databases: db push handles them.
BEGIN;

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('admin', 'staff', 'secretary', 'lupon'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ComplaintStatus" AS ENUM ('received', 'summoned', 'mediation', 'conciliation', 'settled', 'certified', 'dismissed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ComplaintType" AS ENUM ('type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7', 'type8', 'type9', 'type10', 'type11', 'type12'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EligibilityStatus" AS ENUM ('unreviewed', 'eligible', 'needs_review', 'outside_kp', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'staff'::"Role";

ALTER TABLE "Complaint" ALTER COLUMN "complaintType" TYPE "ComplaintType" USING "complaintType"::"ComplaintType";
ALTER TABLE "Complaint" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Complaint" ALTER COLUMN "status" TYPE "ComplaintStatus" USING "status"::"ComplaintStatus";
ALTER TABLE "Complaint" ALTER COLUMN "status" SET DEFAULT 'received'::"ComplaintStatus";
ALTER TABLE "Complaint" ALTER COLUMN "eligibilityStatus" DROP DEFAULT;
ALTER TABLE "Complaint" ALTER COLUMN "eligibilityStatus" TYPE "EligibilityStatus" USING "eligibilityStatus"::"EligibilityStatus";
ALTER TABLE "Complaint" ALTER COLUMN "eligibilityStatus" SET DEFAULT 'unreviewed'::"EligibilityStatus";

ALTER TABLE "StatusUpdate" ALTER COLUMN "status" TYPE "ComplaintStatus" USING "status"::"ComplaintStatus";

COMMIT;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'staff', 'secretary', 'lupon');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('received', 'summoned', 'mediation', 'conciliation', 'settled', 'certified', 'dismissed');

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7', 'type8', 'type9', 'type10', 'type11', 'type12');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('unreviewed', 'eligible', 'needs_review', 'outside_kp', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "remember" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LuponMember" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "contact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LuponMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCounter" (
    "period" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceCounter_pkey" PRIMARY KEY ("period")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "complainantName" TEXT NOT NULL,
    "complainantAge" INTEGER NOT NULL,
    "complainantPurok" TEXT NOT NULL,
    "complainantContact" TEXT NOT NULL,
    "contactNormalized" TEXT NOT NULL,
    "complainantEmail" TEXT,
    "complainantAddress" TEXT NOT NULL,
    "complainantLang" TEXT NOT NULL DEFAULT 'en',
    "respondentName" TEXT NOT NULL,
    "respondentAddress" TEXT,
    "relationship" TEXT,
    "complaintType" "ComplaintType" NOT NULL,
    "complaintTypeOther" TEXT,
    "incidentAt" TIMESTAMP(3) NOT NULL,
    "incidentPlace" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'received',
    "dueAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "eligibilityStatus" "EligibilityStatus" NOT NULL DEFAULT 'unreviewed',
    "eligibilityAnswers" JSONB,
    "eligibilityNotes" TEXT,
    "eligibilityReason" TEXT,
    "eligibilityReviewedAt" TIMESTAMP(3),
    "pangkatMembers" JSONB,
    "pangkatChairman" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" SERIAL NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusUpdate" (
    "id" SERIAL NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "status" "ComplaintStatus" NOT NULL,
    "publicNote" TEXT,
    "internalNote" TEXT,
    "hearingAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" SERIAL NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "servedAt" TIMESTAMP(3) NOT NULL,
    "serverName" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hearing" (
    "id" SERIAL NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'mediation',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "location" TEXT,
    "notes" TEXT,
    "outcome" TEXT,
    "complainantAttendance" TEXT,
    "respondentAttendance" TEXT,
    "attendanceNotes" TEXT,
    "attendanceRecordedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hearing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "complaintId" INTEGER,
    "reference" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "summary" TEXT NOT NULL,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarangaySettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "barangayName" TEXT NOT NULL DEFAULT 'Barangay Kabayanihan',
    "city" TEXT NOT NULL DEFAULT 'City of Baguio',
    "province" TEXT NOT NULL DEFAULT 'Benguet',
    "address" TEXT NOT NULL DEFAULT '',
    "contactNumber" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "officeHours" TEXT NOT NULL DEFAULT 'Monday–Friday, 8:00 AM – 5:00 PM',
    "punongBarangay" TEXT NOT NULL DEFAULT 'Hon. Mario D. Santos',
    "secretaryName" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "punongSignatureUrl" TEXT NOT NULL DEFAULT '',
    "secretarySignatureUrl" TEXT NOT NULL DEFAULT '',
    "punongTitle" TEXT NOT NULL DEFAULT 'Punong Barangay / Chairman, Lupong Tagapamayapa',
    "secretaryTitle" TEXT NOT NULL DEFAULT 'Barangay Secretary / Secretary, Lupong Tagapamayapa',
    "puroks" TEXT[] DEFAULT ARRAY['Session Road', 'Assumption Road', 'Mabini Street', 'General Luna Road', 'Fr. Carlu Street']::TEXT[],
    "officials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentOfficeLine" TEXT NOT NULL DEFAULT 'Office of the Punong Barangay',
    "hotline" TEXT NOT NULL DEFAULT '',
    "tanodNumber" TEXT NOT NULL DEFAULT '',
    "defaultHearingLocation" TEXT NOT NULL DEFAULT 'Barangay Hall Session Room',
    "hearingDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "officeStartHour" INTEGER NOT NULL DEFAULT 8,
    "officeEndHour" INTEGER NOT NULL DEFAULT 17,
    "enforceOfficeHours" BOOLEAN NOT NULL DEFAULT false,
    "hearingGraceHours" INTEGER NOT NULL DEFAULT 2,
    "deadlineReceived" INTEGER NOT NULL DEFAULT 1,
    "deadlineSummoned" INTEGER NOT NULL DEFAULT 15,
    "deadlineMediation" INTEGER NOT NULL DEFAULT 15,
    "deadlineConciliation" INTEGER NOT NULL DEFAULT 15,
    "riskWindowDays" INTEGER NOT NULL DEFAULT 3,
    "workingDaysOnly" BOOLEAN NOT NULL DEFAULT false,
    "holidays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notifyIntakeSms" BOOLEAN NOT NULL DEFAULT true,
    "notifyIntakeEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyStatusSms" BOOLEAN NOT NULL DEFAULT true,
    "notifyStatusEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyMediationSms" BOOLEAN NOT NULL DEFAULT true,
    "notifyMediationEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyCancelledSms" BOOLEAN NOT NULL DEFAULT true,
    "notifyCancelledEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminderLeadHours" INTEGER NOT NULL DEFAULT 24,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarangaySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LuponMember_isActive_fullName_idx" ON "LuponMember"("isActive", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_reference_key" ON "Complaint"("reference");

-- CreateIndex
CREATE INDEX "Complaint_contactNormalized_idx" ON "Complaint"("contactNormalized");

-- CreateIndex
CREATE INDEX "Complaint_status_createdAt_idx" ON "Complaint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_status_dueAt_idx" ON "Complaint"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Complaint_viewedAt_updatedAt_idx" ON "Complaint"("viewedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "Complaint_createdAt_idx" ON "Complaint"("createdAt");

-- CreateIndex
CREATE INDEX "Complaint_incidentAt_idx" ON "Complaint"("incidentAt");

-- CreateIndex
CREATE INDEX "Complaint_complaintType_createdAt_idx" ON "Complaint"("complaintType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_storedName_key" ON "Evidence"("storedName");

-- CreateIndex
CREATE INDEX "Evidence_complaintId_createdAt_idx" ON "Evidence"("complaintId", "createdAt");

-- CreateIndex
CREATE INDEX "StatusUpdate_complaintId_createdAt_idx" ON "StatusUpdate"("complaintId", "createdAt");

-- CreateIndex
CREATE INDEX "StatusUpdate_createdById_idx" ON "StatusUpdate"("createdById");

-- CreateIndex
CREATE INDEX "StatusUpdate_hearingAt_idx" ON "StatusUpdate"("hearingAt");

-- CreateIndex
CREATE INDEX "ServiceRecord_complaintId_servedAt_idx" ON "ServiceRecord"("complaintId", "servedAt");

-- CreateIndex
CREATE INDEX "ServiceRecord_createdById_idx" ON "ServiceRecord"("createdById");

-- CreateIndex
CREATE INDEX "Hearing_scheduledAt_idx" ON "Hearing"("scheduledAt");

-- CreateIndex
CREATE INDEX "Hearing_complaintId_scheduledAt_idx" ON "Hearing"("complaintId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Hearing_status_scheduledAt_idx" ON "Hearing"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notice_isPublished_createdAt_idx" ON "Notice"("isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "Notice_createdById_idx" ON "Notice"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusUpdate" ADD CONSTRAINT "StatusUpdate_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusUpdate" ADD CONSTRAINT "StatusUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hearing" ADD CONSTRAINT "Hearing_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hearing" ADD CONSTRAINT "Hearing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

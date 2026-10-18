import { z } from "zod";

export function normalizePhone(input: string) {
    let digits = input.replace(/\D/g, "");
    if (digits.startsWith("63") && digits.length === 12) {
        digits = "0" + digits.slice(2);
    }
    return digits;
}

const optionalText = (max: number) =>
    z.string().trim().max(max).optional().transform((v) => v || null);

export const createComplaintSchema = z
    .object({
        complainantName: z.string("required").trim().min(2).max(100),
        complainantAge: z.coerce.number().int().min(1).max(120),
        complainantPurok: z.string().trim().min(1).max(50),
        complainantContact: z.string().trim().min(7).max(20),
        complainantAddress: z.string().trim().min(3).max(200),

        respondentName: z.string().trim().min(1).max(100),
        respondentAddress: optionalText(200),
        relationship: optionalText(100),

        complaintType: z.string().min(1),
        incidentAt: z.coerce
            .date()
            .refine((d) => d <= new Date(), "The incident can't be in the future"),
        incidentPlace: z.string().trim().min(2).max(200),
        narrative: z.string().trim().min(10).max(5000),

        consent: z.literal("on", { error: "You must agree before submitting" }),
    })
    .refine((d) => /^09\d{9}$/.test(normalizePhone(d.complainantContact)), {
        path: ["complainantContact"],
        message: "Enter a valid mobile number, like 0917 000 0000",
    })
    .transform(({ consent: _consent, ...d }) => ({
        ...d,
        contactNormalized: normalizePhone(d.complainantContact),
    }));

export const trackComplaintSchema = z.object({
    reference: z.string().trim().min(1).max(50).transform((v) => v.toUpperCase()),
    phone: z.string().trim().min(7).max(20),
});

export type TrackComplaintInput = z.infer<typeof trackComplaintSchema>;

export type ComplaintTrackUpdate = {
    status: string;
    publicNote: string | null;
    hearingAt: string | null;
    createdAt: string;
};

export type ComplaintTrackResult = {
    reference: string;
    status: string;
    updates: ComplaintTrackUpdate[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ComplaintListRow = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  complaintType: string;
  status: string;
  createdAt: Date;
  viewedAt: Date | null;
};

export const COMPLAINT_STATUSES = [
  "received",
  "under_mediation",
  "settled",
  "endorsed",
  "dismissed",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export type ComplaintListFilters = {
  q?: string | undefined;
  status?: string | undefined;
  type?: string | undefined;
};

export type ComplaintDetail = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  complaintType: string;
  status: string;
  createdAt: string;
  description: string;
  evidence: Array<{
    originalName: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  history: Array<{
    status: string;
    date: string;
    note?: string;
    by: string;
    hearingAt?: string;
  }>;
  complainantAge: number;
  complainantPurok: string;
  complainantContact: string;
  complainantAddress: string;
  respondentAddress: string | null;
  relationship: string | null;
  incidentAt: string;
  incidentPlace: string;
};

export type CreateComplaintInput = z.output<typeof createComplaintSchema>;
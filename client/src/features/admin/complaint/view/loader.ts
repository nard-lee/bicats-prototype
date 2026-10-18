import { api } from "@/lib/api";
import type { LoaderFunctionArgs } from "react-router";

export type ComplaintStatus =
  | "received"
  | "under_mediation"
  | "settled"
  | "endorsed"
  | "dismissed";

export type ComplaintDetail = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  complaintType: string;
  status: ComplaintStatus;
  createdAt: string;
  description: string;
  evidence: Array<{
    originalName: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  history: Array<{
    status: ComplaintStatus;
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

export async function ComplaintDetailLoader({ params }: LoaderFunctionArgs) {
  const id = params.id;
  
  if (!id) {
    throw new Response("Not Found", { status: 404 });
  }

  const complaint = await api
    .get(`/complaints/${id}`)
    .json<ComplaintDetail>();

  // Opening the case clears its "New" flag on the list.
  await api.post(`/complaints/${id}/view`).catch(() => {});

  return complaint;
}
import { api } from "@/lib/api";
import type { LoaderFunctionArgs } from "react-router";
import { AdminLoader } from "@/layouts/admin/loader";
import type { ComplaintDetail } from "@/features/admin/complaint/view/loader";
import type { BarangaySettings } from "@/features/admin/setting/loader";

export type DocumentType = "summons" | "notice" | "settlement" | "cfa";

export const DOCUMENT_TYPES: DocumentType[] = [
  "summons",
  "notice",
  "settlement",
  "cfa",
];

// The case summary is a printable record, not one of the KP papers: it is
// valid at every stage, so it stays out of DOCUMENT_TYPES and the status
// gating that drives them.
export type PrintableType = DocumentType | "summary";

export function isDocumentType(value: string | undefined): value is PrintableType {
  return (
    (DOCUMENT_TYPES as string[]).includes(value ?? "") || value === "summary"
  );
}

export type DocumentLoaderData = {
  complaint: ComplaintDetail;
  settings: BarangaySettings;
  generatedAt: string;
  generatedBy: string;
};

export async function ComplaintDocumentLoader({
  params,
}: LoaderFunctionArgs): Promise<DocumentLoaderData> {
  const { user, settings } = await AdminLoader();

  const id = params.id;
  if (!id || !isDocumentType(params.doc)) {
    throw new Response("Not Found", { status: 404 });
  }

  // Assembling the summary exports personal data, so the server records it in
  // the audit log; that makes it a write and the other papers a plain read.
  const complaint =
    params.doc === "summary"
      ? await api.post(`/complaints/${id}/summary-report`).json<ComplaintDetail>()
      : await api.get(`/complaints/${id}`).json<ComplaintDetail>();

  return {
    complaint,
    settings,
    generatedAt: new Date().toISOString(),
    generatedBy: user.fullName,
  };
}

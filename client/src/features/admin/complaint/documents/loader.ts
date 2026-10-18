import { api } from "@/lib/api";
import type { LoaderFunctionArgs } from "react-router";
import { AdminLoader } from "@/layouts/admin/loader";
import type { ComplaintDetail } from "@/features/admin/complaint/view/loader";

export type DocumentType = "summons" | "notice" | "settlement" | "cfa";

export const DOCUMENT_TYPES: DocumentType[] = [
  "summons",
  "notice",
  "settlement",
  "cfa",
];

export function isDocumentType(value: string | undefined): value is DocumentType {
  return (DOCUMENT_TYPES as string[]).includes(value ?? "");
}

export type DocumentLoaderData = {
  complaint: ComplaintDetail;
  generatedAt: string;
};

export async function ComplaintDocumentLoader({
  params,
}: LoaderFunctionArgs): Promise<DocumentLoaderData> {
  await AdminLoader();

  const id = params.id;
  if (!id || !isDocumentType(params.doc)) {
    throw new Response("Not Found", { status: 404 });
  }

  const complaint = await api.get(`/complaints/${id}`).json<ComplaintDetail>();

  return { complaint, generatedAt: new Date().toISOString() };
}

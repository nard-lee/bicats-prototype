import { api } from "@/lib/api";

export type FileComplaintLoaderData = {
  puroks: string[];
};

export async function fileComplaintLoader(): Promise<FileComplaintLoaderData> {
  const settings = await api.get("settings").json<{ puroks: string[] }>();
  return { puroks: settings.puroks };
}

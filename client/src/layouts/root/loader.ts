import { getBootstrap, type Bootstrap } from "@/lib/bootstrap";

export type RootLoaderData = Bootstrap;

export function RootLoader(): Promise<Bootstrap> {
  return getBootstrap();
}

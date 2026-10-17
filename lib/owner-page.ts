import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { authorizedOwner } from "./store";

/** Hide even the existence of private routes from anonymous visitors. */
export async function requireOwnerPage(): Promise<void> {
  const inbound = await headers();
  try {
    authorizedOwner(new Request("https://owner.internal.invalid/", { headers: new Headers(inbound) }));
  } catch {
    notFound();
  }
}

import type { ReactNode } from "react";

// Metadata lives in page.tsx and [slug]/page.tsx (server pages, step 12).
export default function AranzmaniLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

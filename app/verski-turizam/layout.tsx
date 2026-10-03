import type { ReactNode } from "react";

// Metadata lives in page.tsx (server page, step 12).
export default function VerskiTurizamLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

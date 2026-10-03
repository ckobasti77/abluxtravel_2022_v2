import type { ReactNode } from "react";

// Metadata lives in page.tsx (server page since step 12).
export default function DestinacijeLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

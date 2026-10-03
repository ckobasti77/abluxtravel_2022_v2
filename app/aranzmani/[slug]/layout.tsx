import type { ReactNode } from "react";

// Metadata, JSON-LD and data loading live in page.tsx (server page, step 12).
export default function TripDetailLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

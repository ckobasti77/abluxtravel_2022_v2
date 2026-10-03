import type { ReactNode } from "react";

// Metadata lives in page.tsx (server pages since step 12).
export default function PutovanjaLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

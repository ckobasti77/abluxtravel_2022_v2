import type { ReactNode } from "react";

// Metadata (title, description, canonical, Open Graph) comes from page.tsx (generateMetadata from data).
export default function CountryLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

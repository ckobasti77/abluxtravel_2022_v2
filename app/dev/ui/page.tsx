import type { Metadata } from "next";
import UiShowcase from "./ui-showcase";

// QA page for the design system (step 04). Not linked anywhere, not indexed.
export const metadata: Metadata = {
  title: "UI komponente (QA)",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function DevUiPage() {
  return <UiShowcase />;
}

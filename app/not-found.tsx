import type { Metadata } from "next";
import { LostTicket } from "../components/chrome/lost-ticket";

export const metadata: Metadata = {
  title: "Stranica nije pronađena",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <LostTicket kind="not-found" />;
}

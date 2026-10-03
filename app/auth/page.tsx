import type { Metadata } from "next";
import AuthPortal from "../../components/auth-portal";
import {
  getAuthMode,
  getNextPath,
  resolveSearchParams,
  type PageSearchParams,
} from "../../lib/auth-routing";

type AuthPageProps = {
  searchParams?: Promise<PageSearchParams>;
};

export const metadata: Metadata = {
  title: "Prijava",
  description: "Prijava i registracija korisnika na ABLux Travel platformi.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/auth",
  },
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await resolveSearchParams(searchParams);
  return <AuthPortal requestedMode={getAuthMode(params, "signin")} nextPath={getNextPath(params)} />;
}

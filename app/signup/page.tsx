import type { Metadata } from "next";
import AuthPortal from "../../components/auth-portal";
import { getNextPath, resolveSearchParams, type PageSearchParams } from "../../lib/auth-routing";

type SignUpPageProps = {
  searchParams?: Promise<PageSearchParams>;
};

export const metadata: Metadata = {
  title: "Registracija",
  description: "Registracija korisnika na ABLux Travel portal.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/signup",
  },
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await resolveSearchParams(searchParams);
  return <AuthPortal defaultMode="signup" nextPath={getNextPath(params)} />;
}


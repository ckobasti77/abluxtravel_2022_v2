"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useSitePreferences } from "../site-preferences-provider";

type AdminAccessDeniedProps = {
  variant?: "forbidden" | "expired";
};

export default function AdminAccessDenied({ variant = "forbidden" }: AdminAccessDeniedProps) {
  const { dictionary } = useSitePreferences();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      router.replace("/auth?mode=signin&next=%2Fadmin");
      router.refresh();
    }
  };

  const expired = variant === "expired";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <article className="surface max-w-md rounded-2xl p-8 text-center" role="alert">
        <h1 className="text-2xl font-semibold">
          {expired ? dictionary.admin.accessTitle : dictionary.admin.noAccessTitle}
        </h1>
        <p className="mt-3 text-base text-muted">
          {expired ? dictionary.admin.sessionExpired : dictionary.admin.noAccessDescription}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {expired ? (
            <Link href="/auth?mode=signin&next=%2Fadmin" className="btn-primary min-h-11">
              {dictionary.admin.signIn}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="btn-primary min-h-11"
            >
              {signingOut ? dictionary.admin.signingOut : dictionary.admin.signOut}
            </button>
          )}
          <Link href="/" className="btn-secondary min-h-11">
            {dictionary.admin.backToSite}
          </Link>
        </div>
      </article>
    </div>
  );
}

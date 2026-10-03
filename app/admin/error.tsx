"use client";

import Link from "next/link";
import { ConvexError } from "convex/values";
import { useSitePreferences } from "../../components/site-preferences-provider";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const isAccessError = (error: Error) =>
  (error instanceof ConvexError && (error.data === "UNAUTHENTICATED" || error.data === "FORBIDDEN")) ||
  /UNAUTHENTICATED|FORBIDDEN/.test(error.message);

export default function AdminError({ error, reset }: AdminErrorProps) {
  const { dictionary, language } = useSitePreferences();
  const accessError = isAccessError(error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <article className="surface max-w-md rounded-2xl p-8 text-center" role="alert">
        <h2 className="text-2xl font-semibold">
          {accessError
            ? dictionary.admin.accessTitle
            : language === "sr"
              ? "Došlo je do greške"
              : "Something went wrong"}
        </h2>
        <p className="mt-3 text-base text-muted">
          {accessError
            ? dictionary.admin.sessionExpired
            : language === "sr"
              ? "Stranica nije mogla da se učita. Pokušajte ponovo."
              : "The page could not be loaded. Please try again."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {accessError ? (
            <Link href="/auth?mode=signin&next=%2Fadmin" className="btn-primary min-h-11">
              {dictionary.admin.signIn}
            </Link>
          ) : (
            <button type="button" onClick={reset} className="btn-primary min-h-11">
              {language === "sr" ? "Pokušaj ponovo" : "Try again"}
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

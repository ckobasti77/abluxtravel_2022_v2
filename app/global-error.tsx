"use client";

// Last-resort error page when the root layout itself fails. It cannot rely on the
// layout (providers, fonts), so it is plain HTML with inline "putni dnevnik" colors.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="sr-Latn">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#F8F4EA", color: "#06151A", fontFamily: "Georgia, serif" }}>
        <main style={{ maxWidth: "32rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#9B3A2E", fontFamily: "system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Zastoj na putu
          </p>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 400, lineHeight: 1.15, margin: "0.75rem 0" }}>Nešto je zapelo na putu</h1>
          <p style={{ fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
            Stranica se nije učitala kako treba. Pokušajte ponovo ili se vratite na početnu.
          </p>
          <p style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ minHeight: 52, padding: "0 1.35rem", border: "1px solid #B99146", borderRadius: 8, background: "#D5A54F", color: "#06151A", fontWeight: 800, cursor: "pointer" }}
            >
              Pokušaj ponovo
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router may be broken here; a full reload is intended */}
            <a href="/" style={{ display: "inline-flex", alignItems: "center", minHeight: 52, padding: "0 1.35rem", border: "1px solid rgba(6,21,26,.18)", borderRadius: 8, color: "#06151A", fontWeight: 800, textDecoration: "none" }}>
              Početna
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}

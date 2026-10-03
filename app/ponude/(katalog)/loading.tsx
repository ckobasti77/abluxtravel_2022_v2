import { TicketSkeleton } from "@/components/ui";

export default function PonudeLoading() {
  return (
    <main id="main-content" className="cat-page" aria-busy="true">
      <header className="cat-head">
        <p className="ui-overline">Katalog ponuda</p>
        <h1 className="cat-head__title">Ponude za putovanja</h1>
      </header>
      <div className="cat-layout cat-layout--loading">
        <div className="cat-sidebar" aria-hidden="true" />
        <ul className="cat-grid" role="list">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <TicketSkeleton layout="stacked" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

"use client";

// Audit log (owner only): who changed what and when. Summaries never contain
// customer personal data.
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { PageIntro, Panel, SkeletonRows } from "../../../../components/admin/kit";
import { Button, EmptyState } from "../../../../components/ui";
import { formatWhen, useAdminT } from "../../../../lib/admin/format";
import { useSession } from "../../../../lib/use-session";

export default function AdminDnevnikPage() {
  const { t } = useAdminT();
  const session = useSession();
  if (!session?.isOwner) {
    return (
      <div className="adm-page">
        <Panel>
          <EmptyState title={t("Dnevnik vidi samo vlasnik", "Only the owner can see the log")} body={t("Ako Vam je potreban uvid, obratite se vlasniku agencije.", "If you need access, ask the agency owner.")} glyph="compass" />
        </Panel>
      </div>
    );
  }
  return <AuditLog />;
}

function AuditLog() {
  const { t, language } = useAdminT();
  const [limit, setLimit] = useState(100);
  const rows = useQuery(api.audit.list, { limit });
  return (
    <div className="adm-page">
      <PageIntro>
        {t(
          "Svaka izmena zaposlenih: ko je šta promenio i kada. Lični podaci klijenata se ovde ne upisuju.",
          "Every staff change: who changed what and when. Client personal data is never written here."
        )}
      </PageIntro>
      <Panel flush>
        {rows === undefined ? (
          <SkeletonRows rows={10} />
        ) : rows.length === 0 ? (
          <EmptyState title={t("Dnevnik je prazan", "The log is empty")} glyph="compass" />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="ui-sr-only">{t("Dnevnik izmena", "Audit log")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("Vreme", "Time")}</th>
                  <th scope="col">{t("Ko", "Who")}</th>
                  <th scope="col">{t("Radnja", "Action")}</th>
                  <th scope="col">{t("Detalji", "Details")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td className="adm-nowrap">{formatWhen(row.at, language)}</td>
                    <td>
                      {row.actorEmail ?? t("sistem", "system")}
                      {row.actorRole ? <span className="adm-row-meta">{row.actorRole}</span> : null}
                    </td>
                    <td>
                      <code>{row.action}</code>
                    </td>
                    <td className="adm-muted">{row.summary ?? row.targetTable ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows && rows.length === limit && limit < 200 ? (
          <div className="adm-panel__foot">
            <span />
            <Button size="sm" variant="secondary" onClick={() => setLimit(200)}>
              {t("Prikaži 200 poslednjih", "Show the last 200")}
            </Button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

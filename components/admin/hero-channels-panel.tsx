"use client";

// Read-only view of the home hero channels ("Živa razglednica"). The media
// come from public/media/hero/manifest.json (docs/design/hero-prompts.md), so
// a new clip needs a file and a manifest line, never code or a database row.
import type { HeroScenes, HeroSceneKey } from "../../lib/home/hero-manifest";
import { useAdminT } from "../../lib/admin/format";
import { StatusDot } from "../ui";
import { Panel, Thumb } from "./kit";

const NAMES: Record<HeroSceneKey, { sr: string; en: string; role: { sr: string; en: string } }> = {
  hodocasca: { sr: "Hodočašća", en: "Pilgrimages", role: { sr: "Kanal 1 (podrazumevani)", en: "Channel 1 (default)" } },
  mediteran: { sr: "Mediteran", en: "Mediterranean", role: { sr: "Kanal 2", en: "Channel 2" } },
  evropa: { sr: "Evropa", en: "Europe", role: { sr: "Kanal 3", en: "Channel 3" } },
  ostrog: { sr: "Ostrog", en: "Ostrog", role: { sr: "Verski turizam", en: "Religious tourism" } },
  rentabus: { sr: "Rent a bus", en: "Rent a bus", role: { sr: "Iznajmljivanje vozila", en: "Vehicle rental" } },
};

export default function HeroChannelsPanel({ scenes }: { scenes: HeroScenes }) {
  const { t, language } = useAdminT();
  const keys = Object.keys(NAMES) as HeroSceneKey[];
  return (
    <Panel
      id="hero-channels"
      title={t("Kanali heroja „Živa razglednica”", "Hero channels \"Living postcard\"")}
      sub={t(
        "Snimci i posteri se menjaju zamenom fajlova u public/media/hero/ i upisom u manifest.json (posao za developera). Ovde vidite šta je trenutno na sajtu.",
        "Clips and posters change by replacing files in public/media/hero/ and listing them in manifest.json (a developer task). Here you see what is live now."
      )}
      flush
    >
      <div className="adm-table-wrap">
        <table className="adm-table">
          <caption className="ui-sr-only">{t("Kanali heroja", "Hero channels")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("Scena", "Scene")}</th>
              <th scope="col">{t("Računar", "Desktop")}</th>
              <th scope="col">{t("Telefon", "Phone")}</th>
              <th scope="col">{t("Poster", "Poster")}</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const scene = scenes[key];
              const name = NAMES[key];
              const poster = scene.desktop.poster;
              return (
                <tr key={key}>
                  <td>
                    <span className="adm-row" style={{ flexWrap: "nowrap" }}>
                      {poster ? <Thumb src={poster} /> : <span className="adm-thumb" aria-hidden="true" />}
                      <span>
                        <span className="adm-row-title">{language === "en" ? name.en : name.sr}</span>
                        <span className="adm-row-meta">{language === "en" ? name.role.en : name.role.sr}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <StatusDot status={scene.desktop.mp4 ? "active" : "off"} label={scene.desktop.mp4 ? t("Video", "Video") : t("Fotografija", "Still")} />
                  </td>
                  <td>
                    <StatusDot status={scene.mobile.mp4 ? "active" : "off"} label={scene.mobile.mp4 ? t("Video", "Video") : t("Fotografija", "Still")} />
                  </td>
                  <td>
                    <StatusDot
                      status={scene.usesFallback ? "warning" : "active"}
                      label={scene.usesFallback ? t("Rezervna slika", "Fallback image") : t("Iz manifesta", "From the manifest")}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

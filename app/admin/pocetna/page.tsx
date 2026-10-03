import HeroChannelsPanel from "../../../components/admin/hero-channels-panel";
import HomeRouteSwiperEditor from "../../../components/home-route-swiper-editor";
import { loadHeroScenes } from "../../../lib/home/hero-manifest.server";

export default async function AdminPocetnaPage() {
  const scenes = await loadHeroScenes();
  return (
    <div className="adm-page">
      <HomeRouteSwiperEditor />
      <HeroChannelsPanel scenes={scenes} />
    </div>
  );
}

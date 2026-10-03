export type HomeRouteSwiperDefault = {
  id: string;
  title: {
    sr: string;
    en: string;
  };
  caption: {
    sr: string;
    en: string;
  };
  src: string;
  accent: string;
};

export const HOME_ROUTE_SWIPER_DEFAULTS: HomeRouteSwiperDefault[] = [
  {
    id: "pilgrimage",
    title: {
      sr: "Sveti gradovi i hodočašća",
      en: "Sacred cities and pilgrimages",
    },
    caption: {
      sr: "Destinacija 01",
      en: "Destination 01",
    },
    src: "/home-swiper/20251120_155602.avif",
    accent: "#9b3a2e",
  },
  {
    id: "coast",
    title: {
      sr: "Leto na Mediteranu",
      en: "Mediterranean summer",
    },
    caption: {
      sr: "Destinacija 02",
      en: "Destination 02",
    },
    src: "/home-swiper/20251120_160325.avif",
    accent: "#0e7c7b",
  },
  {
    id: "north",
    title: {
      sr: "Severne prirodne ture",
      en: "Northern nature routes",
    },
    caption: {
      sr: "Destinacija 03",
      en: "Destination 03",
    },
    src: "/home-swiper/20251213_144248.avif",
    accent: "#2f6f73",
  },
  {
    id: "desert",
    title: {
      sr: "Pustinjske i istorijske ture",
      en: "Desert and heritage tours",
    },
    caption: {
      sr: "Destinacija 04",
      en: "Destination 04",
    },
    src: "/home-swiper/20251213_144402.avif",
    accent: "#b99146",
  },
  {
    id: "city",
    title: {
      sr: "Evropske gradske ture",
      en: "European city breaks",
    },
    caption: {
      sr: "Destinacija 05",
      en: "Destination 05",
    },
    src: "/home-swiper/20251229_233453.avif",
    accent: "#06151a",
  },
];

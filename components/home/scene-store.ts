"use client";

import { create } from "zustand";
import { HERO_CHANNELS, type HeroChannelKey } from "../../lib/home/hero-manifest";

type SceneState = {
  /** Hero channel on screen; the landing postcard below the hero shows the same scene. */
  active: HeroChannelKey;
  setActive: (key: HeroChannelKey) => void;
};

export const useHeroScene = create<SceneState>((set) => ({
  active: HERO_CHANNELS[0],
  setActive: (key) => set({ active: key }),
}));

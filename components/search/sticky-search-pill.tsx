"use client";

import { Search } from "lucide-react";
import { useSitePreferences } from "../site-preferences-provider";
import { cn } from "../ui/cn";

type StickySearchPillProps = {
  visible: boolean;
  /** The navigation has slid away: the pill moves up with it and docks at the top edge. */
  docked?: boolean;
  onOpen: () => void;
};

/**
 * "Kuda putujete?" pill that docks under the navigation once the page hero has
 * scrolled away. Opens the search dialog (desktop) or sheet (phone).
 */
export function StickySearchPill({ visible, docked = false, onOpen }: StickySearchPillProps) {
  const { dictionary } = useSitePreferences();
  const copy = dictionary.chrome;

  return (
    <div className={cn("tsearch-pill", visible && "tsearch-pill--visible", docked && "tsearch-pill--docked")} inert={!visible} aria-hidden={!visible}>
      <button type="button" className="tsearch-pill__button" onClick={onOpen} aria-haspopup="dialog">
        <Search className="tsearch-pill__icon" aria-hidden="true" strokeWidth={1.75} />
        <span className="tsearch-pill__text">
          <strong>{copy.searchTitle}</strong>
          <span>{copy.pillEmpty}</span>
        </span>
        <span className="tsearch-pill__go" aria-hidden="true">
          <Search strokeWidth={2} />
        </span>
      </button>
    </div>
  );
}

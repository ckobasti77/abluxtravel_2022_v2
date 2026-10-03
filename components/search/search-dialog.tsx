"use client";

import { Dialog } from "../ui/dialog";
import { useSitePreferences } from "../site-preferences-provider";
import { useMediaQuery } from "../../lib/use-media-query";
import type { TripSearchParams } from "../../lib/search/trip-search";
import { TripSearch } from "./trip-search";

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
  initial?: TripSearchParams;
};

/** The search as a centered dialog on desktop and a bottom sheet on phones. */
export function SearchDialog({ open, onClose, initial }: SearchDialogProps) {
  const { dictionary, language } = useSitePreferences();
  const isPhone = useMediaQuery("(max-width: 767px)");
  const copy = dictionary.chrome;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.searchTitle}
      variant={isPhone ? "sheet" : "dialog"}
      closeLabel={language === "sr" ? "Zatvori" : "Close"}
      className="tsearch-dialog"
    >
      {/* Remount on every open so the form starts from the current URL. */}
      {open ? <TripSearch variant="panel" initial={initial} onSubmitted={onClose} /> : null}
    </Dialog>
  );
}

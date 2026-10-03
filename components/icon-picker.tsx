"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { icons, type LucideProps } from "lucide-react";
import Fuse from "fuse.js";

const ALL_ICON_NAMES = Object.keys(icons);
const PAGE_SIZE = 72;

const fuse = new Fuse(ALL_ICON_NAMES, {
  threshold: 0.35,
  distance: 80,
});

type IconPickerProps = {
  value: string;
  onChange: (name: string) => void;
  label?: string;
};

function RenderIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Comp = icons[name as keyof typeof icons];
  return Comp ? <Comp {...props} /> : null;
}

export default function IconPicker({ value, onChange, label }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_ICON_NAMES;
    return fuse.search(query.trim()).map((r) => r.item);
  }, [query]);

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  );
  const hasMore = visible.length < filtered.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const openPicker = useCallback(() => {
    setQuery("");
    setPage(1);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <div className="icon-picker">
      {label && (
        <label className="icon-picker__label">{label}</label>
      )}
      <button
        type="button"
        className="icon-picker__trigger"
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        {value ? (
          <>
            <RenderIcon name={value} size={18} />
            <span className="icon-picker__trigger-name">{value}</span>
          </>
        ) : (
          <span className="text-muted">Select icon...</span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="icon-picker__panel">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search icons..."
            className="icon-picker__search"
          />
          <div className="icon-picker__grid">
            {visible.map((name) => (
              <button
                key={name}
                type="button"
                className={`icon-picker__icon ${value === name ? "icon-picker__icon--active" : ""}`}
                onClick={() => handleSelect(name)}
                title={name}
              >
                <RenderIcon name={name} size={18} />
              </button>
            ))}
            {visible.length === 0 && (
              <p className="icon-picker__empty">No results</p>
            )}
          </div>
          {hasMore && (
            <button
              type="button"
              className="icon-picker__more"
              onClick={() => setPage((p) => p + 1)}
            >
              Load more...
            </button>
          )}
        </div>
      )}
    </div>
  );
}

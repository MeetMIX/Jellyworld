'use client';

import { useState } from "react";
import PlayerModal from "./PlayerModal";

interface Version {
  Id: string;
  Name: string;
  MediaStreams?: any[];
  Path?: string;
}

interface WatchButtonProps {
  itemId: string;
  itemName: string;
  versions: Version[];
}

export default function WatchButton({ itemId, itemName, versions }: WatchButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "12px 28px", borderRadius: "var(--jw-r-md)",
          background: "var(--jw-gradient)", border: "none",
          fontSize: 13, fontWeight: 700, color: "#fff",
          cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        Regarder
      </button>

      {open && (
        <PlayerModal
          itemId={itemId}
          itemName={itemName}
          versions={versions}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

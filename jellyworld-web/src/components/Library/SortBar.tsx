'use client';

import { useRouter, useSearchParams } from "next/navigation";

type SortField = "SortName" | "PremiereDate" | "DateCreated" | "CommunityRating";
type SortDir = "Ascending" | "Descending";

interface SortBarProps { libraryId: string; total: number; currentSort: SortField; currentDir: SortDir; }

const SORTS: { value: SortField; label: string }[] = [
  { value: "SortName",        label: "Alphabétique" },
  { value: "PremiereDate",    label: "Date de sortie" },
  { value: "DateCreated",     label: "Date d'ajout" },
  { value: "CommunityRating", label: "Note" },
];

export default function SortBar({ libraryId, total, currentSort, currentDir }: SortBarProps) {
  const router = useRouter();

  function setSort(field: SortField) {
    const newDir: SortDir = field === currentSort
      ? (currentDir === "Ascending" ? "Descending" : "Ascending")
      : (field === "CommunityRating" ? "Descending" : "Ascending");
    router.push(`/${libraryId}?sort=${field}&dir=${newDir}&page=0`);
  }

  const btn = (field: SortField): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 8, cursor: "pointer",
    fontSize: 12, fontWeight: currentSort === field ? 700 : 500,
    background: currentSort === field ? "rgba(139,63,200,0.2)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${currentSort === field ? "rgba(139,63,200,0.45)" : "rgba(255,255,255,0.08)"}`,
    color: currentSort === field ? "#A06EF0" : "rgba(255,255,255,0.55)",
    display: "inline-flex", alignItems: "center", gap: 5, transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  function DirIcon({ field }: { field: SortField }) {
    if (currentSort !== field) return null;
    return currentDir === "Ascending"
      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>;
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      padding: "12px 0", marginBottom: 8,
    }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginRight: 4, whiteSpace: "nowrap" }}>
        {total} éléments · Trier par
      </span>
      {SORTS.map(s => (
        <button key={s.value} onClick={() => setSort(s.value)} style={btn(s.value)}>
          {s.label}
          <DirIcon field={s.value} />
        </button>
      ))}
    </div>
  );
}

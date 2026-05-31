import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  search,
  basePath,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  search: string;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  function makeHref(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${basePath}${qs ? "?" + qs : ""}`;
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between pt-4 text-sm" style={{ borderTop: "1px solid var(--glass-border-subtle)" }}>
      <span style={{ color: "var(--text-tertiary)" }}>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={makeHref(page - 1)}
            className="px-3 py-1 rounded-[var(--radius-sm)] border text-sm transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
          >
            ← Prev
          </Link>
        ) : (
          <span
            className="px-3 py-1 text-sm opacity-30 cursor-not-allowed"
            style={{ color: "var(--text-tertiary)" }}
          >
            ← Prev
          </span>
        )}
        <span className="text-xs tabular-nums px-1" style={{ color: "var(--text-tertiary)" }}>
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={makeHref(page + 1)}
            className="px-3 py-1 rounded-[var(--radius-sm)] border text-sm transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--glass-border)", color: "var(--text-secondary)" }}
          >
            Next →
          </Link>
        ) : (
          <span
            className="px-3 py-1 text-sm opacity-30 cursor-not-allowed"
            style={{ color: "var(--text-tertiary)" }}
          >
            Next →
          </span>
        )}
      </div>
    </div>
  );
}

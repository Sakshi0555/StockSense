import { formatQty } from "@/lib/constants";

export type DayFlow = { label: string; in: number; out: number };

// Grouped bar chart of stock coming in vs going out per day (plain SVG, no chart library).
export function InOutChart({ days }: { days: DayFlow[] }) {
  const W = 480;
  const H = 200;
  const pad = { top: 20, bottom: 28, left: 8, right: 8 };
  const plotH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...days.flatMap((d) => [d.in, d.out]));
  const group = (W - pad.left - pad.right) / days.length;
  const bar = Math.min(22, group / 3);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Stock in vs out, last 7 days">
        <line x1={pad.left} x2={W - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="#3f3f46" />
        {days.map((d, i) => {
          const cx = pad.left + group * i + group / 2;
          return (
            <g key={d.label}>
              {[
                { v: d.in, x: cx - bar - 1, fill: "#34d399" },
                { v: d.out, x: cx + 1, fill: "#fb7185" },
              ].map((b, j) =>
                b.v > 0 ? (
                  <g key={j}>
                    <rect x={b.x} y={y(b.v)} width={bar} height={pad.top + plotH - y(b.v)} rx={3} fill={b.fill}>
                      <title>{`${d.label}: ${j === 0 ? "in" : "out"} ${formatQty(b.v)}`}</title>
                    </rect>
                    <text x={b.x + bar / 2} y={y(b.v) - 4} textAnchor="middle" fontSize="10" fill="#a1a1aa">
                      {formatQty(b.v)}
                    </text>
                  </g>
                ) : null,
              )}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#a1a1aa">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Stock in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Stock out
        </span>
      </div>
    </div>
  );
}

// Horizontal bars: inventory value per category.
export function CategoryValueChart({ rows }: { rows: { name: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-zinc-300">{r.name}</span>
            <span className="text-zinc-400">
              ₹{Math.round(r.value).toLocaleString("en-IN")} · {total ? Math.round((r.value / total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-800">
            <div className="h-2.5 rounded-full bg-rose-400" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="border-t border-zinc-800 pt-2 text-right text-sm">
        Total inventory value: <span className="font-semibold text-zinc-100">₹{Math.round(total).toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

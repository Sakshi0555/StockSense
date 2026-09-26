// Code 39 barcode rendered as SVG, readable by any USB/phone barcode scanner.
// Bit patterns (1 = bar module, 0 = space) are the standard Code 39 table.
const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*";
const ENCODINGS = [
  20957, 29783, 23639, 30485, 20951, 29813, 23669, 20855, 29789, 23645, 29975, 23831, 30533, 22295, 30149, 24005, 21623,
  29981, 23837, 22301, 30023, 23879, 30545, 22343, 30161, 24017, 21959, 30065, 23921, 22385, 29015, 18263, 29141, 17879,
  29045, 18293, 17783, 29021, 18269, 17477, 17489, 17681, 20753, 35770,
];

const bits = (c: string) => ENCODINGS[CHARS.indexOf(c)].toString(2);

export function encodeCode39(text: string) {
  const data = text.toUpperCase();
  const bad = [...data].find((c) => !CHARS.includes(c) || c === "*");
  if (bad !== undefined) throw new Error(`Character "${bad}" cannot be encoded in Code 39.`);
  return bits("*") + [...data].map((c) => bits(c) + "0").join("") + bits("*");
}

export function Barcode({ value, height = 56, module = 2 }: { value: string; height?: number; module?: number }) {
  const pattern = encodeCode39(value);
  const quiet = 10 * module;
  const width = pattern.length * module + quiet * 2;

  // Merge runs of 1s into single rects to keep the SVG small.
  const bars: { x: number; w: number }[] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "1") continue;
    const last = bars[bars.length - 1];
    if (last && last.x + last.w === quiet + i * module) last.w += module;
    else bars.push({ x: quiet + i * module, w: module });
  }

  return (
    <svg width={width} height={height + 18} viewBox={`0 0 ${width} ${height + 18}`} role="img" aria-label={`Barcode ${value}`}>
      <rect width={width} height={height + 18} fill="#fff" />
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={height} fill="#000" />
      ))}
      <text x={width / 2} y={height + 14} textAnchor="middle" fontFamily="monospace" fontSize="12" fill="#000">
        {value}
      </text>
    </svg>
  );
}

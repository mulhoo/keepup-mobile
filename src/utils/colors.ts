function hexToHsl(hex: string): {h: number; s: number; l: number} {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return {h: 0, s: 0, l: l * 100};
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return {h: h * 360, s: s * 100, l: l * 100};
}

function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Returns `count` shades sharing the hue of `hex`, spread across a lightness
// range dark enough for white text. Saturation is capped at 45% to avoid
// neon/electric tones; lightness spans 28–44%.
export function generateShades(hex: string, count: number): string[] {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return Array(count).fill('#2563EB');
  }
  const {h, s} = hexToHsl(hex);
  const sat = Math.min(Math.max(s, 35), 45);
  const step = count > 1 ? 16 / (count - 1) : 0;
  return Array.from({length: count}, (_, i) => hslToHex(h, sat, 28 + i * step));
}

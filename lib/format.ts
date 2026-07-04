export function formatCurrency(n: number): string {
  if (n === 0) return 'S$0';
  if (n < 1) return 'S$' + n.toFixed(2);
  if (n >= 1000) return 'S$' + (n / 1000).toFixed(1) + 'k';
  return 'S$' + n.toFixed(2);
}

export function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

export function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

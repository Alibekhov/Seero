export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minut`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} soat`;
}


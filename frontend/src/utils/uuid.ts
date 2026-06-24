// Simple UUID v4 generator without importing uuid directly
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncate(str: string, length = 50): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function getGradeColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 75) return 'text-blue-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 45) return 'text-orange-400';
  return 'text-red-400';
}

export function getTrustClass(score: number): string {
  if (score >= 75) return 'trust-high';
  if (score >= 45) return 'trust-medium';
  return 'trust-low';
}

export function getTrustLabel(score: number): string {
  if (score >= 75) return 'Verified';
  if (score >= 45) return 'Partially Verified';
  return 'Unverified';
}

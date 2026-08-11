export function loadColumnVisibility(storageKey: string, defaults: string[]): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaults;
  } catch {
    return defaults;
  }
}

export function saveColumnVisibility(storageKey: string, keys: string[]) {
  localStorage.setItem(storageKey, JSON.stringify(keys));
}

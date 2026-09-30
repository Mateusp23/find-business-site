export const STORAGE_KEYS = {
  leads: "fb:leads:v1",
  settings: "fb:settings:v1",
  analysis: "fb:analysis:v1",
} as const;

export function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveToStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // modo privado / cota cheia: segue sem persistir
  }
}

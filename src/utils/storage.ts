const KEY = "patchpal_state_v1";

export function saveState<T>(state: T): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadState<T>(): T | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

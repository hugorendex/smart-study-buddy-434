/**
 * Utilitário seguro para acesso a localStorage e sessionStorage.
 * Previne exceções de segurança (SecurityError / DOMException) quando
 * o portal é executado dentro de iframes (como o preview do Lovable)
 * ou em navegadores com bloqueio de cookies e dados locais.
 */

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.setItem(key, value);
    } catch {}
  },
  removeItem(key: string): void {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch {}
  },
};

export const safeSession = {
  getItem(key: string): string | null {
    try {
      if (typeof window === "undefined" || !window.sessionStorage) return null;
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window === "undefined" || !window.sessionStorage) return;
      window.sessionStorage.setItem(key, value);
    } catch {}
  },
  removeItem(key: string): void {
    try {
      if (typeof window === "undefined" || !window.sessionStorage) return;
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};

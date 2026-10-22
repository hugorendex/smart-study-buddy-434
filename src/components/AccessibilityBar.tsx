import { useEffect, useState } from "react";
import { Moon, Sun, ZoomIn, ZoomOut, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccessibilityBar() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("portal_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const [fontSizeLevel, setFontSizeLevel] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("portal_font_level");
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("portal_contrast") === "high";
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("portal_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("portal_theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    // Map levels -1, 0, 1, 2 to font-size percentages
    const sizes: Record<number, string> = {
      [-1]: "90%",
      [0]: "100%",
      [1]: "112.5%",
      [2]: "125%",
    };
    root.style.fontSize = sizes[fontSizeLevel] || "100%";
    localStorage.setItem("portal_font_level", fontSizeLevel.toString());
  }, [fontSizeLevel]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add("high-contrast");
      localStorage.setItem("portal_contrast", "high");
    } else {
      root.classList.remove("high-contrast");
      localStorage.setItem("portal_contrast", "normal");
    }
  }, [highContrast]);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const increaseFont = () => setFontSizeLevel((prev) => Math.min(prev + 1, 2));
  const decreaseFont = () => setFontSizeLevel((prev) => Math.max(prev - 1, -1));
  const resetAccessibility = () => {
    setFontSizeLevel(0);
    setHighContrast(false);
  };
  const toggleContrast = () => setHighContrast((prev) => !prev);

  return (
    <aside
      aria-label="Controles de Acessibilidade e Tema"
      className="border-b border-white/10 bg-black/30 text-xs text-white backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-1.5">
        <div className="flex items-center gap-1.5 font-medium opacity-90">
          <Eye className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          <span className="hidden sm:inline">Acessibilidade:</span>
          
          <div className="flex items-center gap-1" role="group" aria-label="Tamanho do texto">
            <button
              type="button"
              onClick={decreaseFont}
              disabled={fontSizeLevel <= -1}
              title="Diminuir texto (A-)"
              aria-label="Diminuir tamanho do texto"
              className="inline-flex h-6 items-center gap-0.5 rounded px-2 font-semibold text-white/90 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomOut className="h-3 w-3" aria-hidden="true" />
              <span>A-</span>
            </button>

            <button
              type="button"
              onClick={increaseFont}
              disabled={fontSizeLevel >= 2}
              title="Aumentar texto (A+)"
              aria-label="Aumentar tamanho do texto"
              className="inline-flex h-6 items-center gap-0.5 rounded px-2 font-semibold text-white/90 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomIn className="h-3 w-3" aria-hidden="true" />
              <span>A+</span>
            </button>

            <button
              type="button"
              onClick={toggleContrast}
              title={highContrast ? "Desativar alto contraste" : "Ativar alto contraste"}
              aria-pressed={highContrast}
              className={`inline-flex h-6 items-center gap-1 rounded px-2 font-medium transition ${
                highContrast
                  ? "bg-accent font-bold text-accent-foreground"
                  : "text-white/90 hover:bg-white/20"
              }`}
            >
              <span>{highContrast ? "Contraste Alto Ativo" : "Alto Contraste"}</span>
            </button>

            {(fontSizeLevel !== 0 || highContrast) && (
              <button
                type="button"
                onClick={resetAccessibility}
                title="Redefinir acessibilidade"
                aria-label="Redefinir tamanho e contraste do texto"
                className="inline-flex h-6 items-center gap-1 rounded px-2 text-white/70 hover:bg-white/20 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span className="hidden md:inline">Redefinir</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo noturno"}
            title={isDark ? "Mudar para modo claro" : "Mudar para modo noturno"}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-3 font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                <span>Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-blue-200" aria-hidden="true" />
                <span>Modo Noturno</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

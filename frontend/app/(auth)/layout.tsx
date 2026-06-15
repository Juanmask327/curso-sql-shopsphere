import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Acceso",
    template: "%s | ShopSphere SQL",
  },
};

// ===================================================================
// Auth Layout — Centered, full-screen, no sidebar.
// Shared by /login and /registro.
// ===================================================================
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Top stripe — brand accent */}
      <div className="h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 shrink-0" />

      {/* Header — logo only, no nav */}
      <header className="flex items-center justify-center pt-10 pb-2 px-4">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="ShopSphere SQL Course — inicio">
          {/* Logo mark */}
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-primary transition-transform group-hover:scale-105">
            <span className="text-white font-bold text-lg select-none">S</span>
          </div>
          <div>
            <span className="font-bold text-neutral-900 text-lg leading-none tracking-tight">
              ShopSphere{" "}
              <span className="text-primary-500">SQL</span>
            </span>
            <p className="text-xs text-neutral-400 leading-none mt-0.5">
              Curso de analítica con datos reales
            </p>
          </div>
        </Link>
      </header>

      {/* Main — vertically centered card area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-neutral-400">
          ShopSphere SQL Course · MVP v0.1 · Datos de prueba
        </p>
      </footer>
    </div>
  );
}

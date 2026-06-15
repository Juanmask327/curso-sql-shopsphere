import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-store";
import { XPNotificationProvider } from "@/lib/xp-context";

export const metadata: Metadata = {
  title: {
    default: "ShopSphere SQL Course",
    template: "%s | ShopSphere SQL",
  },
  description:
    "Aprende SQL con datos reales de una empresa de e-commerce latinoamericana. Ejercicios prácticos, feedback instantáneo y contexto de negocio real.",
  keywords: ["SQL", "curso SQL", "e-commerce", "analytics", "data analyst"],
  openGraph: {
    title: "ShopSphere SQL Course",
    description: "Aprende SQL con datos reales de e-commerce latinoamericano",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Viewport meta */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen antialiased" style={{ backgroundColor: "rgb(253, 252, 250)" }}>
        <AuthProvider>
          <XPNotificationProvider>
            {children}
          </XPNotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

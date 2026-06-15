"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { storeTokens } from "@/lib/api-client";

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Tokens en hash fragment — no se envían al servidor, no aparecen en access logs
    const hash = window.location.hash.slice(1);
    if (!hash) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access");
    const refreshToken = params.get("refresh");

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    // Limpiar hash de la URL inmediatamente (higiene de seguridad)
    window.history.replaceState(null, "", window.location.pathname);

    storeTokens({ accessToken, refreshToken, expiresIn: 900 });
    const isNewUser = params.get("new") === "1";
    router.replace(isNewUser ? "/diagnostic" : "/dashboard");
  }, [router]);

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-neutral-500">Iniciando sesión con Google...</p>
      </div>
    </div>
  );
}

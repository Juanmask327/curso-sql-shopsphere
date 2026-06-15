"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api-client";

// ===================================================================
// AuthGuard — HOC that redirects to /login if no token is present.
//
// Usage:
//   export default function ProtectedPage() {
//     return (
//       <AuthGuard>
//         <PageContent />
//       </AuthGuard>
//     );
//   }
// ===================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  /** Where to redirect unauthenticated users. Defaults to /login. */
  redirectTo?: string;
  /**
   * Optional fallback to render while the auth check is in progress.
   * Defaults to a blank screen to avoid layout flash.
   */
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  redirectTo = "/login",
  fallback = null,
}: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      // Preserve the intended destination so we can redirect back after login
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl =
        redirectTo +
        (currentPath !== "/" ? `?next=${encodeURIComponent(currentPath)}` : "");
      router.replace(loginUrl);
    } else {
      setChecking(false);
    }
  }, [router, redirectTo]);

  if (checking) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

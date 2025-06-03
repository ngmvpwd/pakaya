import { ReactNode } from "react";
import { getAuthState } from "@/lib/auth";

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const user = getAuthState().user;
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
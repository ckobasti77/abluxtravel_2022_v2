import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import AdminAccessDenied from "../../components/admin/admin-access-denied";
import AdminFrame from "../../components/admin/admin-frame";

type AdminLayoutProps = {
  children: ReactNode;
};

// Server-side guard: the session cookie is verified by Convex (users.me).
// proxy.ts already redirects anonymous visitors; this also checks the role.
// Every admin Convex function enforces the role again on its own.
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const token = await convexAuthNextjsToken();
  const me = token
    ? await fetchQuery(api.users.me, {}, { token }).catch(() => null)
    : null;

  if (!me) {
    redirect("/auth?mode=signin&next=%2Fadmin");
  }

  if (!me.isStaff) {
    return <AdminAccessDenied />;
  }

  return <AdminFrame>{children}</AdminFrame>;
}

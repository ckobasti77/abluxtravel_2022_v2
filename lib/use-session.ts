import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Role } from "../convex/lib/roles";

// The signed-in user as verified by Convex (users.me), or null.
export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: Role;
  isStaff: boolean;
  isOwner: boolean;
};

export type SessionState = {
  status: "loading" | "anonymous" | "authenticated";
  session: SessionUser | null;
};

export const useSessionState = (): SessionState => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && me === undefined)) {
    return { status: "loading", session: null };
  }
  if (!isAuthenticated || !me) {
    return { status: "anonymous", session: null };
  }
  return {
    status: "authenticated",
    session: {
      id: me._id,
      firstName: me.firstName,
      lastName: me.lastName,
      displayName: me.displayName,
      email: me.email,
      role: me.role,
      isStaff: me.isStaff,
      isOwner: me.isOwner,
    },
  };
};

export const useSession = (): SessionUser | null => useSessionState().session;

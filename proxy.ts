// Next 16 proxy (formerly middleware). Convex Auth: proxies POST /api/auth
// (sign-in/out), refreshes the httpOnly auth cookies and protects /admin.
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin", "/admin/(.*)"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isAdminRoute(request) && !(await convexAuth.isAuthenticated())) {
      const next = request.nextUrl.pathname + request.nextUrl.search;
      return nextjsMiddlewareRedirect(
        request,
        `/auth?mode=signin&next=${encodeURIComponent(next)}`
      );
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 14 } }
);

export const config = {
  // All routes except static assets and Next internals.
  matcher: ["/((?!.*\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function proxy(request: NextRequest) {
    const authRes = await auth0.middleware(request);

    // Authentication routes — let the Auth0 middleware handle it.
    if (request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname.startsWith("/api")) {
        return authRes;
    }

    const { origin } = new URL(request.url);
    const session = await auth0.getSession(request);

    // User does not have a session — redirect to login.
    if (!session) {
        return NextResponse.redirect(`${origin}/auth/login`);
    }

    return authRes;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - images (public images)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         * Note: / (root) is NO LONGER excluded ($ removed from lookahead)
         */
        "/((?!_next/static|_next/image|images|favicon.[ico|png]|sitemap.xml|robots.txt).*)"
    ]
};

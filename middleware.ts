import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // API routes that require authentication
  const protectedApiRoutes = ['/api/technician-grade'];
  
  // Paths that require authentication
  const authRoutes = [
    '/history',
    '/dashboard',
    '/profile'
  ];
  
  // Check if the path is protected
  const isAuthRoute = authRoutes.some(route => path.startsWith(route));
  const isProtectedApi = protectedApiRoutes.some(route => path.startsWith(route));
  
  // If it's not a protected route, continue
  if (!isAuthRoute && !isProtectedApi) {
    return NextResponse.next();
  }
    // Get the session token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  // If the user is not authenticated and is trying to access a protected route,
  // redirect them to the login page
  if (!token && isAuthRoute) {
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }
    // If they're not authenticated and trying to access a protected API route
  if (!token && isProtectedApi) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
  
  return NextResponse.next();
}

// Configure matchers for the middleware
export const config = {
  matcher: [
    '/api/technician-grade/:path*',
    '/history/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
  ]
};

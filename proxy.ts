import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Allow all requests to pass directly to individual API routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Úplne vypnúť middleware pre development
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(new URL('/?error=missing_params', request.url));
  }

  const redirectUrl = new URL(`/?oauth_verifier=${oauthVerifier}`, request.url);
  return NextResponse.redirect(redirectUrl);
}
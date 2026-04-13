import { NextRequest, NextResponse } from 'next/server';
import { accessToken, getUserIdentity } from '@/lib/discogs';

const OAUTH_BASE_URL = process.env.OAUTH_BASE_URL || 'https://random.minitrash.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');

  console.log('OAuth callback received:', { oauthToken, oauthVerifier });

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(new URL(`/?error=missing_params`, OAUTH_BASE_URL));
  }

  const redirectUrl = `/?oauth_token=${encodeURIComponent(oauthToken)}&oauth_verifier=${encodeURIComponent(oauthVerifier)}`;
  return NextResponse.redirect(new URL(redirectUrl, OAUTH_BASE_URL));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oauthToken, oauthTokenSecret, verifier } = body;

    if (!oauthToken || !oauthTokenSecret || !verifier) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const accessTokenData = await accessToken(
      oauthToken,
      oauthTokenSecret,
      verifier
    );

    if (!accessTokenData.access_token) {
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 500 }
      );
    }

    const user = await getUserIdentity(
      accessTokenData.access_token,
      accessTokenData.access_token_secret
    );

    return NextResponse.json({
      accessToken: accessTokenData.access_token,
      accessTokenSecret: accessTokenData.access_token_secret,
      username: user.username,
      userId: user.id,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Failed to complete OAuth' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { requestToken, getAuthorizeUrl } from '@/lib/discogs';

export async function POST() {
  try {
    const tokenData = await requestToken();

    if (!tokenData.oauth_token) {
      return NextResponse.json(
        { error: 'Failed to get request token' },
        { status: 500 }
      );
    }

    const authorizeUrl = getAuthorizeUrl(tokenData.oauth_token);

    return NextResponse.json({
      authorizeUrl,
      oauthToken: tokenData.oauth_token,
      oauthTokenSecret: tokenData.oauth_token_secret,
    });
  } catch (error) {
    console.error('OAuth request token error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
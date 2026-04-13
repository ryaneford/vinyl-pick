import { NextRequest, NextResponse } from 'next/server';
import { fetchEntireCollection, type DiscogsRelease } from '@/lib/discogs';

interface RequestBody {
  accessToken: string;
  accessTokenSecret: string;
  username: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { accessToken, accessTokenSecret, username } = body;

    if (!accessToken || !accessTokenSecret || !username) {
      return NextResponse.json(
        { error: 'Missing auth parameters' },
        { status: 400 }
      );
    }

    const releases = await fetchEntireCollection(
      accessToken,
      accessTokenSecret,
      username
    );

    return NextResponse.json({ releases });
  } catch (error) {
    console.error('Collection fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}
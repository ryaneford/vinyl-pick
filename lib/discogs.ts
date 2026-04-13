import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';

const CONSUMER_KEY = process.env.DISCOGS_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET || '';
const API_BASE = 'https://api.discogs.com';

export interface DiscogsRelease {
  id: number;
  instance_id: number;
  title: string;
  year: number;
  thumb: string;
  cover_image: string;
  resource_url: string;
  formats: { name: string; descriptions: string[] }[];
  artists: { name: string }[];
}

export interface CollectionResponse {
  releases: {
    id: number;
    instance_id: number;
    basic_information: {
      id: number;
      title: string;
      year: number;
      thumb: string;
      cover_image: string;
      resource_url: string;
      formats: { name: string; descriptions: string[] }[];
      artists: { name: string }[];
    };
  }[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
}

export interface UserIdentity {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
  resource_url: string;
}

function createOAuthClient() {
  return new OAuth({
    consumer: {
      key: CONSUMER_KEY,
      secret: CONSUMER_SECRET,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string: string, key: string) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    },
  });
}

export async function requestToken(): Promise<{
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: string;
}> {
  const oauth = createOAuthClient();
  const url = `${API_BASE}/oauth/request_token`;
  const callbackUrl = process.env.NEXT_PUBLIC_OAUTH_CALLBACK || 'https://random.minitrash.com/api/oauth/callback';

  const requestData = {
    url,
    method: 'POST',
    data: { oauth_callback: callbackUrl },
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'VinylPick/1.0 +https://random.minitrash.com',
      'Authorization': authHeader.Authorization,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const text = await response.text();
  const params = new URLSearchParams(text);

  return {
    oauth_token: params.get('oauth_token') || '',
    oauth_token_secret: params.get('oauth_token_secret') || '',
    oauth_callback_confirmed: params.get('oauth_callback_confirmed') || '',
  };
}

export function getAuthorizeUrl(oauthToken: string): string {
  return `https://www.discogs.com/oauth/authorize?oauth_token=${oauthToken}`;
}

export async function accessToken(
  oauthToken: string,
  oauthTokenSecret: string,
  verifier: string
): Promise<{ access_token: string; access_token_secret: string }> {
  const oauth = createOAuthClient();
  const url = `${API_BASE}/oauth/access_token`;
  const token = { key: oauthToken, secret: oauthTokenSecret };

  const requestData = {
    url,
    method: 'POST',
    data: { oauth_verifier: verifier },
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'VinylPick/1.0 +https://random.minitrash.com',
      'Authorization': authHeader.Authorization,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const text = await response.text();
  const params = new URLSearchParams(text);

  return {
    access_token: params.get('oauth_token') || '',
    access_token_secret: params.get('oauth_token_secret') || '',
  };
}

export async function getUserIdentity(
  accessToken: string,
  accessTokenSecret: string
): Promise<UserIdentity> {
  const oauth = createOAuthClient();
  const url = `${API_BASE}/oauth/identity`;

  const requestData = {
    url,
    method: 'GET',
  };

  const token = {
    key: accessToken,
    secret: accessTokenSecret,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'VinylPick/1.0',
      'Authorization': authHeader.Authorization,
    },
  });

  return response.json();
}

export async function getUserCollection(
  accessToken: string,
  accessTokenSecret: string,
  username: string,
  page: number = 1,
  perPage: number = 50
): Promise<CollectionResponse> {
  const oauth = createOAuthClient();
  const url = `${API_BASE}/users/${username}/collection/folders/0/releases?page=${page}&per_page=${perPage}&sort=added&sort_order=desc`;

  const requestData = {
    url,
    method: 'GET',
  };

  const token = {
    key: accessToken,
    secret: accessTokenSecret,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'VinylPick/1.0',
      'Authorization': authHeader.Authorization,
    },
  });

  return response.json();
}

export async function fetchEntireCollection(
  accessToken: string,
  accessTokenSecret: string,
  username: string
): Promise<DiscogsRelease[]> {
  const releases: DiscogsRelease[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await getUserCollection(
      accessToken,
      accessTokenSecret,
      username,
      page
    );

    const vinylReleases = data.releases.filter((r) => {
      const formats = r.basic_information.formats || [];
      return formats.some(
        (f) => f.name.toLowerCase() === 'vinyl' || f.name.toLowerCase() === 'lp'
      );
    });

    vinylReleases.forEach((r) => {
      releases.push({
        id: r.basic_information.id,
        instance_id: r.instance_id,
        title: r.basic_information.title,
        year: r.basic_information.year,
        thumb: r.basic_information.thumb,
        cover_image: r.basic_information.cover_image,
        resource_url: r.basic_information.resource_url,
        formats: r.basic_information.formats,
        artists: r.basic_information.artists,
      });
    });

    hasMore = page < data.pagination.pages;
    page++;
  }

  return releases;
}
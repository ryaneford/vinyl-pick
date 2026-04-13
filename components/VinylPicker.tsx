'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

interface DiscogsRelease {
  id: number;
  instance_id: number;
  title: string;
  year: number;
  thumb: string;
  cover_image: string;
  artists: { name: string }[];
}

interface VinylPickerProps {
  onLogout?: () => void;
}

function VinylPickerContent({ onLogout }: VinylPickerProps) {
  const [auth, setAuth] = useState<{
    accessToken: string;
    accessTokenSecret: string;
    username: string;
  } | null>(null);

  const [collection, setCollection] = useState<DiscogsRelease[]>([]);
  const [playedIds, setPlayedIds] = useState<number[]>([]);
  const [currentRelease, setCurrentRelease] = useState<DiscogsRelease | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCollection, setIsFetchingCollection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerifierInput, setShowVerifierInput] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const searchParams = useSearchParams();
  const oauthVerifier = searchParams.get('oauth_verifier');

  useEffect(() => {
    const storedAuth = localStorage.getItem('discogs_auth');
    const storedPlayed = localStorage.getItem('vinyl_played');
    const storedOauth = localStorage.getItem('oauth_pending');
    const storedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;

    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute('data-theme', storedTheme);
    }

    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        setAuth(parsed);
      } catch {
        localStorage.removeItem('discogs_auth');
      }
    }

    if (storedPlayed) {
      try {
        setPlayedIds(JSON.parse(storedPlayed));
      } catch {
        localStorage.removeItem('vinyl_played');
      }
    }

    if (storedOauth && oauthVerifier) {
      handleOAuthCallback(oauthVerifier);
    }
  }, [oauthVerifier]);

  const saveAuth = (authData: typeof auth) => {
    if (authData) {
      localStorage.setItem('discogs_auth', JSON.stringify(authData));
      setAuth(authData);
    }
  };

  const savePlayed = (ids: number[]) => {
    localStorage.setItem('vinyl_played', JSON.stringify(ids));
    setPlayedIds(ids);
  };

  const connectDiscogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/oauth', { method: 'POST' });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      localStorage.setItem('oauth_pending', JSON.stringify({
        oauthToken: data.oauthToken,
        oauthTokenSecret: data.oauthTokenSecret,
      }));

      window.location.href = data.authorizeUrl;
    } catch (err) {
      setError('Failed to initiate OAuth');
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleOAuthCallback = async (verifier: string) => {
    const storedOauth = localStorage.getItem('oauth_pending');
    if (!storedOauth) return;

    try {
      const { oauthToken, oauthTokenSecret } = JSON.parse(storedOauth);

      const response = await fetch('/api/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oauthToken,
          oauthTokenSecret,
          verifier,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        localStorage.removeItem('oauth_pending');
        return;
      }

      saveAuth({
        accessToken: data.accessToken,
        accessTokenSecret: data.accessTokenSecret,
        username: data.username,
      });

      localStorage.removeItem('oauth_pending');
    } catch (err) {
      setError('Failed to complete OAuth');
      console.error(err);
      localStorage.removeItem('oauth_pending');
    }
  };

  const handleManualVerifier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const verifier = formData.get('verifier') as string;
    setShowVerifierInput(false);
    await handleOAuthCallback(verifier);
  };

  const fetchCollection = useCallback(async () => {
    if (!auth) return;

    setIsFetchingCollection(true);
    setError(null);

    try {
      const response = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsFetchingCollection(false);
        return;
      }

      setCollection(data.releases);
    } catch (err) {
      setError('Failed to fetch collection');
      console.error(err);
    }
    setIsFetchingCollection(false);
  }, [auth]);

  const pickRandomRelease = useCallback((skip = false) => {
    if (collection.length === 0) return;

    const unplayed = collection.filter((r) => !playedIds.includes(r.instance_id));
    if (unplayed.length === 0) {
      setError('All records have been played! Reset history to start over.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * unplayed.length);
    const selected = unplayed[randomIndex];
    setCurrentRelease(selected);
    if (!skip) {
      savePlayed([...playedIds, selected.instance_id]);
    }
  }, [collection, playedIds]);

  useEffect(() => {
    if (auth && collection.length === 0 && !isFetchingCollection) {
      fetchCollection();
    }
  }, [auth, collection.length, isFetchingCollection, fetchCollection]);

  useEffect(() => {
    if (collection.length > 0 && !currentRelease && playedIds.length === 0) {
      pickRandomRelease();
    }
  }, [collection.length, currentRelease, playedIds.length, pickRandomRelease]);

  useEffect(() => {
    if (collection.length > 0 && currentRelease === null) {
      const timer = setTimeout(() => {
        if (playedIds.length === 0) {
          pickRandomRelease();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentRelease, collection.length, playedIds.length, pickRandomRelease]);

  const resetHistory = () => {
    setPlayedIds([]);
    localStorage.setItem('vinyl_played', '[]');
    setCurrentRelease(null);
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem('discogs_auth');
    localStorage.removeItem('vinyl_played');
    localStorage.removeItem('oauth_pending');
    setAuth(null);
    setCollection([]);
    setPlayedIds([]);
    setCurrentRelease(null);
    if (onLogout) onLogout();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const openOnDiscogs = () => {
    if (!currentRelease) return;
    window.open(`https://www.discogs.com/release/${currentRelease.id}`, '_blank');
  };

  if (showVerifierInput) {
    return (
      <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Complete Authorization</h1>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          After authorizing on Discogs, you&apos;ll see a verification code.
          Enter it below to complete the connection:
        </p>
        <form onSubmit={handleManualVerifier}>
          <input
            name="verifier"
            type="text"
            placeholder="Enter verification code"
            className="w-full p-3 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded mb-4"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black dark:bg-zinc-600 text-white dark:text-white py-3 rounded font-medium disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Complete Connection'}
          </button>
        </form>
        <button
          onClick={() => setShowVerifierInput(false)}
          className="w-full mt-4 text-gray-500 dark:text-gray-400 py-2"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">Vinyl Pick</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Random record picker for your collection</p>
        <button
          onClick={connectDiscogs}
          disabled={isLoading}
          className="w-full bg-[#333333] text-white py-4 rounded-lg font-medium text-lg disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <img src="https://cdn.simpleicons.org/discogs" alt="Discogs" className="w-6 h-6" style={{filter: 'brightness(0) invert(1)'}} />
          Connect with Discogs
        </button>
        <button
          onClick={() => setShowVerifierInput(true)}
          className="w-full mt-4 text-gray-400 py-2 text-sm"
        >
          Having issues? Enter code manually
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-lg w-full">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 mb-4 flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-300">
          Connected as <strong>{auth.username}</strong>
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Disconnect
          </button>
        </div>
      </div>

      {isFetchingCollection ? (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-12 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-64 w-64 bg-gray-200 dark:bg-zinc-700 rounded mb-4"></div>
            <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-700 rounded mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-700 rounded"></div>
          </div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your collection...</p>
        </div>
      ) : currentRelease ? (
        <button
          onClick={openOnDiscogs}
          className="w-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow group"
        >
          <div className="relative aspect-square mb-4 bg-gray-100 dark:bg-zinc-700 rounded overflow-hidden">
            {currentRelease.cover_image || currentRelease.thumb ? (
              <Image
                src={currentRelease.cover_image || currentRelease.thumb}
                alt={currentRelease.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
                sizes="(max-width: 768px) 100vw, 500px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No cover art
              </div>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold mb-1 truncate dark:text-white">{currentRelease.title}</h2>
            <p className="text-gray-500 dark:text-gray-400 truncate">
              {currentRelease.artists?.[0]?.name || 'Unknown Artist'}
            </p>
            {currentRelease.year && (
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{currentRelease.year}</p>
            )}
          </div>
          <p className="text-center mt-4 text-sm text-blue-500 dark:text-blue-400 group-hover:underline">
            Click to open on Discogs
          </p>
        </button>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No vinyl found in collection</p>
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => pickRandomRelease(true)}
          disabled={isLoading || collection.length === 0}
          className="px-4 py-3 border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-lg"
          title="Skip this record without counting it as played"
        >
          Skip
        </button>
        <button
          onClick={() => pickRandomRelease()}
          disabled={isLoading || collection.length === 0}
          className="flex-1 bg-black dark:bg-zinc-700 text-white dark:text-white py-3 rounded-lg font-medium disabled:opacity-50"
        >
          Pick Another
        </button>
        <button
          onClick={resetHistory}
          className="px-4 py-3 border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-lg"
        >
          Reset
        </button>
      </div>

      {error && <p className="text-red-500 text-center mt-4">{error}</p>}

      <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-4">
        {collection.length - playedIds.length} / {collection.length} records remaining
      </p>
    </div>
  );
}

export default function VinylPicker(props: VinylPickerProps) {
  return (
    <Suspense fallback={
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <VinylPickerContent {...props} />
    </Suspense>
  );
}
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
  genres?: string[];
  styles?: string[];
  labels?: { name: string; catno: string }[];
  country?: string;
  resource_url?: string;
}

interface ListenedEntry {
  release: DiscogsRelease;
  listenedAt: string;
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
  const [favorites, setFavorites] = useState<number[]>([]);
  const [currentRelease, setCurrentRelease] = useState<DiscogsRelease | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCollection, setIsFetchingCollection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerifierInput, setShowVerifierInput] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [history, setHistory] = useState<ListenedEntry[]>([]);
  const [filterGenre, setFilterGenre] = useState<string>('');
  const [filterDecade, setFilterDecade] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [displayKey, setDisplayKey] = useState(0);
  const [dailyPick, setDailyPick] = useState<DiscogsRelease | null>(null);
  const [plexampUrl, setPlexampUrl] = useState<string>('');
  const [historyOffset, setHistoryOffset] = useState(0);
  const [favoritesOffset, setFavoritesOffset] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [showConfirm, setShowConfirm] = useState<'reset' | 'clearHistory' | null>(null);
  const [currentIsListened, setCurrentIsListened] = useState(false);

  const MAX_VISIBLE = 8;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) {
      setTouchDelta(e.touches[0].clientX - touchStart);
    }
  };

  const handleTouchEnd = () => {
    if (touchStart !== null) {
      if (touchDelta > 50) {
        pickRandomRelease();
      } else if (touchDelta < -50) {
        setCurrentRelease(null);
      }
      setTouchStart(null);
      setTouchDelta(0);
    }
  };

  const searchParams = useSearchParams();
  const oauthVerifier = searchParams.get('oauth_verifier');

  useEffect(() => {
    const storedAuth = localStorage.getItem('discogs_auth');
    const storedPlayed = localStorage.getItem('vinyl_played');
    const storedOauth = localStorage.getItem('oauth_pending');
    const storedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const storedFavorites = localStorage.getItem('vinyl_favorites');
    const storedHistory = localStorage.getItem('vinyl_history');
    const storedPlexamp = localStorage.getItem('plexamp_url');

    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute('data-theme', storedTheme);
    }

    if (storedPlexamp) {
      setPlexampUrl(storedPlexamp);
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

    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch {
        localStorage.removeItem('vinyl_favorites');
      }
    }

    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].listenedAt) {
          setHistory(parsed);
        } else {
          const migrated = parsed.map((r: DiscogsRelease) => ({ release: r, listenedAt: new Date().toISOString() }));
          localStorage.setItem('vinyl_history', JSON.stringify(migrated.slice(0, 15)));
          setHistory(migrated.slice(0, 15));
        }
      } catch {
        localStorage.removeItem('vinyl_history');
      }
    }

    if (storedOauth && oauthVerifier) {
      handleOAuthCallback(oauthVerifier);
      window.history.replaceState({}, '', window.location.pathname);
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

  const saveFavorites = (ids: number[]) => {
    localStorage.setItem('vinyl_favorites', JSON.stringify(ids));
    setFavorites(ids);
  };

  const saveHistory = (entries: ListenedEntry[]) => {
    localStorage.setItem('vinyl_history', JSON.stringify(entries.slice(0, 15)));
    setHistory(entries.slice(0, 15));
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

    let filteredCollection = collection;
    if (filterGenre) {
      filteredCollection = filteredCollection.filter((r) => r.genres?.includes(filterGenre));
    }
    if (filterDecade) {
      const decadeStart = parseInt(filterDecade);
      filteredCollection = filteredCollection.filter((r) => r.year && r.year >= decadeStart && r.year < decadeStart + 10);
    }

    const unplayed = filteredCollection.filter((r) => !playedIds.includes(r.instance_id));
    if (unplayed.length === 0) {
      setError('All records have been played! Reset history to start over.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * unplayed.length);
    const selected = unplayed[randomIndex];
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentRelease(selected);
      setCurrentIsListened(playedIds.includes(selected.instance_id) || history.some(h => h.release.instance_id === selected.instance_id));
      setDisplayKey(prev => prev + 1);
      setIsAnimating(false);
    }, 300);
  }, [collection, playedIds, filterGenre, filterDecade, history]);

  const markAsListened = () => {
    if (!currentRelease) return;
    if (history.some(h => h.release.instance_id === currentRelease.instance_id)) return;
    const entry: ListenedEntry = { release: currentRelease, listenedAt: new Date().toISOString() };
    saveHistory([entry, ...history]);
    const newPlayed = [...playedIds, currentRelease.instance_id];
    savePlayed(newPlayed);
    setCurrentIsListened(true);
    if (newPlayed.length === collection.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  };

  useEffect(() => {
    if (auth && collection.length === 0 && !isFetchingCollection) {
      fetchCollection();
    }
  }, [auth, collection.length, isFetchingCollection, fetchCollection]);

  useEffect(() => {
    const stored = localStorage.getItem('vinyl_daily_pick');
    const today = new Date().toDateString();
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && collection.some(r => r.instance_id === parsed.release.instance_id)) {
          setDailyPick(parsed.release);
        } else {
          localStorage.removeItem('vinyl_daily_pick');
        }
      } catch {
        localStorage.removeItem('vinyl_daily_pick');
      }
    }
    if (!dailyPick && collection.length > 0) {
      const unplayed = collection.filter(r => !playedIds.includes(r.instance_id));
      const pool = unplayed.length > 0 ? unplayed : collection;
      const randomIndex = Math.floor(Math.random() * pool.length);
      const pick = pool[randomIndex];
      setDailyPick(pick);
      localStorage.setItem('vinyl_daily_pick', JSON.stringify({ date: today, release: pick }));
    }
  }, [collection, playedIds]);

  useEffect(() => {
    if (collection.length > 0 && !currentRelease) {
      pickRandomRelease();
    }
  }, [collection.length, currentRelease, pickRandomRelease]);

  const startOver = () => {
    setPlayedIds([]);
    localStorage.setItem('vinyl_played', '[]');
    setCurrentRelease(null);
    setCurrentIsListened(false);
    setError(null);
    setShowConfirm(null);
  };

  const clearListeningHistory = () => {
    setHistory([]);
    localStorage.removeItem('vinyl_history');
    setShowConfirm(null);
  };

  const toggleFavorite = () => {
    if (!currentRelease) return;
    const isFav = favorites.includes(currentRelease.instance_id);
    if (isFav) {
      saveFavorites(favorites.filter((id) => id !== currentRelease.instance_id));
    } else {
      saveFavorites([...favorites, currentRelease.instance_id]);
    }
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        pickRandomRelease();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        markAsListened();
      } else if (e.code === 'KeyR' && !e.shiftKey) {
        e.preventDefault();
        setShowConfirm('reset');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pickRandomRelease]);

  const logout = () => {
    localStorage.removeItem('discogs_auth');
    localStorage.removeItem('vinyl_played');
    localStorage.removeItem('vinyl_favorites');
    localStorage.removeItem('vinyl_history');
    localStorage.removeItem('vinyl_listened_log');
    localStorage.removeItem('oauth_pending');
    setAuth(null);
    setCollection([]);
    setPlayedIds([]);
    setFavorites([]);
    setHistory([]);
    setCurrentRelease(null);
    setCurrentIsListened(false);
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

  /*
  const openInPlexamp = async (release: DiscogsRelease) => {
    if (!plexampUrl || !release) return;
    const artist = release.artists?.[0]?.name || '';
    const album = release.title;
    const searchQuery = encodeURIComponent(`${artist} ${album}`);
    const plexUrl = `${plexampUrl}/search?query=${searchQuery}`;
    window.open(plexUrl, '_blank');
  };
  */

  const openInService = (service: string) => {
    if (!currentRelease) return;
    const artist = currentRelease.artists?.[0]?.name || '';
    const album = currentRelease.title;
    const searchQuery = encodeURIComponent(`${artist} ${album}`);

    const urls: Record<string, string> = {
      spotify: `https://open.spotify.com/search/${searchQuery}`,
      apple: `https://music.apple.com/search?term=${searchQuery}`,
      tidal: `https://tidal.com/search?q=${searchQuery}`,
      youtube: `https://music.youtube.com/search?q=${searchQuery}`,
    };

    window.open(urls[service] || urls.spotify, '_blank');
  };

  /*
  const savePlexampUrl = (url: string) => {
    localStorage.setItem('plexamp_url', url);
    setPlexampUrl(url);
  };
  */

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
        <div className="w-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow group animate-fade-slide-in"
             key={displayKey}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}>
          <div className="relative aspect-square mb-2 bg-gray-100 dark:bg-zinc-700 rounded overflow-hidden cursor-pointer" onClick={openOnDiscogs}>
            {currentRelease.cover_image || currentRelease.thumb ? (
              <div className="relative w-full h-full">
                <div className="absolute inset-0 rounded-full bg-black/20 z-10 pointer-events-none" style={{background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.1) 100%)'}} />
                <Image
                  src={currentRelease.cover_image || currentRelease.thumb}
                  alt={currentRelease.title}
                  fill
                  className={`object-cover group-hover:scale-105 transition-transform ${isAnimating ? 'animate-vinyl-spin' : ''}`}
                  sizes="(max-width: 768px) 100vw, 500px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No cover art
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}
              className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              title={favorites.includes(currentRelease.instance_id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className={`w-5 h-5 ${favorites.includes(currentRelease.instance_id) ? 'text-red-500 fill-current' : 'text-white'}`}
                viewBox="0 0 24 24"
                fill={favorites.includes(currentRelease.instance_id) ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
          <div className="text-center cursor-pointer" onClick={openOnDiscogs}>
            <h2 className="text-base font-bold mb-0.5 truncate dark:text-white">{currentRelease.title}</h2>
            <p className="text-gray-500 dark:text-gray-400 truncate text-sm">
              {currentRelease.artists?.[0]?.name || 'Unknown Artist'}
            </p>
            {currentRelease.year && (
              <p className="text-gray-400 dark:text-gray-500 text-xs">{currentRelease.year}</p>
            )}
          </div>
          <div className="flex justify-center gap-2 mt-1">
              <button onClick={openOnDiscogs} className="p-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600" title="Discogs">
                <img src="https://cdn.simpleicons.org/discogs" className="w-4 h-4 dark:invert" />
              </button>
              <button onClick={() => openInService('spotify')} className="p-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600" title="Spotify">
                <img src="https://cdn.simpleicons.org/spotify" className="w-4 h-4" style={{color: '#1DB954'}} />
              </button>
              <button onClick={() => openInService('apple')} className="p-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600" title="Apple Music">
                <img src="https://cdn.simpleicons.org/applemusic" className="w-4 h-4" style={{color: '#FC3C44'}} />
              </button>
              <button onClick={() => openInService('tidal')} className="p-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600" title="Tidal">
                <img src="https://cdn.simpleicons.org/tidal" className="w-4 h-4" style={{color: '#000000'}} />
              </button>
              <button onClick={() => openInService('youtube')} className="p-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600" title="YouTube Music">
                <img src="https://cdn.simpleicons.org/youtubemusic" className="w-4 h-4" style={{color: '#FF0000'}} />
              </button>
              {/*
              {plexampUrl && (
                <button onClick={() => openInPlexamp(currentRelease)} className="p-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600" title="Plexamp">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </button>
              )}
              */}
            </div>
          </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8 text-center">
          {collection.length > 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No vinyl selected</p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No vinyl found in collection</p>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-2 items-center justify-center">
        {/* Filter button - commented out for now
        <button
          onClick={toggleFilters}
          className={`px-3 py-3 border rounded-lg ${showFilters ? 'bg-gray-200 dark:bg-zinc-600' : 'border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700'}`}
          title="Filter collection"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        */}
        <button
          onClick={() => pickRandomRelease()}
          disabled={isLoading || collection.length === 0}
          className="flex-1 py-3 border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-lg text-sm text-center"
          title="Pick another record (Space)"
        >
          Pick Another
        </button>
        {currentRelease && (
          <button
            onClick={markAsListened}
            disabled={currentIsListened || history.some(h => h.release.instance_id === currentRelease.instance_id)}
            className={`flex-1 py-3 rounded-lg font-medium text-sm text-center ${currentIsListened || history.some(h => h.release.instance_id === currentRelease.instance_id) ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-green-600 text-white hover:bg-green-700'}`}
            title="Log as listened (M)"
          >
            {currentIsListened || history.some(h => h.release.instance_id === currentRelease.instance_id) ? '✓ Logged' : 'Mark as Listened'}
          </button>
        )}
        <button
          onClick={() => setShowConfirm('reset')}
          className="flex-1 py-3 border border-red-800/50 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs text-center"
          title="Start over - reset which records are available to pick"
        >
          Start Over
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(null)}>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium dark:text-white mb-2">{showConfirm === 'reset' ? 'Start Over?' : 'Clear Listening History?'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {showConfirm === 'reset' ? 'This will make all records available to pick again. Your listening log is preserved.' : 'This will permanently delete your listening history. This cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={showConfirm === 'reset' ? startOver : clearListeningHistory}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700"
              >
                {showConfirm === 'reset' ? 'Start Over' : 'Clear History'}
              </button>
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showFilters && collection.length > 0 && (
        <div className="mt-4 bg-gray-50 dark:bg-zinc-700 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2 dark:text-white">Filters</h3>
          <div className="flex gap-4">
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="flex-1 p-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white rounded text-sm"
            >
              <option value="">All Genres</option>
              {Array.from(new Set(collection.flatMap((r) => r.genres || []))).sort().map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={filterDecade}
              onChange={(e) => setFilterDecade(e.target.value)}
              className="flex-1 p-2 border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white rounded text-sm"
            >
              <option value="">All Decades</option>
              {Array.from(new Set(collection.filter((r) => r.year).map((r) => Math.floor(r.year! / 10) * 10 + 's'))).sort().map((d) => (
                <option key={d} value={d.slice(0, -1)}>{d}</option>
              ))}
            </select>
          </div>
          {(filterGenre || filterDecade) && (
            <button
              onClick={() => { setFilterGenre(''); setFilterDecade(''); }}
              className="mt-2 text-xs text-blue-500 dark:text-blue-400"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs text-gray-500 dark:text-gray-400">Recent</h3>
            <button
              onClick={() => setShowConfirm('clearHistory')}
              className="text-xs text-gray-400 hover:text-red-500"
              title="Clear listening history"
            >
              Clear
            </button>
          </div>
          <div className="relative">
            <div className="flex justify-center items-center perspective-500">
              <button
                onClick={() => setHistoryOffset(Math.max(0, historyOffset - MAX_VISIBLE))}
                disabled={historyOffset === 0}
                className="flex-shrink-0 w-10 h-14 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 text-2xl"
              >
                ‹
              </button>
              <div 
                className="flex items-center justify-center gap-1 overflow-hidden"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as HTMLDivElement).dataset.swipeStartX = String(touch.clientX);
                  (e.currentTarget as HTMLDivElement).dataset.swipeStartY = String(touch.clientY);
                }}
                onTouchEnd={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  const startX = parseFloat(el.dataset.swipeStartX || '0');
                  const startY = parseFloat(el.dataset.swipeStartY || '0');
                  const endX = e.changedTouches[0].clientX;
                  const endY = e.changedTouches[0].clientY;
                  const diffX = endX - startX;
                  const diffY = endY - startY;
                  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
                    if (diffX < 0) {
                      setHistoryOffset(Math.min(history.length - MAX_VISIBLE, historyOffset + MAX_VISIBLE));
                    } else {
                      setHistoryOffset(Math.max(0, historyOffset - MAX_VISIBLE));
                    }
                  }
                }}
              >
                {history.slice(historyOffset, historyOffset + MAX_VISIBLE).map((entry, idx) => (
                  <button
                    key={entry.release.instance_id}
                    onClick={() => setCurrentRelease(entry.release)}
                    title={`${entry.release.artists?.[0]?.name || ''} - ${entry.release.title}${entry.release.year ? ` (${entry.release.year})` : ''}`}
                    className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all duration-300 group/thumb"
                    style={{
                      transform: idx === 0 ? 'scale(1.1) translateZ(10px)' : idx === 1 ? 'scale(0.95) translateZ(-5px) rotateY(-15deg)' : idx === MAX_VISIBLE - 1 ? 'scale(0.95) translateZ(-5px) rotateY(15deg)' : 'scale(0.85) translateZ(-10px)',
                      zIndex: MAX_VISIBLE - idx,
                      marginLeft: idx === 0 ? '0' : '-12px',
                      marginRight: idx === MAX_VISIBLE - 1 ? '0' : '-12px',
                    }}
                  >
                    {entry.release.thumb ? (
                      <Image src={entry.release.thumb} alt={entry.release.title} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-xs">?</div>
                    )}
                    {favorites.includes(entry.release.instance_id) && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setHistoryOffset(Math.min(history.length - MAX_VISIBLE, historyOffset + MAX_VISIBLE))}
                disabled={historyOffset + MAX_VISIBLE >= history.length}
                className="flex-shrink-0 w-10 h-14 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 text-2xl"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorites section - commented out for now
      {favorites.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs text-gray-500 dark:text-gray-400 mb-2">Favorites ({favorites.length})</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFavoritesOffset(Math.max(0, favoritesOffset - MAX_VISIBLE))}
              disabled={favoritesOffset === 0}
              className="flex-shrink-0 w-10 h-14 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 text-2xl"
            >
              ‹
            </button>
            <div 
              className="flex gap-2 overflow-hidden"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                (e.currentTarget as HTMLDivElement).dataset.swipeStartX = String(touch.clientX);
                (e.currentTarget as HTMLDivElement).dataset.swipeStartY = String(touch.clientY);
              }}
              onTouchEnd={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                const startX = parseFloat(el.dataset.swipeStartX || '0');
                const startY = parseFloat(el.dataset.swipeStartY || '0');
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = endY - startY;
                const favCount = collection.filter((r) => favorites.includes(r.instance_id)).length;
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
                  if (diffX < 0) {
                    setFavoritesOffset(Math.min(favCount - MAX_VISIBLE, favoritesOffset + MAX_VISIBLE));
                  } else {
                    setFavoritesOffset(Math.max(0, favoritesOffset - MAX_VISIBLE));
                  }
                }
              }}
            >
              {collection.filter((r) => favorites.includes(r.instance_id)).slice(favoritesOffset, favoritesOffset + MAX_VISIBLE).map((r) => (
                <button
                  key={r.instance_id}
                  onClick={() => setCurrentRelease(r)}
                  title={`${r.artists?.[0]?.name || ''} - ${r.title}${r.year ? ` (${r.year})` : ''}`}
                  className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden border-2 border-red-500 hover:border-red-600 transition-transform hover:scale-105"
                >
                  {r.thumb ? (
                    <Image src={r.thumb} alt={r.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-xs">?</div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const favCount = collection.filter((r) => favorites.includes(r.instance_id)).length;
                setFavoritesOffset(Math.min(favCount - MAX_VISIBLE, favoritesOffset + MAX_VISIBLE));
              }}
              disabled={favoritesOffset + MAX_VISIBLE >= collection.filter((r) => favorites.includes(r.instance_id)).length}
              className="flex-shrink-0 w-10 h-14 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 text-2xl"
            >
              ›
            </button>
          </div>
        </div>
      )}
      */}

      {error && <p className="text-red-500 text-center mt-4">{error}</p>}

      <div className="mt-2">
        <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${collection.length > 0 ? (playedIds.length / collection.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-400 dark:text-gray-500">
            {playedIds.length} of {collection.length} picked
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            {history.length} logged as listened
          </span>
        </div>
        {(filterGenre || filterDecade) && (
          <span className="text-xs text-gray-400">(filtered)</span>
        )}
      </div>

      {dailyPick && (
        <div className="mt-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 dark:border-purple-500/30 rounded-lg p-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-purple-400 dark:text-purple-300">Record of the Day</p>
            <p className="text-sm font-medium dark:text-white truncate">{dailyPick.title}</p>
            <p className="text-xs text-gray-400">{dailyPick.artists?.[0]?.name || 'Unknown Artist'}{dailyPick.year ? ` · ${dailyPick.year}` : ''}</p>
          </div>
          <div className="w-12 h-12 relative rounded overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-zinc-700">
            {dailyPick.thumb ? (
              <Image src={dailyPick.cover_image || dailyPick.thumb} alt={dailyPick.title} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">?</div>
            )}
          </div>
        </div>
      )}

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bcb'][i % 5],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
              }}
            />
          ))}
        </div>
      )}

      <p className="text-center text-gray-500 dark:text-gray-600 text-xs mt-1">
        Keyboard: Space=Pick | M=Listened | R=Start Over
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
        {collection.length > 0 && (
          <button onClick={() => setShowStats(true)} className="hover:text-gray-600 dark:hover:text-gray-300">Collection Stats</button>
        )}
        <span>|</span>
        <button onClick={() => setShowHistory(true)} className="hover:text-gray-600 dark:hover:text-gray-300">Journal</button>
        <span>|</span>
        <button onClick={() => setShowFaq(true)} className="hover:text-gray-600 dark:hover:text-gray-300">FAQ</button>
        <span>|</span>
        <a href="https://github.com/ryaneford/vinyl-pick" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-300">Source</a>
        <span>|</span>
        <span className="text-gray-400 dark:text-gray-600">logged in as {auth.username}</span>
        <button onClick={logout} className="text-gray-400 dark:text-gray-600 hover:text-red-500">Disconnect</button>
      </div>

      {showStats && (
        <StatsModal collection={collection} playedIds={playedIds} onClose={() => setShowStats(false)} />
      )}

      {showHistory && (
        <HistoryModal history={history} favorites={favorites} onSelect={(r) => { setCurrentRelease(r); setShowHistory(false); }} onClear={() => { clearListeningHistory(); setShowHistory(false); }} onClose={() => setShowHistory(false)} />
      )}

      {showFaq && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFaq(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-zinc-700">
              <h3 className="font-medium dark:text-white">Vinyl Pick FAQ</h3>
              <button 
                onClick={() => setShowFaq(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium dark:text-gray-300">What is this?</p>
                <p>Vinyl Pick picks a random vinyl from your Discogs collection. Perfect for deciding what to spin today!</p>
              </div>
              <div>
                <p className="font-medium dark:text-gray-300">How do I connect my collection?</p>
                <p>Click "Connect with Discogs" to authorize. Your OAuth tokens are stored locally - nothing is sent to any server.</p>
              </div>
              <div>
                <p className="font-medium dark:text-gray-300">Does this modify my Discogs account?</p>
                <p>No! This only reads your collection. It cannot add, edit, or delete anything on Discogs.</p>
              </div>
              <div>
                <p className="font-medium dark:text-gray-300">What do the buttons do?</p>
                <p><strong>Pick Another</strong> - picks a random unplayed record. <strong>Skip</strong> - shows another without counting as played. <strong>Reset</strong> - starts fresh from your full collection.</p>
              </div>
              <div>
                <p className="font-medium dark:text-gray-300">Open in...</p>
                <p>Click any icon to open this album in that music service. Links open in a new tab.</p>
              </div>
              <div>
                <p className="font-medium dark:text-gray-300">Keyboard shortcuts</p>
                <p>Space = Pick | M = Mark as Listened | R = Start Over</p>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
  );
}

function StatsModal({ collection, playedIds, onClose }: { collection: DiscogsRelease[]; playedIds: number[]; onClose: () => void }) {
  const uniqueArtists = new Set(
    collection.filter((r) => playedIds.includes(r.instance_id)).flatMap((r) => r.artists?.map((a) => a.name) || [])
  ).size;

  const genreCounts: Record<string, number> = {};
  collection.forEach((r) => {
    (r.genres || []).forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const decadeCounts: Record<string, number> = {};
  collection.forEach((r) => {
    if (r.year) {
      const decade = Math.floor(r.year / 10) * 10 + 's';
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
    }
  });
  const decades = Object.entries(decadeCounts).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-zinc-700">
          <h3 className="font-medium dark:text-white">Collection Stats</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400 dark:text-gray-500">Total plays:</span>{' '}
            <span className="font-medium dark:text-white">{playedIds.length}</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500">Unique artists:</span>{' '}
            <span className="font-medium dark:text-white">{uniqueArtists}</span>
          </div>
          {topGenres.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-400 dark:text-gray-500">Top genres: </span>
              <span className="font-medium dark:text-white">
                {topGenres.map((g) => `${g[0]} (${g[1]})`).join(', ')}
              </span>
            </div>
          )}
          {decades.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-400 dark:text-gray-500">Decades: </span>
              <span className="font-medium dark:text-white">
                {decades.map((d) => d[0]).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ history, favorites, onSelect, onClear, onClose }: { history: ListenedEntry[]; favorites: number[]; onSelect: (r: DiscogsRelease) => void; onClear: () => void; onClose: () => void }) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-800 z-10">
          <h3 className="font-medium dark:text-white">Listening Journal</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Clear
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {history.length === 0 ? (
          <p className="p-4 text-gray-400 text-center">No entries yet. Pick a record and mark it as listened!</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-700">
            {history.map((entry, idx) => (
              <button
                key={`${entry.release.instance_id}-${idx}`}
                onClick={() => onSelect(entry.release)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-left"
              >
                <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{idx + 1}</span>
                <div className="w-12 h-12 relative rounded overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-zinc-700">
                  {entry.release.thumb ? (
                    <Image src={entry.release.thumb} alt={entry.release.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">?</div>
                  )}
                  {favorites.includes(entry.release.instance_id) && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white truncate">{entry.release.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">{entry.release.artists?.[0]?.name || 'Unknown Artist'}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-600">{formatDate(entry.listenedAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
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
import { MusicTrack } from '@/domain/music';
import { collectTracksFromYtData, extractYtInitialData } from '@/lib/youtube-tracks';

const YOUTUBE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const YOUTUBE_CLIENT_VERSION = '2.20240815.00.00';

/** Public WEB InnerTube key shipped in youtube.com JS (not a secret). */
const INNERTUBE_WEB_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

const CONSENT_COOKIE = 'CONSENT=YES+cb.20210328-17-p0.en+FX+123; SOCS=CAI';

const COMMON_HEADERS: Record<string, string> = {
  'User-Agent': YOUTUBE_USER_AGENT,
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: CONSENT_COOKIE,
};

function innertubeContext() {
  return {
    client: {
      clientName: 'WEB',
      clientVersion: YOUTUBE_CLIENT_VERSION,
      hl: 'en',
      gl: 'US',
    },
  };
}

async function fetchInnertube(endpoint: 'search' | 'next', body: Record<string, unknown>): Promise<unknown | null> {
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/${endpoint}?key=${INNERTUBE_WEB_KEY}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        ...COMMON_HEADERS,
        'Content-Type': 'application/json',
        'X-Youtube-Client-Name': '1',
        'X-Youtube-Client-Version': YOUTUBE_CLIENT_VERSION,
      },
      body: JSON.stringify({ context: innertubeContext(), ...body }),
      cache: 'no-store',
      redirect: 'manual',
    }
  );

  if (res.status >= 300 && res.status < 400) return null;
  if (!res.ok) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Follow a small number of redirects ourselves so Node/undici never hits
 * "redirect count exceeded" (common when YouTube ↔ consent.google.com loops
 * on datacenter IPs). Consent pages are skipped; we retry the original URL
 * with a CONSENT cookie instead.
 */
async function fetchYouTubeHtml(url: string, maxHops = 6): Promise<Response | null> {
  let current = url;

  for (let hop = 0; hop < maxHops; hop++) {
    const res = await fetch(current, {
      headers: {
        ...COMMON_HEADERS,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
      redirect: 'manual',
    });

    if (res.status < 300 || res.status >= 400) return res;

    const location = res.headers.get('location');
    if (!location) return res;

    const nextUrl = new URL(location, current);
    if (nextUrl.hostname.includes('consent.youtube.com') || nextUrl.hostname.includes('consent.google.com')) {
      current = url;
      continue;
    }

    current = nextUrl.toString();
  }

  return null;
}

export async function fetchLiveYouTubeSearch(query: string): Promise<MusicTrack[]> {
  const innertubeData = await fetchInnertube('search', { query: `${query} music` });
  if (innertubeData) {
    const tracks = collectTracksFromYtData(innertubeData, { limit: 18 });
    if (tracks.length > 0) return tracks;
  }

  const res = await fetchYouTubeHtml(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} music`)}`
  );
  if (!res?.ok) return [];

  const html = await res.text();
  const data = extractYtInitialData(html);
  if (!data) return [];

  return collectTracksFromYtData(data, { limit: 18 });
}

export async function fetchLiveYouTubeRelated(videoId: string): Promise<MusicTrack[]> {
  const innertubeData = await fetchInnertube('next', { videoId });
  if (innertubeData) {
    const tracks = collectTracksFromYtData(innertubeData, { excludeVideoId: videoId, limit: 24 });
    if (tracks.length > 0) return tracks;
  }

  const res = await fetchYouTubeHtml(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
  if (!res?.ok) return [];

  const html = await res.text();
  const data = extractYtInitialData(html);
  if (!data) return [];

  return collectTracksFromYtData(data, { excludeVideoId: videoId, limit: 24 });
}

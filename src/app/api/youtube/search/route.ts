import { NextRequest, NextResponse } from 'next/server';
import { MusicTrack } from '@/domain/music';

// Curated fallback catalog if offline
const CURATED_YOUTUBE_CATALOG: MusicTrack[] = [
  {
    id: 'youtube-jfKfPfyJRdk',
    title: 'lofi hip hop radio - beats to relax/study to',
    artist: 'Lofi Girl',
    thumbnail: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&auto=format&fit=crop&q=80',
    youtubeVideoId: 'jfKfPfyJRdk',
    duration: 3600,
    category: 'YouTube',
    source: 'youtube',
  },
  {
    id: 'youtube-DWcJFNfaw9c',
    title: 'Warm Coffeehouse Jazz - Soft Piano & Rain',
    artist: 'Cafe Music BGM channel',
    thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&auto=format&fit=crop&q=80',
    youtubeVideoId: 'DWcJFNfaw9c',
    duration: 3600,
    category: 'YouTube',
    source: 'youtube',
  },
  {
    id: 'youtube-lTRiuFIWV54',
    title: 'Chillhop Radio - jazzy & lofi hip hop beats',
    artist: 'Chillhop Music',
    thumbnail: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&auto=format&fit=crop&q=80',
    youtubeVideoId: 'lTRiuFIWV54',
    duration: 3600,
    category: 'YouTube',
    source: 'youtube',
  },
  {
    id: 'youtube-e-fA-gBCkj0',
    title: 'Bruno Mars - Locked Out Of Heaven (Official Music Video)',
    artist: 'Bruno Mars',
    thumbnail: 'https://i.ytimg.com/vi/e-fA-gBCkj0/hqdefault.jpg',
    youtubeVideoId: 'e-fA-gBCkj0',
    duration: 235,
    category: 'YouTube',
    source: 'youtube',
  },
];

/**
 * Fetch live search results directly from YouTube search endpoint
 */
async function fetchLiveYouTubeSearch(query: string): Promise<MusicTrack[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' music')}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    next: { revalidate: 120 },
  });

  if (!res.ok) return [];

  const html = await res.text();
  let rawJson = '';

  const marker = 'ytInitialData = ';
  const startIdx = html.indexOf(marker);
  if (startIdx !== -1) {
    const jsonStart = startIdx + marker.length;
    const jsonEnd = html.indexOf(';</script>', jsonStart);
    if (jsonEnd !== -1) {
      rawJson = html.substring(jsonStart, jsonEnd).trim();
    } else {
      const match = html.substring(jsonStart).match(/^(\{[\s\S]+?\});/);
      if (match) rawJson = match[1];
    }
  }

  if (!rawJson) return [];

  try {
    const data = JSON.parse(rawJson);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents || !Array.isArray(contents)) return [];

    const tracks: MusicTrack[] = [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item.videoRenderer) {
          const v = item.videoRenderer;
          const videoId = v.videoId;
          if (!videoId) continue;

          const title =
            v.title?.runs?.[0]?.text ||
            v.title?.simpleText ||
            'YouTube Music Track';
          const artist =
            v.ownerText?.runs?.[0]?.text ||
            v.shortBylineText?.runs?.[0]?.text ||
            'YouTube Artist';

          const thumbnails = v.thumbnail?.thumbnails || [];
          const thumbnail =
            thumbnails.length > 0
              ? thumbnails[thumbnails.length - 1].url
              : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

          const lengthText = v.lengthText?.simpleText || '';
          let duration = 210;
          if (lengthText) {
            const parts = lengthText.split(':').map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              duration = parts[0] * 60 + parts[1];
            } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
              duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
          }

          tracks.push({
            id: `youtube-${videoId}`,
            title,
            artist,
            thumbnail,
            youtubeVideoId: videoId,
            duration,
            category: 'YouTube',
            source: 'youtube',
          });

          if (tracks.length >= 18) break;
        }
      }
      if (tracks.length >= 18) break;
    }

    return tracks;
  } catch (err) {
    console.warn('[YouTube Search Route] Parse error:', err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';

  if (!query) {
    return NextResponse.json({ tracks: CURATED_YOUTUBE_CATALOG, source: 'default' });
  }

  // 1. Check official YouTube Data API v3 if API key is provided
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&q=${encodeURIComponent(
        query + ' music'
      )}&maxResults=15&key=${apiKey}`;

      const res = await fetch(ytUrl, { next: { revalidate: 300 } });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];

        const tracks: MusicTrack[] = items
          .filter((item: any) => item.id?.videoId)
          .map((item: any) => {
            const videoId = item.id.videoId;
            const snippet = item.snippet || {};
            return {
              id: `youtube-${videoId}`,
              title: snippet.title?.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') || 'YouTube Music',
              artist: snippet.channelTitle || 'YouTube Artist',
              thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              youtubeVideoId: videoId,
              duration: 240,
              category: 'YouTube',
              source: 'youtube',
            };
          });

        if (tracks.length > 0) {
          return NextResponse.json({ tracks, source: 'official_api' });
        }
      }
    } catch (err) {
      console.warn('[YouTube API Route] Official API failed, using live fetcher:', err);
    }
  }

  // 2. Fetch live results from YouTube search
  try {
    const liveTracks = await fetchLiveYouTubeSearch(query);
    if (liveTracks.length > 0) {
      return NextResponse.json({ tracks: liveTracks, source: 'live_search' });
    }
  } catch (err) {
    console.warn('[YouTube API Route] Live fetch error:', err);
  }

  // 3. Fallback to curated catalog with keyword filter
  const qLower = query.toLowerCase();
  const filtered = CURATED_YOUTUBE_CATALOG.filter(
    (t) =>
      t.title.toLowerCase().includes(qLower) ||
      t.artist.toLowerCase().includes(qLower) ||
      t.category.toLowerCase().includes(qLower)
  );

  return NextResponse.json({
    tracks: filtered.length > 0 ? filtered : CURATED_YOUTUBE_CATALOG,
    source: 'fallback',
  });
}

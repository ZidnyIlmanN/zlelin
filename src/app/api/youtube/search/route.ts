import { NextRequest, NextResponse } from 'next/server';
import { MusicTrack } from '@/domain/music';
import { fetchLiveYouTubeSearch } from '@/lib/youtube-live';

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

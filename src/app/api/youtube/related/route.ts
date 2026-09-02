import { NextRequest, NextResponse } from 'next/server';
import { MusicTrack } from '@/domain/music';
import { fetchLiveYouTubeRelated } from '@/lib/youtube-live';

async function fetchRelatedFromOfficialApi(videoId: string, apiKey: string): Promise<MusicTrack[]> {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('maxResults', '15');
  searchUrl.searchParams.set('key', apiKey);

  const videoRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${apiKey}`,
    { next: { revalidate: 300 } }
  );

  if (!videoRes.ok) return [];

  const videoData = await videoRes.json();
  const snippet = videoData.items?.[0]?.snippet;
  if (!snippet) return [];

  const query = [snippet.title, snippet.channelTitle].filter(Boolean).join(' ');
  searchUrl.searchParams.set('q', query);

  const res = await fetch(searchUrl.toString(), { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  const items = data.items || [];

  return items
    .filter((item: { id?: { videoId?: string } }) => item.id?.videoId && item.id.videoId !== videoId)
    .map((item: { id: { videoId: string }; snippet?: Record<string, unknown> }) => {
      const id = item.id.videoId;
      const s = item.snippet || {};
      const thumbs = s.thumbnails as { medium?: { url?: string }; default?: { url?: string } } | undefined;
      return {
        id: `youtube-${id}`,
        title: String(s.title || 'YouTube Music').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
        artist: String(s.channelTitle || 'YouTube Artist'),
        thumbnail: thumbs?.medium?.url || thumbs?.default?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        youtubeVideoId: id,
        duration: 240,
        category: 'YouTube' as const,
        source: 'youtube' as const,
      };
    });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('v')?.trim();

  if (!videoId) {
    return NextResponse.json({ tracks: [], source: 'invalid' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const tracks = await fetchRelatedFromOfficialApi(videoId, apiKey);
      if (tracks.length > 0) {
        return NextResponse.json({ tracks, source: 'official_api' });
      }
    } catch (err) {
      console.warn('[YouTube Related Route] Official API failed:', err);
    }
  }

  try {
    const tracks = await fetchLiveYouTubeRelated(videoId);
    if (tracks.length > 0) {
      return NextResponse.json({ tracks, source: 'watch_page' });
    }
  } catch (err) {
    console.warn('[YouTube Related Route] Watch page fetch failed:', err);
  }

  return NextResponse.json({ tracks: [], source: 'empty' });
}

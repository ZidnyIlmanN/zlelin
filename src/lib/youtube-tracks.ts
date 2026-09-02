import { MusicTrack } from '@/domain/music';

type VideoRendererLike = {
  videoId?: string;
  title?: { runs?: { text?: string }[]; simpleText?: string };
  ownerText?: { runs?: { text?: string }[] };
  shortBylineText?: { runs?: { text?: string }[] };
  longBylineText?: { runs?: { text?: string }[] };
  thumbnail?: { thumbnails?: { url?: string }[] };
  lengthText?: { simpleText?: string; accessibility?: { accessibilityData?: { label?: string } } };
};

export function extractYtInitialData(html: string): unknown | null {
  const marker = 'ytInitialData = ';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;

  const jsonStart = startIdx + marker.length;
  const jsonEnd = html.indexOf(';</script>', jsonStart);
  if (jsonEnd === -1) return null;

  try {
    return JSON.parse(html.substring(jsonStart, jsonEnd).trim());
  } catch {
    return null;
  }
}

function mapRendererToTrack(renderer: VideoRendererLike, videoId: string): MusicTrack {
  const title =
    renderer.title?.runs?.[0]?.text ||
    renderer.title?.simpleText ||
    'YouTube Music Track';

  const artist =
    renderer.ownerText?.runs?.[0]?.text ||
    renderer.shortBylineText?.runs?.[0]?.text ||
    renderer.longBylineText?.runs?.[0]?.text ||
    'YouTube Artist';

  const thumbnails = renderer.thumbnail?.thumbnails || [];
  const thumbnail =
    thumbnails.length > 0
      ? thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const lengthText =
    renderer.lengthText?.simpleText ||
    renderer.lengthText?.accessibility?.accessibilityData?.label ||
    '';

  let duration = 240;
  const timeMatch = lengthText.match(/(\d+):(\d+)(?::(\d+))?/);
  if (timeMatch) {
    const a = Number(timeMatch[1]);
    const b = Number(timeMatch[2]);
    const c = timeMatch[3] ? Number(timeMatch[3]) : null;
    duration = c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
  }

  return {
    id: `youtube-${videoId}`,
    title,
    artist,
    thumbnail,
    youtubeVideoId: videoId,
    duration,
    category: 'YouTube',
    source: 'youtube',
  };
}

export function collectTracksFromYtData(
  data: unknown,
  options?: { excludeVideoId?: string; limit?: number }
): MusicTrack[] {
  const limit = options?.limit ?? 20;
  const exclude = options?.excludeVideoId;
  const tracks: MusicTrack[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown) => {
    if (!node || tracks.length >= limit) return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (typeof node !== 'object') return;

    const obj = node as Record<string, unknown>;
    const renderer =
      (obj.compactVideoRenderer as VideoRendererLike | undefined) ||
      (obj.videoRenderer as VideoRendererLike | undefined) ||
      (obj.playlistVideoRenderer as VideoRendererLike | undefined);

    if (renderer?.videoId && !seen.has(renderer.videoId) && renderer.videoId !== exclude) {
      seen.add(renderer.videoId);
      tracks.push(mapRendererToTrack(renderer, renderer.videoId));
    }

    for (const value of Object.values(obj)) {
      walk(value);
      if (tracks.length >= limit) break;
    }
  };

  walk(data);
  return tracks;
}

export function getYouTubeVideoId(track: MusicTrack): string {
  return track.youtubeVideoId || track.id.replace(/^youtube-/, '');
}

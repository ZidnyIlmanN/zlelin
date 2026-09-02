import { MusicTrack } from '@/domain/music';
import { getYouTubeVideoId } from '@/lib/youtube-tracks';

const GENRE_KEYWORDS: Record<string, string[]> = {
  'Lo-fi': ['lofi', 'lo-fi', 'lo fi', 'chillhop', 'lofigirl'],
  Jazz: ['jazz', 'coffeehouse', 'bossa', 'swing', 'saxophone'],
  Acoustic: ['acoustic', 'unplugged', 'fingerstyle'],
  Focus: ['focus', 'study', 'concentration', 'work', 'homework'],
  Chill: ['chill', 'relax', 'ambient', 'calm', 'soothing'],
  Pop: ['pop', 'official music video'],
  Rock: ['rock', 'metal', 'punk'],
  Electronic: ['edm', 'electronic', 'house', 'techno', 'synth'],
  Rainy: ['rain', 'rainy', 'storm'],
  Nature: ['nature', 'forest', 'ocean', 'birds'],
  Coffee: ['coffee', 'cafe', 'coffeehouse'],
  Night: ['night', 'midnight', 'sleep', 'bedtime'],
};

export function normalizeSongKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\bofficial\b/gi, ' ')
    .replace(/\bvideo\b/gi, ' ')
    .replace(/\blyrics?\b/gi, ' ')
    .replace(/\bfeat\.?\b/gi, ' ')
    .replace(/\bft\.?\b/gi, ' ')
    .replace(/\bhd\b/gi, ' ')
    .replace(/\b4k\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeArtist(artist: string): string {
  return artist
    .toLowerCase()
    .replace(/\bvevo\b/gi, ' ')
    .replace(/\bofficial\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferGenresFromText(text: string): string[] {
  const haystack = text.toLowerCase();
  return Object.entries(GENRE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))
    .map(([genre]) => genre);
}

export function isSameYoutubeSong(a: MusicTrack, b: MusicTrack): boolean {
  if (getYouTubeVideoId(a) === getYouTubeVideoId(b)) return true;

  const keyA = normalizeSongKey(a.title);
  const keyB = normalizeSongKey(b.title);
  if (!keyA || !keyB) return false;
  if (keyA === keyB) return true;

  const shorter = keyA.length < keyB.length ? keyA : keyB;
  const longer = keyA.length < keyB.length ? keyB : keyA;
  if (shorter.length >= 10 && longer.includes(shorter)) return true;

  return false;
}

function hasBeenPlayed(candidate: MusicTrack, playedTracks: MusicTrack[]): boolean {
  return playedTracks.some((played) => isSameYoutubeSong(played, candidate));
}

function scoreAutoplayCandidate(
  current: MusicTrack,
  candidate: MusicTrack,
  currentGenres: string[],
  index: number,
  contextQuery: string
): number {
  if (isSameYoutubeSong(current, candidate)) return Number.NEGATIVE_INFINITY;

  let score = 80 - index;

  const candidateGenres = inferGenresFromText(
    `${candidate.title} ${candidate.artist} ${contextQuery}`
  );

  for (const genre of candidateGenres) {
    if (currentGenres.includes(genre)) {
      score += 28;
    }
  }

  const currentArtist = normalizeArtist(current.artist);
  const candidateArtist = normalizeArtist(candidate.artist);
  if (currentArtist && candidateArtist && currentArtist === candidateArtist) {
    score += 18;
  }

  const currentWords = new Set(
    normalizeSongKey(current.title)
      .split(' ')
      .filter((word) => word.length > 3)
  );
  const sharedWords = normalizeSongKey(candidate.title)
    .split(' ')
    .filter((word) => word.length > 3 && currentWords.has(word)).length;
  score += Math.min(sharedWords * 4, 16);

  return score;
}

export function pickBestYoutubeAutoplayTrack(
  current: MusicTrack,
  pool: MusicTrack[],
  history: MusicTrack[],
  contextQuery = ''
): MusicTrack | null {
  const playedTracks = [current, ...history.filter((track) => track.source === 'youtube')];
  const seenVideoIds = new Set<string>();
  const uniquePool: MusicTrack[] = [];

  for (const track of pool) {
    const videoId = getYouTubeVideoId(track);
    if (seenVideoIds.has(videoId)) continue;
    seenVideoIds.add(videoId);
    uniquePool.push(track);
  }

  const candidates = uniquePool.filter((track) => !hasBeenPlayed(track, playedTracks));
  if (candidates.length === 0) return null;

  const currentGenres = inferGenresFromText(
    `${current.title} ${current.artist} ${contextQuery}`
  );

  const ranked = candidates
    .map((track, index) => ({
      track,
      score: scoreAutoplayCandidate(current, track, currentGenres, index, contextQuery),
    }))
    .filter((item) => item.score > Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.track ?? null;
}

export function buildYoutubeAutoplaySearchQuery(current: MusicTrack, contextQuery = ''): string {
  const genres = inferGenresFromText(`${current.title} ${current.artist} ${contextQuery}`);
  const genre = genres[0];

  if (genre && current.artist) {
    return `${current.artist} ${genre}`;
  }

  if (genre) {
    return `${normalizeSongKey(current.title).split(' ').slice(0, 3).join(' ')} ${genre}`;
  }

  return current.artist || current.title;
}

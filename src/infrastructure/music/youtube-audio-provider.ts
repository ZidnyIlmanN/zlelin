import { MusicTrack } from '@/domain/music';
import { MusicProvider, MusicProviderEvents } from './music-provider';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export class YouTubeAudioProvider implements MusicProvider {
  readonly type = 'youtube';
  private player: any = null;
  private isPlayerReady = false;
  private events: MusicProviderEvents = {};
  private currentTrack: MusicTrack | null = null;
  private isPlaying = false;
  private timeUpdateInterval: number | null = null;
  private containerId = 'zlelin-youtube-player-hidden';
  private pendingVideoId: string | null = null;
  private pendingStartPosition = 0;
  private pendingAutoPlay = false;
  private onVolumeRequest: (() => number) | null = null;

  constructor(onVolumeRequest?: () => number) {
    this.onVolumeRequest = onVolumeRequest ?? null;
    if (typeof window !== 'undefined') {
      this.ensureIFrameContainer();
      this.loadYouTubeIframeAPI();
    }
  }

  public setVolumeRequestCallback(callback: () => number): void {
    this.onVolumeRequest = callback;
  }

  private getEffectiveVolume(): number {
    if (this.onVolumeRequest) {
      return Math.round(Math.max(0, Math.min(1, this.onVolumeRequest())) * 100);
    }
    return 70;
  }

  private applyVolume(): void {
    const vol = this.getEffectiveVolume();
    if (this.player && this.isPlayerReady) {
      try {
        this.player.setVolume(vol);
      } catch {
        // ignore
      }
    }
  }

  setEvents(events: MusicProviderEvents) {
    this.events = events;
  }

  private ensureIFrameContainer() {
    if (typeof document === 'undefined') return;
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      // Position off-screen / 1px transparent container compliant with player requirements
      container.style.position = 'fixed';
      container.style.bottom = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '200px';
      container.style.height = '200px';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-9999';
      document.body.appendChild(container);
    }
  }

  private loadYouTubeIframeAPI() {
    if (window.YT && window.YT.Player) {
      this.initializePlayer();
      return;
    }

    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      this.initializePlayer();
    };
  }

  private initializePlayer() {
    if (this.player || typeof window.YT === 'undefined' || !window.YT.Player) return;

    try {
      this.player = new window.YT.Player(this.containerId, {
        height: '200',
        width: '200',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: () => {
            this.isPlayerReady = true;
            this.applyVolume();
            this.events.onReady?.();

            if (this.pendingVideoId) {
              const vid = this.pendingVideoId;
              const start = this.pendingStartPosition;
              const auto = this.pendingAutoPlay;
              this.pendingVideoId = null;
              this.playVideoById(vid, start, auto);
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            if (event.data === 1) {
              this.isPlaying = true;
              this.events.onStateChange?.(true);
              this.startTimeTracker();
            } else if (event.data === 2) {
              this.isPlaying = false;
              this.events.onStateChange?.(false);
              this.stopTimeTracker();
            } else if (event.data === 0) {
              this.isPlaying = false;
              this.events.onStateChange?.(false);
              this.stopTimeTracker();
              this.events.onEnded?.();
            }
          },
          onError: (event: any) => {
            console.warn('[YouTubeAudioProvider] Player error code:', event.data);
            const errorMessages: Record<number, string> = {
              2: 'Invalid video parameter',
              5: 'HTML5 player error',
              100: 'Video not found or removed',
              101: 'Video embedding is disabled by owner',
              150: 'Video embedding is restricted',
            };
            const message = errorMessages[event.data] || 'Playback error on YouTube track';
            this.events.onError?.(message);
            // Skip to next track on error
            this.events.onEnded?.();
          },
        },
      });
    } catch (err) {
      console.error('[YouTubeAudioProvider] Failed to create YT.Player instance:', err);
    }
  }

  private startTimeTracker() {
    this.stopTimeTracker();
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.player && this.isPlayerReady && this.isPlaying) {
        try {
          this.applyVolume();
          const current = this.player.getCurrentTime() || 0;
          const total = this.player.getDuration() || this.currentTrack?.duration || 0;
          this.events.onTimeUpdate?.(current, total);
        } catch {}
      }
    }, 250);
  }

  private stopTimeTracker() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  private playVideoById(videoId: string, startPosition: number = 0, autoPlay: boolean = false) {
    if (!this.player || !this.isPlayerReady) return;

    try {
      if (autoPlay) {
        this.player.loadVideoById({
          videoId,
          startSeconds: startPosition,
        });
      } else {
        this.player.cueVideoById({
          videoId,
          startSeconds: startPosition,
        });
      }
      this.applyVolume();
    } catch (err) {
      console.error('[YouTubeAudioProvider] loadVideoById error:', err);
    }
  }

  async load(track: MusicTrack, startPosition: number = 0, autoPlay: boolean = false): Promise<void> {
    this.currentTrack = track;
    const videoId = track.youtubeVideoId || track.audioUrl || track.id.replace('youtube-', '');

    if (!this.isPlayerReady || !this.player) {
      this.pendingVideoId = videoId;
      this.pendingStartPosition = startPosition;
      this.pendingAutoPlay = autoPlay;
      return;
    }

    this.playVideoById(videoId, startPosition, autoPlay);
  }

  async play(): Promise<void> {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.playVideo();
      } catch (err) {
        console.warn('[YouTubeAudioProvider] playVideo error:', err);
      }
    }
  }

  pause(): void {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.pauseVideo();
      } catch (err) {
        console.warn('[YouTubeAudioProvider] pauseVideo error:', err);
      }
    }
  }

  seek(position: number): void {
    if (this.player && this.isPlayerReady && !isNaN(position) && isFinite(position)) {
      try {
        this.player.seekTo(position, true);
      } catch {}
    }
  }

  setVolume(_volume: number): void {
    this.applyVolume();
  }

  async fadeIn(durationMs: number): Promise<void> {
    await this.animateVolume(0, this.getEffectiveVolume(), durationMs);
  }

  async fadeOut(durationMs: number): Promise<void> {
    const start = this.getEffectiveVolume();
    await this.animateVolume(start, 0, durationMs);
  }

  private animateVolume(from: number, to: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.player || !this.isPlayerReady || durationMs <= 0) {
        this.applyVolume();
        resolve();
        return;
      }

      const startTime = performance.now();
      const tick = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const current = from + (to - from) * progress;
        try {
          this.player.setVolume(Math.round(current));
        } catch {
          // ignore
        }
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          this.applyVolume();
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  getCurrentTime(): number {
    if (this.player && this.isPlayerReady) {
      try {
        return this.player.getCurrentTime() || 0;
      } catch {}
    }
    return 0;
  }

  getDuration(): number {
    if (this.player && this.isPlayerReady) {
      try {
        const d = this.player.getDuration();
        if (d && d > 0) return d;
      } catch {}
    }
    return this.currentTrack?.duration || 240;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  destroy(): void {
    this.stopTimeTracker();
    if (this.player && this.isPlayerReady) {
      try {
        this.player.stopVideo();
        this.player.destroy();
      } catch {}
      this.player = null;
      this.isPlayerReady = false;
    }
    this.currentTrack = null;
    this.isPlaying = false;
  }
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/infrastructure/supabase/client';
import { useAuthStore } from './use-auth-store';
import { useWorkspaceStore } from './use-workspace-store';
import { AudioEngine } from '@/infrastructure/audio/audio-engine';

export interface RemoteStream {
  peerId: string;
  stream: MediaStream;
}

interface PeerConnectionWrapper {
  pc: RTCPeerConnection;
  isMakingOffer: boolean;
  ignoreOffer: boolean;
}

export function useWebRtcCall(roomId: string) {
  const { user } = useAuthStore();
  const { isCamOn, isMicOn, participants, addToast } = useWorkspaceStore();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);

  const peerWrappersRef = useRef<Record<string, PeerConnectionWrapper>>({});
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Helper: Create and initialize RTCPeerConnection with Perfect Negotiation pattern
  const getOrCreatePeerConnection = useCallback((peerId: string, channel: any) => {
    if (peerWrappersRef.current[peerId]) {
      return peerWrappersRef.current[peerId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    const wrapper: PeerConnectionWrapper = {
      pc,
      isMakingOffer: false,
      ignoreOffer: false,
    };

    // Attach local stream tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Perfect Negotiation: onnegotiationneeded handles offer creation
    pc.onnegotiationneeded = async () => {
      try {
        wrapper.isMakingOffer = true;
        await pc.setLocalDescription();
        if (channel && user?.id) {
          channel.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              from: user.id,
              to: peerId,
              description: pc.localDescription,
            },
          });
        }
      } catch (err) {
        console.warn('[WebRTC] Negotiation error:', err);
      } finally {
        wrapper.isMakingOffer = false;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channel && user?.id) {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { from: user.id, to: peerId, candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        setRemoteStreams((prev) => {
          const filtered = prev.filter((s) => s.peerId !== peerId);
          return [...filtered, { peerId, stream }];
        });

        try {
          AudioEngine.getInstance().connectVoiceStream(stream, peerId);
        } catch {
          // AudioEngine not ready
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        try {
          AudioEngine.getInstance().disconnectVoiceStream(peerId);
        } catch {
          // ignore
        }
        setRemoteStreams((prev) => prev.filter((s) => s.peerId !== peerId));
      }
    };

    peerWrappersRef.current[peerId] = wrapper;
    return wrapper;
  }, [user?.id]);

  // Helper: Attach/replace track across all peers
  const syncTrackToPeers = useCallback((track: MediaStreamTrack | null, kind: 'audio' | 'video') => {
    Object.values(peerWrappersRef.current).forEach(({ pc }) => {
      const senders = pc.getSenders();
      const existingSender = senders.find((s) => s.track?.kind === kind);
      if (existingSender) {
        existingSender.replaceTrack(track);
      } else if (track && localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });
  }, []);

  // Manage Decoupled Audio & Video Media Streams
  useEffect(() => {
    let isCancelled = false;

    async function syncMedia() {
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) return;

      const current = localStreamRef.current || new MediaStream();
      let hasChanged = false;

      // 1. Manage Audio Track independently
      const existingAudio = current.getAudioTracks()[0];
      if (isMicOn) {
        if (!existingAudio) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (isCancelled) {
              audioStream.getTracks().forEach((t) => t.stop());
              return;
            }
            const newAudioTrack = audioStream.getAudioTracks()[0];
            if (newAudioTrack) {
              newAudioTrack.enabled = true;
              current.addTrack(newAudioTrack);
              hasChanged = true;
              syncTrackToPeers(newAudioTrack, 'audio');
            }
          } catch (err) {
            console.warn('[WebRTC] Microphone access denied:', err);
            useWorkspaceStore.getState().toggleMic();
            addToast('Microphone access blocked');
          }
        } else {
          existingAudio.enabled = true;
          syncTrackToPeers(existingAudio, 'audio');
        }
      } else {
        if (existingAudio) {
          existingAudio.enabled = false;
        }
      }

      // 2. Manage Video Track independently (without affecting microphone)
      const existingVideo = current.getVideoTracks()[0];
      if (isCamOn) {
        if (!existingVideo) {
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 24 },
                facingMode: 'user',
              },
            });
            if (isCancelled) {
              videoStream.getTracks().forEach((t) => t.stop());
              return;
            }
            const newVideoTrack = videoStream.getVideoTracks()[0];
            if (newVideoTrack) {
              current.addTrack(newVideoTrack);
              hasChanged = true;
              syncTrackToPeers(newVideoTrack, 'video');
            }
          } catch (err) {
            console.warn('[WebRTC] Camera access denied:', err);
            useWorkspaceStore.getState().toggleCam();
            addToast('Camera access blocked');
          }
        }
      } else {
        if (existingVideo) {
          existingVideo.stop();
          current.removeTrack(existingVideo);
          hasChanged = true;
          syncTrackToPeers(null, 'video');
        }
      }

      if (hasChanged || current.getTracks().length > 0) {
        setLocalStream(new MediaStream(current.getTracks()));
      } else if (!isMicOn && !isCamOn) {
        setLocalStream(null);
      }
    }

    syncMedia();

    return () => {
      isCancelled = true;
    };
  }, [isCamOn, isMicOn, addToast, syncTrackToPeers]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // WebRTC Signaling Channel with Perfect Negotiation collision handling
  useEffect(() => {
    if (!isSupabaseConfigured || !user || !roomId) return;

    const channel = supabase.channel(`webrtc:${roomId}`);

    channel
      .on('broadcast', { event: 'webrtc-announce' }, ({ payload }) => {
        if (payload.from && payload.from !== user.id) {
          const wrapper = getOrCreatePeerConnection(payload.from, channel);
          if (localStreamRef.current) {
            const senders = wrapper.pc.getSenders();
            localStreamRef.current.getTracks().forEach((track) => {
              const existing = senders.find((s) => s.track?.kind === track.kind);
              if (existing) {
                existing.replaceTrack(track);
              } else {
                wrapper.pc.addTrack(track, localStreamRef.current!);
              }
            });
          }
        }
      })
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        if (payload.to !== user.id) return;
        const fromId = payload.from;
        const description = payload.description;
        if (!description) return;

        const isPolite = user.id > fromId;
        const wrapper = getOrCreatePeerConnection(fromId, channel);
        const pc = wrapper.pc;

        try {
          const isOffer = description.type === 'offer';
          const offerCollision = isOffer && (wrapper.isMakingOffer || pc.signalingState !== 'stable');

          wrapper.ignoreOffer = !isPolite && offerCollision;
          if (wrapper.ignoreOffer) {
            return;
          }

          if (offerCollision && pc.signalingState !== 'stable') {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' } as any),
              pc.setRemoteDescription(new RTCSessionDescription(description)),
            ]);
          } else {
            if (description.type === 'answer' && pc.signalingState !== 'have-local-offer') {
              return;
            }
            await pc.setRemoteDescription(new RTCSessionDescription(description));
          }

          if (description.type === 'offer') {
            if (localStreamRef.current) {
              const senders = pc.getSenders();
              localStreamRef.current.getTracks().forEach((track) => {
                if (!senders.some((s) => s.track?.kind === track.kind)) {
                  pc.addTrack(track, localStreamRef.current!);
                }
              });
            }

            await pc.setLocalDescription();
            channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                from: user.id,
                to: fromId,
                description: pc.localDescription,
              },
            });
          }
        } catch (err) {
          console.warn('[WebRTC] Failed to handle signal description:', err);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to !== user.id) return;
        const wrapper = peerWrappersRef.current[payload.from];
        if (wrapper && payload.candidate) {
          try {
            await wrapper.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            if (!wrapper.ignoreOffer) {
              console.warn('[WebRTC] ICE candidate error:', e);
            }
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'webrtc-announce',
            payload: { from: user.id },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      Object.values(peerWrappersRef.current).forEach(({ pc }) => pc.close());
      peerWrappersRef.current = {};
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, user?.id, getOrCreatePeerConnection]);

  return {
    localStream,
    remoteStreams,
  };
}

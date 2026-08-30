import { create } from 'zustand';
import { PuzzleItem } from '@/domain/puzzle';
import { Participant, RoomConfig, ChatMessage, RoomInvite } from '@/domain/room';
import { TableTheme, MusicTrackId, MUSIC_TRACKS } from '@/domain/theme';

export type ActiveView = 'home' | 'library' | 'lobby' | 'game';

export interface ToastItem {
  id: string;
  message: string;
}

interface WorkspaceState {
  currentView: ActiveView;
  currentTheme: TableTheme;
  selectedPuzzle: PuzzleItem;
  roomConfig: RoomConfig;
  participants: Participant[];
  chatFeed: ChatMessage[];
  chatHistory: ChatMessage[];
  toasts: ToastItem[];
  incomingInvite: RoomInvite | null;
  
  // Controls
  isMicOn: boolean;
  isCamOn: boolean;
  isVcExpanded: boolean;
  isPlayingMusic: boolean;
  isAmbientPlaying: boolean;
  selectedMusicTrack: MusicTrackId;
  showReferenceOverlay: boolean;
  
  // Modals
  isUploadModalOpen: boolean;
  isVictoryModalOpen: boolean;
  isMusicModalOpen: boolean;
  isChatModalOpen: boolean;
  
  // Stats
  gameStats: {
    timeSeconds: number;
    movesCount: number;
    accuracyPercent: number;
  };

  // Actions
  switchView: (view: ActiveView) => void;
  setTheme: (theme: TableTheme) => void;
  selectPuzzle: (puzzle: PuzzleItem) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  setVcExpanded: (val: boolean) => void;
  toggleMusic: () => void;
  toggleAmbient: () => void;
  setMusicTrack: (track: MusicTrackId) => void;
  toggleReferenceOverlay: () => void;
  setUploadModalOpen: (open: boolean) => void;
  setVictoryModalOpen: (open: boolean) => void;
  setMusicModalOpen: (open: boolean) => void;
  setChatModalOpen: (open: boolean) => void;
  addChatMessage: (sender: string, text: string) => void;
  addToast: (message: string) => void;
  removeToast: (id: string) => void;
  updateRoomConfig: (partial: Partial<RoomConfig>) => void;
  setParticipants: (participants: Participant[]) => void;
  setIncomingInvite: (invite: RoomInvite | null) => void;
  acceptInvite: (invite: RoomInvite) => void;
  joinRoomById: (roomId: string) => void;
  triggerVictory: () => void;
}

export const samplePuzzles: PuzzleItem[] = [
  { id: 1, title: 'Lake Como Sunset', category: 'Nature', pieces: 24, url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&auto=format&fit=crop&q=80' },
  { id: 2, title: 'Cozy Rain in Kyoto', category: 'Cozy Interiors', pieces: 24, url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80' },
  { id: 3, title: 'Alpine Pine Forest', category: 'Nature', pieces: 48, url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80' },
  { id: 4, title: 'Minimalist Sand Dunes', category: 'Minimal & Abstract', pieces: 12, url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&auto=format&fit=crop&q=80' },
  { id: 5, title: 'Coffee Shop Table', category: 'Cozy Interiors', pieces: 24, url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80' },
  { id: 6, title: 'Santorini Sunset Vista', category: 'Cityscapes', pieces: 48, url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&auto=format&fit=crop&q=80' },
  { id: 7, title: 'Autumn Leaf Pathway', category: 'Nature', pieces: 24, url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80' },
  { id: 8, title: 'Pastel Dreamscape', category: 'Illustration', pieces: 12, url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80' }
];

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentView: 'home',
  currentTheme: 'wood',
  selectedPuzzle: samplePuzzles[0],
  roomConfig: {
    id: 'ZLE-8842',
    title: 'Cozy Sunday Session',
    hostName: 'Host',
    pieceCount: 24,
    allowRotation: false,
    theme: 'wood',
    musicTrack: 'jazz',
  },
  participants: [],
  chatFeed: [],
  chatHistory: [],
  toasts: [],
  incomingInvite: null,

  isMicOn: true,
  isCamOn: false,
  isVcExpanded: false,
  isPlayingMusic: true,
  isAmbientPlaying: false,
  selectedMusicTrack: 'jazz',
  showReferenceOverlay: true,

  isUploadModalOpen: false,
  isVictoryModalOpen: false,
  isMusicModalOpen: false,
  isChatModalOpen: false,

  gameStats: {
    timeSeconds: 258,
    movesCount: 38,
    accuracyPercent: 96,
  },

  switchView: (view) => set({ currentView: view }),

  setTheme: (theme) => {
    if (get().currentTheme === theme) return;
    set({ currentTheme: theme });
    get().addToast(`Theme changed to ${theme.toUpperCase()}`);
  },

  selectPuzzle: (puzzle) => {
    set((state) => ({
      selectedPuzzle: puzzle,
      roomConfig: { ...state.roomConfig, pieceCount: puzzle.pieces },
    }));
  },

  toggleMic: () => {
    const next = !get().isMicOn;
    set({ isMicOn: next });
    get().addToast(next ? 'Microphone On' : 'Microphone Muted');
  },

  toggleCam: () => {
    const next = !get().isCamOn;
    set({ isCamOn: next });
    get().addToast(next ? 'Camera Stream Active' : 'Camera Off');
  },

  setVcExpanded: (val) => {
    set({ isVcExpanded: val });
  },

  toggleMusic: () => {
    const next = !get().isPlayingMusic;
    set({ isPlayingMusic: next });
    get().addToast(next ? 'Music playing in sync' : 'Music paused');
  },

  toggleAmbient: () => {
    const next = !get().isAmbientPlaying;
    set({ isAmbientPlaying: next });
    get().addToast(next ? 'Cafe ambient murmur started' : 'Ambient muted');
  },

  setMusicTrack: (track) => {
    const info = MUSIC_TRACKS.find(t => t.id === track);
    set({ selectedMusicTrack: track });
    if (info) get().addToast(`Track changed to ${info.title}`);
  },

  toggleReferenceOverlay: () => {
    set((state) => ({ showReferenceOverlay: !state.showReferenceOverlay }));
  },

  setUploadModalOpen: (open) => set({ isUploadModalOpen: open }),
  setVictoryModalOpen: (open) => set({ isVictoryModalOpen: open }),
  setMusicModalOpen: (open) => set({ isMusicModalOpen: open }),
  setChatModalOpen: (open) => set({ isChatModalOpen: open }),

  addChatMessage: (sender, text) => {
    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender,
      text,
      timestamp: Date.now(),
    };
    set((state) => ({
      chatHistory: [...state.chatHistory, msg],
      chatFeed: [...state.chatFeed, msg],
    }));

    setTimeout(() => {
      set((state) => ({
        chatFeed: state.chatFeed.filter((m) => m.id !== msg.id),
      }));
    }, 5000);
  },

  addToast: (message) => {
    // Avoid spamming identical toast if one is already showing
    const isDuplicate = get().toasts.some((t) => t.message === message);
    if (isDuplicate) return;

    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message }] }));

    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  updateRoomConfig: (partial) => {
    set((state) => ({ roomConfig: { ...state.roomConfig, ...partial } }));
  },

  setParticipants: (participants) => {
    set({ participants });
  },

  setIncomingInvite: (invite) => {
    set({ incomingInvite: invite });
  },

  acceptInvite: (invite) => {
    set({
      selectedPuzzle: invite.room.puzzle,
      roomConfig: {
        ...get().roomConfig,
        id: invite.room.id,
        title: invite.room.title,
        pieceCount: invite.room.pieceCount,
        theme: invite.room.theme,
        musicTrack: invite.room.musicTrack,
      },
      currentTheme: (invite.room.theme as TableTheme) || 'wood',
      selectedMusicTrack: (invite.room.musicTrack as MusicTrackId) || 'jazz',
      incomingInvite: null,
      currentView: 'lobby',
    });
    get().addToast(`Joined room "${invite.room.title}" hosted by ${invite.sender.name}!`);
  },

  joinRoomById: (roomId) => {
    const formatted = roomId.trim().toUpperCase();
    if (!formatted) return;
    set((state) => ({
      roomConfig: {
        ...state.roomConfig,
        id: formatted,
        title: `Room ${formatted}`,
      },
      currentView: 'lobby',
    }));
    get().addToast(`Connecting to Room ${formatted}...`);
  },

  triggerVictory: () => {
    set({ isVictoryModalOpen: true });
  },
}));

import { PuzzleItem } from './puzzle';

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isMicOn: boolean;
  isCamOn: boolean;
  isSpeaking?: boolean;
}

export interface PeerCursor {
  name: string;
  x: number;
  y: number;
  color: string;
  activePiece?: number | null;
}

export interface RoomConfig {
  id: string;
  title: string;
  hostName: string;
  pieceCount: number;
  allowRotation: boolean;
  theme: string;
  musicTrack: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface RoomInvite {
  id: string;
  sender: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  room: {
    id: string;
    title: string;
    puzzle: PuzzleItem;
    pieceCount: number;
    theme: string;
    musicTrack: string;
  };
  timestamp: number;
}

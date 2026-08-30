import { UserProfile } from './auth';

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: string;
  friendProfile?: UserProfile;
}

export interface FriendRequest {
  id: string;
  fromUser: UserProfile;
  createdAt: string;
}

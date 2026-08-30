'use client';

import React, { useEffect } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useInviteNotifications } from '@/application/use-invite-notifications';
import { Header } from '@/components/layout/Header';
import { HomeView } from '@/components/views/HomeView';
import { LibraryView } from '@/components/views/LibraryView';
import { LobbyView } from '@/components/views/LobbyView';
import { WorkspaceView } from '@/components/views/WorkspaceView';
import { UploadAiModal } from '@/components/modals/UploadAiModal';
import { VictoryModal } from '@/components/modals/VictoryModal';
import { AuthModal } from '@/components/modals/AuthModal';
import { FriendsModal } from '@/components/modals/FriendsModal';
import { MusicModal } from '@/components/modals/MusicModal';
import { MusicCenterModal } from '@/components/modals/MusicCenterModal';
import { InviteNotificationModal } from '@/components/modals/InviteNotificationModal';
import { ChatModal } from '@/components/modals/ChatModal';
import { ProfileSettingsModal } from '@/components/modals/ProfileSettingsModal';

export default function MainPage() {
  const { currentView, joinRoomById } = useWorkspaceStore();
  
  // Listen for real-time room invitations across friends
  useInviteNotifications();

  // Check URL query parameters for ?room=XYZ or ?join=XYZ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room') || params.get('join');
      if (roomParam) {
        joinRoomById(roomParam);
      }
    }
  }, [joinRoomById]);

  return (
    <>
      <Header />

      <main className="flex-1 relative pt-20">
        {currentView === 'home' && <HomeView />}
        {currentView === 'library' && <LibraryView />}
        {currentView === 'lobby' && <LobbyView />}
        {currentView === 'game' && <WorkspaceView />}
      </main>

      <UploadAiModal />
      <VictoryModal />
      <AuthModal />
      <FriendsModal />
      <MusicModal />
      <MusicCenterModal />
      <InviteNotificationModal />
      <ChatModal />
      <ProfileSettingsModal />
    </>
  );
}

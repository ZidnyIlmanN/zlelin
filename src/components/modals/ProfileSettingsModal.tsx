'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/application/use-auth-store';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { X, Upload, Check, User, Camera, LogOut, Trophy, Puzzle } from 'lucide-react';
import Image from 'next/image';

const PRESET_AVATARS = [
  { id: 'av-1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', label: 'Cozy Portrait' },
  { id: 'av-2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', label: 'Warm Smile' },
  { id: 'av-3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', label: 'Aesthetic Chill' },
  { id: 'av-4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', label: 'Coffee Vibe' },
  { id: 'av-5', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', label: 'Art Lover' },
  { id: 'av-6', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80', label: 'Nature Scout' },
  { id: 'av-7', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80', label: 'Lo-Fi Chill' },
  { id: 'av-8', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80', label: 'Minimalist' },
];

export function ProfileSettingsModal() {
  const { user, isProfileModalOpen, setProfileModalOpen, updateProfile, signOut } = useAuthStore();
  const { addToast } = useWorkspaceStore();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'avatar'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user, isProfileModalOpen]);

  if (!isProfileModalOpen || !user) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size exceeds 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
        addToast('Photo selected! Click Save to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile({
        fullName: fullName.trim() || user.fullName,
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || user.username,
        avatarUrl,
      });

      addToast('Profile updated successfully!');
      setProfileModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in select-none">
      {/* Dark Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 transition-opacity"
        onClick={() => setProfileModalOpen(false)}
      />

      {/* Minimalist Cozy Profile Card */}
      <div className="relative w-full max-w-md bg-[#0F1513] rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden z-10 animate-scale-up text-white flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400">
            Profile Setting
          </span>
          <button
            onClick={() => setProfileModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="px-7 pb-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* Avatar & Player Info */}
          <div className="flex flex-col items-center text-center pt-2">
            <div className="relative mb-3">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-neutral-900 ring-1 ring-white/10 group">
                <Image
                  src={avatarUrl || user.avatarUrl}
                  alt={fullName || 'Avatar'}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-neutral-200 mb-0.5" />
                  <span className="text-[9px] font-medium text-neutral-300">Edit</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight">
              {fullName || user.fullName || 'Cozy Player'}
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              @{username || user.username}
            </p>
          </div>

          {/* Minimal Stat Badges */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/[0.03]">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-white/5 text-neutral-300 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-amber-300/80" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Level</p>
                <p className="text-xs font-bold text-neutral-200">Master Puzzler</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-white/5 text-neutral-300 flex items-center justify-center shrink-0">
                <Puzzle className="w-4 h-4 text-sage-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Score</p>
                <p className="text-xs font-bold text-neutral-200">2,480 pts</p>
              </div>
            </div>
          </div>

          {/* Segmented Switcher Tab */}
          <div className="flex items-center p-1 rounded-2xl bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Edit Identity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('avatar')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'avatar'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Choose Avatar
            </button>
          </div>

          {/* Tab 1: Edit Identity Form */}
          {activeTab === 'profile' && (
            <div className="space-y-3 pt-1 animate-fade-in">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  required
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] focus:outline-none focus:bg-white/[0.06] text-xs text-white placeholder-neutral-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-white/[0.04] focus:outline-none focus:bg-white/[0.06] text-xs text-white font-mono placeholder-neutral-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Connected Account
                </label>
                <input
                  type="email"
                  value={user.email || 'Google Account'}
                  disabled
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.02] text-xs text-neutral-500 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Avatar Presets Grid */}
          {activeTab === 'avatar' && (
            <div className="space-y-3 pt-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-400">
                  Pick Character
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-sage-400 hover:text-sage-300 flex items-center gap-1 transition"
                >
                  <Upload className="w-3 h-3" /> Custom Photo
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = avatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden transition-all duration-200 ${
                        isSelected
                          ? 'ring-2 ring-sage-400 scale-105'
                          : 'opacity-60 hover:opacity-100 hover:scale-105'
                      }`}
                      title={preset.label}
                    >
                      <Image src={preset.url} alt={preset.label} fill unoptimized className="object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-sage-900/50 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="px-7 py-4 border-t border-white/5 flex items-center justify-between gap-3 bg-black/20">
          <button
            type="button"
            onClick={() => {
              setProfileModalOpen(false);
              signOut();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-[#788A75] hover:bg-[#687A65] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

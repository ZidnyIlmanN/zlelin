'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/application/use-auth-store';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { X, Upload, Check, User, Sparkles, LogOut, Camera, Shield } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Dark Blur Backdrop */}
      <div
        className="absolute inset-0 bg-warmbrown-900/60 backdrop-blur-md transition-opacity"
        onClick={() => setProfileModalOpen(false)}
      />

      {/* Solid Opaque Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-cream-200 overflow-hidden z-10 animate-scale-up">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-cream-100 bg-cream-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sage-500 text-white flex items-center justify-center shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-warmbrown-600">Profile Settings</h2>
              <p className="text-xs text-neutral-500">Manage your profile details and avatar</p>
            </div>
          </div>
          <button
            onClick={() => setProfileModalOpen(false)}
            className="w-9 h-9 rounded-full bg-cream-200/80 hover:bg-cream-300 flex items-center justify-center text-warmbrown-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-7 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-cream-100">
            <div className="relative group shrink-0">
              <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg border-4 border-white ring-2 ring-sage-500/30 bg-neutral-900">
                <Image
                  src={avatarUrl || user.avatarUrl}
                  alt={fullName || 'Avatar'}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200"
                title="Upload custom photo"
              >
                <Camera className="w-6 h-6" />
                <span className="text-[9px] font-bold mt-1">Change</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div>
                <h4 className="text-xs font-bold text-warmbrown-600 uppercase tracking-wider">Profile Photo</h4>
                <p className="text-[11px] text-neutral-500">Upload a custom image or pick from cozy presets below.</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-2xl bg-cream-100 hover:bg-cream-200 text-warmbrown-600 text-xs font-semibold inline-flex items-center gap-2 transition border border-cream-200"
              >
                <Upload className="w-3.5 h-3.5 text-sage-600" />
                Upload New Image
              </button>
            </div>
          </div>

          {/* Preset Avatars Gallery */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-warmbrown-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Choose from Presets:
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`relative aspect-square rounded-2xl overflow-hidden transition-all duration-200 ${
                      isSelected
                        ? 'ring-3 ring-sage-500 shadow-md scale-105'
                        : 'opacity-70 hover:opacity-100 hover:scale-105 border border-cream-200'
                    }`}
                    title={preset.label}
                  >
                    <Image src={preset.url} alt={preset.label} fill unoptimized className="object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-sage-600/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Inputs */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-warmbrown-600 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Clara Oswald"
                required
                className="w-full px-4 py-3 rounded-2xl bg-cream-50/60 border border-cream-300 focus:outline-none focus:ring-2 focus:ring-sage-500/20 text-xs text-warmbrown-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-warmbrown-600 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-cream-50/60 border border-cream-300 focus:outline-none focus:ring-2 focus:ring-sage-500/20 text-xs text-warmbrown-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-warmbrown-600 mb-1.5">Email Address</label>
              <input
                type="email"
                value={user.email || 'Google Account'}
                disabled
                className="w-full px-4 py-3 rounded-2xl bg-neutral-100 border border-cream-200 text-xs text-neutral-500 cursor-not-allowed font-medium"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-cream-100">
            <button
              type="button"
              onClick={() => {
                setProfileModalOpen(false);
                signOut();
              }}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-coral-500 hover:bg-coral-50 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-neutral-600 hover:bg-cream-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-2xl bg-sage-500 hover:bg-sage-600 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/application/use-auth-store';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { X, LogIn, UserPlus, Mail, Lock, User, Chrome } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, setAuthModalOpen, authMode, signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuthStore();
  const { addToast } = useWorkspaceStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    if (authMode === 'login') {
      const res = await signInWithPassword(email, password);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        addToast('Successfully signed in!');
      }
    } else {
      if (!username.trim() || !fullName.trim()) {
        setErrorMsg('Username and Full Name are required');
        setIsSubmitting(false);
        return;
      }
      const res = await signUpWithPassword(email, password, username, fullName);
      if (res.error) {
        setErrorMsg(res.error);
      } else if ((res as any).needsEmailConfirmation) {
        setErrorMsg((res as any).message);
        addToast('Please check your email to activate your account.');
      } else {
        addToast('Account created successfully!');
      }
    }
    setIsSubmitting(false);
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    const res = await signInWithGoogle();
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      addToast('Signed in with Google!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="glass-panel max-w-md w-full p-8 rounded-[2.5rem] shadow-float border border-white/80 relative">
        {/* Close Button */}
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-neutral-500 hover:text-warmbrown-600 text-sm transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sage-500 text-white mx-auto flex items-center justify-center mb-3 shadow-md">
            {authMode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h3 className="text-2xl font-serif text-warmbrown-600 font-bold">
            {authMode === 'login' ? 'Welcome Back to Zlelin' : 'Create Your Account'}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {authMode === 'login' ? 'Sign in to join rooms & play with real friends.' : 'Join the cozy spatial puzzle workspace.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-coral-400/10 border border-coral-400/30 text-coral-400 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full py-2.5 px-4 mb-4 rounded-2xl bg-white border border-cream-300 text-warmbrown-600 font-semibold text-xs hover:bg-cream-100 transition shadow-sm flex items-center justify-center gap-2"
        >
          <Chrome className="w-4 h-4 text-sage-500" />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-cream-300"></div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold">OR</span>
          <div className="flex-1 h-px bg-cream-300"></div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {authMode === 'register' && (
            <>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-xs text-warmbrown-600 border border-cream-300 focus:outline-none focus:ring-1 focus:ring-sage-500"
                  required
                />
              </div>

              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-xs text-warmbrown-600 border border-cream-300 focus:outline-none focus:ring-1 focus:ring-sage-500"
                  required
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-xs text-warmbrown-600 border border-cream-300 focus:outline-none focus:ring-1 focus:ring-sage-500"
              required
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-xs text-warmbrown-600 border border-cream-300 focus:outline-none focus:ring-1 focus:ring-sage-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-sage-500 text-white font-semibold text-xs hover:bg-sage-600 transition shadow-md disabled:opacity-50 mt-2"
          >
            {isSubmitting
              ? 'Processing...'
              : authMode === 'login'
              ? 'Sign In to Account'
              : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          {authMode === 'login' ? (
            <p className="text-xs text-neutral-500">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalOpen(true, 'register')}
                className="text-sage-600 font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalOpen(true, 'login')}
                className="text-sage-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

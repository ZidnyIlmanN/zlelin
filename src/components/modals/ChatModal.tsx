'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/application/use-workspace-store';
import { useAuthStore } from '@/application/use-auth-store';
import { sendRoomChatMessage } from '@/application/use-realtime-room';
import { X, MessageSquare, Send, Users, Sparkles, Copy, Check } from 'lucide-react';

const QUICK_REACTIONS = ['👋', '🧩', '👏', '🎉', '🔥', '☕', '✨', '❤️'];

export function ChatModal() {
  const {
    isChatModalOpen,
    setChatModalOpen,
    chatHistory,
    addChatMessage,
    roomConfig,
    participants,
    addToast,
  } = useWorkspaceStore();

  const { user } = useAuthStore();
  const [inputText, setInputText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentUserName = user?.fullName || user?.username || 'You';

  // Auto scroll to bottom when new messages arrive or modal opens
  useEffect(() => {
    if (isChatModalOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isChatModalOpen, chatHistory]);

  if (!isChatModalOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text) return;

    addChatMessage(currentUserName, text);
    sendRoomChatMessage(text);

    if (textToSend === undefined) {
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomConfig.id);
    setCopiedCode(true);
    addToast(`Room code "${roomConfig.id}" copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-3xl shadow-float border border-white/80 flex flex-col h-[600px] max-h-[90vh] overflow-hidden animate-fade-in">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-cream-300 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sage-500 text-white flex items-center justify-center shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold text-warmbrown-600">Room Chat</h3>
                <button
                  onClick={handleCopyRoomCode}
                  className="px-2 py-0.5 rounded-full bg-cream-200 hover:bg-cream-300 text-warmbrown-600 text-[10px] font-mono font-medium flex items-center gap-1 transition"
                  title="Click to copy room code"
                >
                  {roomConfig.id}
                  {copiedCode ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
              <p className="text-xs text-neutral-500 flex items-center gap-1">
                <Users className="w-3 h-3 text-sage-600" />
                <span>{Math.max(1, participants.length)} online in this session</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setChatModalOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-cream-200 flex items-center justify-center text-warmbrown-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-cream-50/50">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
              <div className="w-14 h-14 rounded-3xl bg-sage-100 text-sage-600 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-warmbrown-600 mb-1">No messages yet</h4>
              <p className="text-xs text-neutral-500 max-w-xs mb-5">
                Say hello to your puzzle partner or coordinate piece placement!
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Hi everyone! 👋', 'I will do the edges 🖼️', 'Found a match! ✨'].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="px-3 py-1.5 rounded-2xl bg-white text-xs text-warmbrown-600 border border-cream-300 hover:bg-cream-100 hover:border-sage-300 shadow-sm transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatHistory.map((msg) => {
              const isMe = msg.sender === currentUserName || msg.sender === 'You';
              const isSystem = msg.text.includes('snapped piece') || msg.text.includes('started the session') || msg.text.includes('joined');

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="px-3 py-1 rounded-full bg-cream-200/80 text-[11px] font-medium text-warmbrown-600 shadow-sm border border-cream-300/50">
                      🧩 {msg.sender} {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-sage-200 text-sage-700 flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      {msg.sender.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {!isMe && (
                      <span className="text-[10px] font-bold text-neutral-500 mb-0.5 pl-1">
                        {msg.sender}
                      </span>
                    )}

                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-sage-600 text-white rounded-br-none'
                          : 'bg-white text-warmbrown-600 border border-cream-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>

                    <span className="text-[9px] text-neutral-400 mt-1 px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK EMOJI BAR */}
        <div className="px-6 py-2 bg-white/60 border-t border-cream-200 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">React:</span>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSend(emoji)}
              className="w-7 h-7 rounded-full hover:bg-cream-200 flex items-center justify-center text-sm transition hover:scale-110 active:scale-95"
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* MESSAGE INPUT FOOTER */}
        <div className="p-4 border-t border-cream-300 bg-white/80 flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a friendly message... (Press Enter)"
            className="flex-1 bg-cream-100/80 px-4 py-2.5 rounded-2xl text-xs text-warmbrown-600 border border-cream-300 focus:outline-none focus:ring-2 focus:ring-sage-500 transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-2xl bg-sage-500 text-white flex items-center justify-center shadow-cozy hover:bg-sage-600 disabled:opacity-40 disabled:hover:bg-sage-500 transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentUserName = user?.fullName || user?.username || 'You';

  // Instantly scroll to bottom upon opening so it never starts from the top
  useLayoutEffect(() => {
    if (isChatModalOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [isChatModalOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isChatModalOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      inputRef.current?.focus();
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in">
      <div className="w-full max-w-lg rounded-[2.5rem] bg-[#0F1513] border border-white/5 shadow-2xl flex flex-col h-[580px] max-h-[90vh] overflow-hidden text-white animate-scale-up">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#788A75] text-white flex items-center justify-center shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold text-white">Room Chat</h3>
                <button
                  onClick={handleCopyRoomCode}
                  className="px-2.5 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/10 text-neutral-300 text-[10px] font-mono font-medium flex items-center gap-1 transition"
                  title="Click to copy room code"
                >
                  {roomConfig.id}
                  {copiedCode ? <Check className="w-2.5 h-2.5 text-sage-300" /> : <Copy className="w-2.5 h-2.5 text-neutral-400" />}
                </button>
              </div>
              <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                <Users className="w-3 h-3 text-sage-400" />
                <span>{Math.max(1, participants.length)} online in this room</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setChatModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CHAT MESSAGES BODY */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 bg-[#0C1210] custom-scrollbar"
        >
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
              <div className="w-12 h-12 rounded-2xl bg-white/5 text-sage-400 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">No messages yet</h4>
              <p className="text-xs text-neutral-400 max-w-xs mb-4">
                Say hello or coordinate puzzle pieces with your team!
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {['Hi everyone! 👋', 'I will do the edges 🖼️', 'Found a match! ✨'].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/10 text-xs text-neutral-300 transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatHistory.map((msg) => {
              const isMe = msg.sender === currentUserName || msg.sender === 'You';
              const isSystem =
                msg.text.includes('snapped piece') ||
                msg.text.includes('started the session') ||
                msg.text.includes('joined');

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-1.5">
                    <span className="px-3 py-0.5 rounded-full bg-white/[0.03] text-[10px] font-medium text-sage-300">
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
                    <div className="w-7 h-7 rounded-full bg-white/10 text-sage-300 flex items-center justify-center text-xs font-bold shrink-0">
                      {msg.sender.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    {!isMe && (
                      <span className="text-[10px] font-semibold text-neutral-400 mb-0.5 pl-1">
                        {msg.sender}
                      </span>
                    )}

                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-[#788A75] text-white rounded-br-none'
                          : 'bg-white/[0.05] text-neutral-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>

                    <span className="text-[9px] text-neutral-500 mt-1 px-1">
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
        <div className="px-6 py-2 bg-[#0F1513] border-t border-white/5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mr-1">React:</span>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSend(emoji)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-sm transition hover:scale-110 active:scale-95"
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* MESSAGE INPUT FOOTER */}
        <div className="p-4 border-t border-white/5 bg-[#0F1513] flex items-center gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Press Enter)"
            className="flex-1 bg-white/[0.04] focus:bg-white/[0.07] px-4 py-2.5 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-none transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="w-9 h-9 rounded-2xl bg-[#788A75] hover:bg-[#687A65] text-white flex items-center justify-center disabled:opacity-40 transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

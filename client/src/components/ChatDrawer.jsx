import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Smile, Volume2 } from 'lucide-react';
import AudioMessage from './AudioMessage';
import { sound } from '../utils/soundEngine';

const STICKERS = [
  '😂', '😎', '🔥', '🎉', '😡', '👏',
  'GG', 'Nice!', 'Wow!', 'Oops!', 'Good Luck!'
];

export default function ChatDrawer({
  isOpen,
  onClose,
  messages = [],
  onSendMessage,
  onSendSticker,
  onSendAudio
}) {
  const [inputText, setInputText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendText = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sound.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleStickerClick = (sticker) => {
    sound.playClick();
    onSendSticker(sticker);
    setShowStickers(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md md:max-w-lg bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] h-[520px] animate-slide-up">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Game Chat & Voice
            </h3>
          </div>
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No messages yet. Say hello or send a sticker!
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-blue-400">
                    {msg.username}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.type === 'sticker' && (
                  <div className="inline-block self-start bg-slate-800 px-3 py-1.5 rounded-2xl text-2xl border border-slate-700">
                    {msg.content}
                  </div>
                )}

                {msg.type === 'text' && (
                  <div className="inline-block self-start bg-slate-800/90 text-slate-100 text-xs px-3 py-2 rounded-2xl rounded-tl-sm border border-slate-700/80 max-w-[85%]">
                    {msg.content}
                  </div>
                )}

                {msg.type === 'audio' && (
                  <div className="inline-block self-start bg-blue-900/40 border border-blue-500/40 px-3 py-2 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-blue-400" />
                      <audio controls src={msg.audioData} className="h-7 max-w-[200px]" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Reaction Stickers Drawer */}
        {showStickers && (
          <div className="p-2 bg-slate-950 border-t border-slate-800 grid grid-cols-6 gap-2">
            {STICKERS.map((stk, idx) => (
              <button
                key={idx}
                onClick={() => handleStickerClick(stk)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-sm md:text-base font-bold text-white active:scale-90 transition-transform"
              >
                {stk}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Input Area */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex flex-col gap-2">
          <AudioMessage onSendAudio={onSendAudio} />

          <form onSubmit={handleSendText} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStickers(!showStickers)}
              className={`p-2 rounded-xl border transition-colors ${
                showStickers ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Sparkles, Smile, MessageCircle } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export const STICKER_PACKS = [
  {
    id: 'reactions',
    name: 'Animated Reactions',
    stickers: [
      { emoji: '😂', label: 'Laugh' },
      { emoji: '🤣', label: 'ROFL' },
      { emoji: '😎', label: 'Cool' },
      { emoji: '🥳', label: 'Party' },
      { emoji: '🔥', label: 'Fire' },
      { emoji: '😡', label: 'Angry' },
      { emoji: '😱', label: 'Shock' },
      { emoji: '😭', label: 'Cry' },
      { emoji: '😈', label: 'Evil' },
      { emoji: '🤫', label: 'Quiet' },
      { emoji: '💀', label: 'Dead' },
      { emoji: '🤩', label: 'Star' }
    ]
  },
  {
    id: 'ludo',
    name: 'Ludo Energy',
    stickers: [
      { emoji: '👑', label: 'King' },
      { emoji: '🎯', label: 'Target' },
      { emoji: '🎲', label: 'Lucky 6' },
      { emoji: '🏆', label: 'Trophy' },
      { emoji: '💣', label: 'Boom' },
      { emoji: '💥', label: 'Capture' },
      { emoji: '🍀', label: 'Luck' },
      { emoji: '⚡', label: 'Fast' },
      { emoji: '🍿', label: 'Popcorn' },
      { emoji: '🛡️', label: 'Safe Zone' },
      { emoji: '🚀', label: 'Sprint' },
      { emoji: '🪔', label: 'Victory' }
    ]
  },
  {
    id: 'phrases',
    name: 'Quick Battle Phrases',
    stickers: [
      { text: 'GG! 👑', isChip: true },
      { text: 'Nice Move! 🎯', isChip: true },
      { text: 'Oops! 😅', isChip: true },
      { text: 'So Close! 🤏', isChip: true },
      { text: 'Roll a 6! 🎲', isChip: true },
      { text: 'Good Luck! 🍀', isChip: true },
      { text: 'Bye Bye! 👋', isChip: true },
      { text: 'Thanks! 🙏', isChip: true }
    ]
  }
];

export default function StickerPickerModal({ isOpen, onClose, onSelectSticker }) {
  const [activeTab, setActiveTab] = useState('reactions');
  const [tappingIndex, setTappingIndex] = useState(null);

  if (!isOpen) return null;

  const handleStickerTap = (stickerContent, idx) => {
    sound.playClick();
    triggerHaptic('medium');
    setTappingIndex(idx);

    setTimeout(() => {
      onSelectSticker(stickerContent);
      setTappingIndex(null);
      onClose();
    }, 280);
  };

  const currentPack = STICKER_PACKS.find(p => p.id === activeTab) || STICKER_PACKS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[500px] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
              Sticker Reactions
            </h3>
          </div>
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800 border border-slate-700 active:scale-90 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950 border-b border-slate-800 text-[11px] font-black">
          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveTab('reactions'); }}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'reactions'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
          </button>

          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveTab('ludo'); }}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ludo'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ludo</span>
          </button>

          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveTab('phrases'); }}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'phrases'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Phrases</span>
          </button>
        </div>

        {/* Sticker Grid Panel */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 no-scrollbar">
          {activeTab === 'phrases' ? (
            <div className="grid grid-cols-2 gap-2">
              {currentPack.stickers.map((item, idx) => {
                const isTapping = tappingIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleStickerTap(item.text, idx)}
                    className={`p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-left text-xs font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-between ${
                      isTapping ? 'animate-sticker-tap bg-blue-600 border-blue-400' : ''
                    }`}
                  >
                    <span>{item.text}</span>
                    <span className="text-sm">💬</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3 place-items-center">
              {currentPack.stickers.map((item, idx) => {
                const isTapping = tappingIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleStickerTap(item.emoji, idx)}
                    className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/70 flex flex-col items-center justify-center shadow-lg transition-transform cursor-pointer relative group ${
                      isTapping ? 'animate-sticker-tap ring-4 ring-amber-400 bg-slate-700' : 'hover:scale-105 active:scale-90'
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl filter drop-shadow-md transition-transform group-hover:scale-110">
                      {item.emoji}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 mt-1 truncate max-w-[90%]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/80 text-center text-[10px] text-slate-500">
          Tap any sticker to broadcast an animated reaction above the board!
        </div>
      </div>
    </div>
  );
}

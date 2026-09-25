import React, { useState } from 'react';
import { X, Sparkles, Smile, MessageCircle } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export const STICKER_PACKS = [
  {
    id: 'animated_emojis',
    name: 'Animated Emojis',
    stickers: [
      { id: 'emoji-1', image: '/emojis/emoji-1.png', label: 'Grin Laugh 😆', anim: 'animate-emoji-wobble' },
      { id: 'emoji-2', image: '/emojis/emoji-2.png', label: 'Angry Rage 😡', anim: 'animate-emoji-shake' },
      { id: 'emoji-3', image: '/emojis/emoji-3.png', label: 'Bored Roll 🙄', anim: 'animate-emoji-bounce' },
      { id: 'emoji-4', image: '/emojis/emoji-4.png', label: 'Crying Tears 😭', anim: 'animate-emoji-shake' },
      { id: 'emoji-5', image: '/emojis/emoji-5.png', label: 'Nervous Teeth 😬', anim: 'animate-emoji-shake' },
      { id: 'emoji-6', image: '/emojis/emoji-6.png', label: 'Sweat Wipe 😰', anim: 'animate-emoji-wobble' },
      { id: 'emoji-7', image: '/emojis/emoji-7.png', label: 'Yawn Sleepy 🥱', anim: 'animate-emoji-bounce' },
      { id: 'emoji-8', image: '/emojis/emoji-8.png', label: 'Wink Tongue 😜', anim: 'animate-emoji-wobble' },
      { id: 'emoji-9', image: '/emojis/emoji-9.png', label: 'Budo King 👑', anim: 'animate-emoji-bounce' },
      { id: 'emoji-10', image: '/emojis/emoji-10.png', label: 'Cool Dice 😎', anim: 'animate-emoji-pulse' },
      { id: 'emoji-11', image: '/emojis/emoji-11.png', label: 'Heart Eyes 😍', anim: 'animate-emoji-pulse' },
      { id: 'emoji-12', image: '/emojis/emoji-12.png', label: 'Puddle Cry 😢', anim: 'animate-emoji-shake' },
      { id: 'emoji-13', image: '/emojis/emoji-13.png', label: 'Rose Love 🌹', anim: 'animate-sticker-rose' }
    ]
  },
  {
    id: '3d_stickers',
    name: '3D Stickers',
    stickers: [
      { id: 'rose_love', image: '/stickers/rose_love.png', label: 'Rose Love 🌹', anim: 'animate-sticker-rose' },
      { id: 'flex_beard', image: '/stickers/flex_beard.png', label: 'Flex Power 💪', anim: 'animate-sticker-flex' },
      { id: 'king_crown', image: '/stickers/king_crown.png', label: 'King Crown 👑', anim: 'animate-sticker-crown' },
      { id: 'hurry_watch', image: '/stickers/hurry_watch.png', label: 'Hurry Up! ⏱️', anim: 'animate-sticker-hurry' },
      { id: 'rofl_shoes', image: '/stickers/rofl_shoes.png', label: 'ROFL Laugh 😂', anim: 'animate-sticker-rofl' },
      { id: 'tea_sip', image: '/stickers/tea_sip.png', label: 'Tea Time ☕', anim: 'animate-sticker-tea' }
    ]
  },
  {
    id: 'reactions',
    name: 'Emojis',
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
    name: 'Ludo Pack',
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
    name: 'Battle Phrases',
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
  const [activeTab, setActiveTab] = useState('animated_emojis');
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
        className="w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[520px] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎭</span>
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
              Animated Emojis & 3D Stickers
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
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-950 border-b border-slate-800 text-[10px] sm:text-[11px] font-black">
          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveTab('animated_emojis'); }}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'animated_emojis'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smile className="w-3 h-3" />
            <span>12 Emojis</span>
          </button>

          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveTab('3d_stickers'); }}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === '3d_stickers'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>3D GIF</span>
          </button>

          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveTab('reactions'); }}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'reactions'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>😀</span>
            <span>Icons</span>
          </button>

          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveTab('phrases'); }}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'phrases'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            <span>Phrases</span>
          </button>
        </div>

        {/* Sticker Grid Panel */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 no-scrollbar">
          {activeTab === 'animated_emojis' || activeTab === '3d_stickers' ? (
            <div className="grid grid-cols-3 gap-3 place-items-center">
              {currentPack.stickers.map((item, idx) => {
                const isTapping = tappingIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleStickerTap(item.image, idx)}
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 hover:from-slate-700 hover:to-slate-800 border border-slate-700/80 p-2 flex flex-col items-center justify-center shadow-xl transition-all cursor-pointer relative group ${
                      isTapping ? 'animate-sticker-tap ring-4 ring-amber-400 bg-slate-700' : 'hover:scale-105 active:scale-95'
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={item.label}
                      loading="lazy"
                      className={`w-14 h-14 sm:w-16 sm:h-16 object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] ${item.anim}`}
                    />
                    <span className="text-[9px] sm:text-[10px] font-black text-amber-300 mt-1 truncate max-w-[95%]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : activeTab === 'phrases' ? (
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

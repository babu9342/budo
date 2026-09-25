import React, { useState, useEffect } from 'react';

/**
 * 12 Sprite Sheet Emojis Metadata & Animation mappings
 */
export const EMOJI_METADATA = {
  1:  { id: 1,  name: 'Grin Laugh',       image: '/emojis/emoji-1.png',  anim: 'animate-emoji-wobble', emoji: '😆', desc: 'Big Laugh' },
  2:  { id: 2,  name: 'Angry Rage',       image: '/emojis/emoji-2.png',  anim: 'animate-emoji-shake',  emoji: '😡', desc: 'Rage / Furious' },
  3:  { id: 3,  name: 'Bored Rolling',    image: '/emojis/emoji-3.png',  anim: 'animate-emoji-bounce', emoji: '🙄', desc: 'Eye Roll / Bored' },
  4:  { id: 4,  name: 'Crying Tears',     image: '/emojis/emoji-4.png',  anim: 'animate-emoji-shake',  emoji: '😭', desc: 'Crying Rivers' },
  5:  { id: 5,  name: 'Nervous Biting',   image: '/emojis/emoji-5.png',  anim: 'animate-emoji-shake',  emoji: '😬', desc: 'Nervous / Anxious' },
  6:  { id: 6,  name: 'Sweat Wipe',       image: '/emojis/emoji-6.png',  anim: 'animate-emoji-wobble', emoji: '😰', desc: 'Phew / Relieved' },
  7:  { id: 7,  name: 'Yawn Sleepy',      image: '/emojis/emoji-7.png',  anim: 'animate-emoji-bounce', emoji: '🥱', desc: 'Sleepy Yawn' },
  8:  { id: 8,  name: 'Wink Tongue',      image: '/emojis/emoji-8.png',  anim: 'animate-emoji-wobble', emoji: '😜', desc: 'Playful Wink' },
  9:  { id: 9,  name: 'Dice Budo King',   image: '/emojis/emoji-9.png',  anim: 'animate-emoji-bounce', emoji: '👑', desc: 'Budo King' },
  10: { id: 10, name: 'Cool Sunglasses',  image: '/emojis/emoji-10.png', anim: 'animate-emoji-pulse',  emoji: '😎', desc: 'Thug Life / Pro' },
  11: { id: 11, name: 'Dice Heart Eyes',  image: '/emojis/emoji-11.png', anim: 'animate-emoji-pulse',  emoji: '😍', desc: 'In Love / GG' },
  12: { id: 12, name: 'Dice Puddle Cry',  image: '/emojis/emoji-12.png', anim: 'animate-emoji-shake',  emoji: '😢', desc: 'Lost / Sad Puddle' },
  13: { id: 13, name: 'Rose Love',        image: '/emojis/emoji-13.png', anim: 'animate-sticker-rose', emoji: '🌹', desc: 'Rose Flower Love' }
};

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32'
};

/**
 * Reusable <EmojiReaction emojiId={1-12} /> Component
 * Handles auto pop-in, looping wobble/bounce/shake, and exit fade-out.
 */
export default function EmojiReaction({
  emojiId = 1,
  size = 'lg',
  animation = 'auto',
  duration = 2500,
  autoFade = true,
  onComplete,
  className = '',
  onClick
}) {
  const [phase, setPhase] = useState('enter'); // 'enter' | 'active' | 'exit'

  const numericId = typeof emojiId === 'number'
    ? emojiId
    : parseInt(String(emojiId).replace(/[^0-9]/g, ''), 10) || 1;

  const meta = EMOJI_METADATA[numericId] || EMOJI_METADATA[1];

  useEffect(() => {
    if (!autoFade) return;

    // Phase 1: Pop-In (0-350ms)
    const enterTimer = setTimeout(() => {
      setPhase('active');
    }, 350);

    // Phase 2: Exit (duration - 400ms)
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, Math.max(500, duration - 400));

    // Phase 3: Complete
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [numericId, duration, autoFade, onComplete]);

  // Determine animation classes
  let animClass = '';
  if (phase === 'enter') {
    animClass = 'animate-emoji-pop-in';
  } else if (phase === 'exit') {
    animClass = 'animate-emoji-fade-out';
  } else {
    if (animation === 'auto') {
      animClass = meta.anim;
    } else if (animation === 'bounce') {
      animClass = 'animate-emoji-bounce';
    } else if (animation === 'wobble') {
      animClass = 'animate-emoji-wobble';
    } else if (animation === 'shake') {
      animClass = 'animate-emoji-shake';
    } else if (animation === 'pulse') {
      animClass = 'animate-emoji-pulse';
    }
  }

  const sizeClass = SIZE_MAP[size] || (typeof size === 'string' && size.includes('w-') ? size : 'w-16 h-16');

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center select-none filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] ${sizeClass} ${animClass} ${className}`}
      title={meta.name}
    >
      <img
        src={meta.image}
        alt={meta.name}
        loading="eager"
        decoding="async"
        className="w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}

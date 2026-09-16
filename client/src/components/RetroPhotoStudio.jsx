import React, { useState, useRef, useEffect } from 'react';
import { Camera, Sparkles, RefreshCw, Check, X, Sliders, Image as ImageIcon } from 'lucide-react';
import { sound } from '../utils/soundEngine';

const RETRO_STYLES = [
  {
    id: 'classic',
    name: 'Classic 90s Portrait',
    desc: 'Soft warm golden tones with classic 90s film portrait glow.',
    filters: { contrast: 1.15, saturate: 0.9, sepia: 0.25, grain: 0.25, vignette: 0.3, hue: -5 }
  },
  {
    id: 'college',
    name: '90s College Style',
    desc: 'Nostalgic 90s yearbook color palette with crisp nostalgia.',
    filters: { contrast: 1.1, saturate: 1.0, sepia: 0.15, grain: 0.35, vignette: 0.4, hue: 0 }
  },
  {
    id: 'film',
    name: '90s Film Camera',
    desc: 'Authentic 35mm disposable camera look with punchy red/green saturation.',
    filters: { contrast: 1.3, saturate: 1.2, sepia: 0.2, grain: 0.45, vignette: 0.45, hue: -8 }
  },
  {
    id: 'street',
    name: '90s Street Style',
    desc: 'Urban vintage look with rich shadows and gritty grain.',
    filters: { contrast: 1.35, saturate: 0.8, sepia: 0.3, grain: 0.4, vignette: 0.5, hue: 5 }
  },
  {
    id: 'studio',
    name: '90s Studio Portrait',
    desc: 'Glamour studio soft focus with hazy dream lighting.',
    filters: { contrast: 0.95, saturate: 0.9, sepia: 0.2, grain: 0.2, vignette: 0.25, hue: -3 }
  },
  {
    id: 'family',
    name: '90s Family Photo',
    desc: 'Comforting home album aesthetic with subtle faded sepia warmth.',
    filters: { contrast: 1.1, saturate: 1.05, sepia: 0.35, grain: 0.3, vignette: 0.35, hue: -6 }
  }
];

export default function RetroPhotoStudio({ currentAvatar, onApplyPhoto, onCancel }) {
  const [selectedStyle, setSelectedStyle] = useState(RETRO_STYLES[0]);
  const [imageSrc, setImageSrc] = useState(currentAvatar || '/avatars/default.png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [grainIntensity, setGrainIntensity] = useState(selectedStyle.filters.grain);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setGrainIntensity(selectedStyle.filters.grain);
    applyRetroFilters();
  }, [selectedStyle, imageSrc]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      sound.playClick();
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyRetroFilters = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    setIsProcessing(true);

    img.onload = () => {
      const size = 320;
      canvas.width = size;
      canvas.height = size;

      // 1. Draw scaled image preserving center crop
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      // Apply CSS style filters to canvas context
      const f = selectedStyle.filters;
      ctx.filter = `contrast(${f.contrast}) saturate(${f.saturate}) sepia(${f.sepia}) hue-rotate(${f.hue}deg)`;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      ctx.filter = 'none';

      // 2. Film Grain Overlay
      const imgData = ctx.getImageData(0, 0, size, size);
      const pixels = imgData.data;
      const grainFactor = grainIntensity * 45;

      for (let i = 0; i < pixels.length; i += 4) {
        const noise = (Math.random() - 0.5) * grainFactor;
        pixels[i] = Math.min(255, Math.max(0, pixels[i] + noise));
        pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + noise));
        pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);

      // 3. Vintage Vignette Gradient
      const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(20, 10, 5, ${f.vignette})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // 4. Authentic 90s Amber Timestamp ('97 OCT 14)
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#FF9900';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText("'96 09 16", size - 90, size - 16);

      setIsProcessing(false);
    };

    img.onerror = () => {
      setIsProcessing(false);
    };
  };

  const handleUsePhoto = () => {
    sound.playVictory();
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      onApplyPhoto(dataUrl);
    }
  };

  return (
    <div className="flex flex-col items-center bg-slate-900 border border-slate-700 rounded-3xl p-4 md:p-6 max-w-md w-full shadow-2xl space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs font-bold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>90s Vintage Photo Studio</span>
        </div>
        <h2 className="text-lg md:text-xl font-black text-white">
          Create 90s Retro Avatar
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Authentic vintage film grain, warm nostalgic grading & retro timestamp.
        </p>
      </div>

      {/* Canvas Photo Preview */}
      <div className="relative group">
        <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-amber-500/40 shadow-2xl bg-black flex items-center justify-center relative">
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Change / Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-2 right-2 bg-slate-900/90 hover:bg-slate-800 text-white p-2.5 rounded-full border border-slate-600 shadow-lg active:scale-95 transition-transform"
          title="Upload Custom Photo"
        >
          <Camera className="w-4 h-4 text-amber-400" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Style Preset Selector */}
      <div className="w-full space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Choose 90s Style</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          {RETRO_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => { sound.playClick(); setSelectedStyle(style); }}
              className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                selectedStyle.id === style.id
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold truncate">{style.name}</div>
              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 w-full pt-2">
        <button
          onClick={handleUsePhoto}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          <Check className="w-4 h-4" />
          <span>Use This Photo</span>
        </button>

        <button
          onClick={() => { sound.playClick(); applyRetroFilters(); }}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Regenerate</span>
        </button>
      </div>

      <button
        onClick={onCancel}
        className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

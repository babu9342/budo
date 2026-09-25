import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { sound } from '../utils/soundEngine';

export default function BackButton({ fallback = '/home', className = '', label = null }) {
  const navigate = useNavigate();

  const handleBack = (e) => {
    e?.stopPropagation();
    sound.playClick();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 active:scale-90 transition-all flex items-center justify-center gap-1.5 shadow-sm ${className}`}
      title="Go Back"
      aria-label="Go Back"
    >
      <ArrowLeft className="w-4 h-4" />
      {label && <span className="text-xs font-bold">{label}</span>}
    </button>
  );
}

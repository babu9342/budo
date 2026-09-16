import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Send, Trash2 } from 'lucide-react';
import { sound } from '../utils/soundEngine';

export default function AudioMessage({ onSendAudio }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);

  const startRecording = async () => {
    try {
      sound.playClick();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 20) { // 20s max duration limit
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err.message);
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (!audioBlob) return;
    sound.playClick();
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      onSendAudio(reader.result, recordSeconds);
      handleDiscard();
    };
  };

  const handleDiscard = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordSeconds(0);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
      {!audioUrl && !recording && (
        <button
          onClick={startRecording}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/30 text-blue-400 hover:bg-blue-600/40 rounded-lg text-xs font-semibold transition-all active:scale-95"
        >
          <Mic className="w-4 h-4" />
          <span>Hold to Record</span>
        </button>
      )}

      {recording && (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-xs font-mono text-red-400 font-bold">
              0:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds} / 0:20
            </span>
          </div>

          <button
            onClick={stopRecording}
            type="button"
            className="p-1.5 bg-red-600 text-white rounded-lg active:scale-90 transition-transform"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      )}

      {audioUrl && !recording && (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayback}
              type="button"
              className="p-1.5 bg-slate-800 text-blue-400 rounded-lg active:scale-90"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <span className="text-xs font-mono text-slate-300">
              Voice Note ({recordSeconds}s)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDiscard}
              type="button"
              className="p-1.5 text-slate-400 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              type="button"
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { createSlice } from '@reduxjs/toolkit';
import { sound } from '../utils/soundEngine';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    sound: localStorage.getItem('budo_sound') !== 'false',
    music: localStorage.getItem('budo_music') === 'true',
    vibration: localStorage.getItem('budo_vibration') !== 'false',
    theme: 'dark'
  },
  reducers: {
    toggleSound: (state) => {
      state.sound = !state.sound;
      localStorage.setItem('budo_sound', state.sound);
      sound.setSoundEnabled(state.sound);
    },
    toggleMusic: (state) => {
      state.music = !state.music;
      localStorage.setItem('budo_music', state.music);
      sound.setMusicEnabled(state.music);
    },
    toggleVibration: (state) => {
      state.vibration = !state.vibration;
      localStorage.setItem('budo_vibration', state.vibration);
    }
  }
});

export const { toggleSound, toggleMusic, toggleVibration } = settingsSlice.actions;
export default settingsSlice.reducer;

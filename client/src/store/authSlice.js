import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

function createInitialGuestUser() {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return {
    id: 'guest_' + Math.random().toString(36).substring(2, 9),
    username: 'Player_' + randNum,
    avatar_url: '/avatars/default.png',
    ranking_points: 1000,
    games_played: 0,
    wins: 0,
    captures: 0,
    isGuest: true
  };
}

let storedUser = null;
try {
  const item = sessionStorage.getItem('budo_user') || localStorage.getItem('budo_guest_user');
  if (item && item !== 'undefined' && item !== 'null') {
    storedUser = JSON.parse(item);
  }
} catch (e) {
  console.warn('Failed to parse budo_user:', e);
}

if (!storedUser) {
  storedUser = createInitialGuestUser();
  try {
    sessionStorage.setItem('budo_user', JSON.stringify(storedUser));
    localStorage.setItem('budo_guest_user', JSON.stringify(storedUser));
    sessionStorage.setItem('budo_token', storedUser.id);
  } catch (e) {}
}

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async () => {
  return storedUser;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    token: sessionStorage.getItem('budo_token') || storedUser.id,
    loading: false,
    error: null
  },
  reducers: {
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token || state.user?.id;
      state.error = null;
      sessionStorage.setItem('budo_token', state.token);
      sessionStorage.setItem('budo_user', JSON.stringify(state.user));
      localStorage.setItem('budo_guest_user', JSON.stringify(state.user));
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      sessionStorage.setItem('budo_user', JSON.stringify(state.user));
      localStorage.setItem('budo_guest_user', JSON.stringify(state.user));
    },
    logout: (state) => {
      const newGuest = createInitialGuestUser();
      state.user = newGuest;
      state.token = newGuest.id;
      state.error = null;
      sessionStorage.setItem('budo_token', newGuest.id);
      sessionStorage.setItem('budo_user', JSON.stringify(newGuest));
      localStorage.setItem('budo_guest_user', JSON.stringify(newGuest));
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = { ...state.user, ...action.payload };
        }
      });
  }
});

export const { setAuth, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;

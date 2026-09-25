import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../services/api';

// Clear legacy persistent localStorage tokens if any exist
try {
  localStorage.removeItem('budo_token');
  localStorage.removeItem('budo_user');
} catch (e) {}

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const token = sessionStorage.getItem('budo_token');
    if (!token) return null;
    const res = await api.get('/auth/me');
    return res.data.user;
  } catch (err) {
    sessionStorage.removeItem('budo_token');
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user');
  }
});

let storedUser = null;
try {
  const item = sessionStorage.getItem('budo_user');
  if (item && item !== 'undefined' && item !== 'null') {
    storedUser = JSON.parse(item);
  }
} catch (e) {
  console.warn('Failed to parse budo_user from sessionStorage:', e);
  sessionStorage.removeItem('budo_user');
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    token: sessionStorage.getItem('budo_token') || null,
    loading: false,
    error: null
  },
  reducers: {
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      sessionStorage.setItem('budo_token', action.payload.token);
      sessionStorage.setItem('budo_user', JSON.stringify(action.payload.user));
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      sessionStorage.setItem('budo_user', JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      sessionStorage.removeItem('budo_token');
      sessionStorage.removeItem('budo_user');
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.user = action.payload;
          sessionStorage.setItem('budo_user', JSON.stringify(action.payload));
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        sessionStorage.removeItem('budo_token');
        sessionStorage.removeItem('budo_user');
      });
  }
});

export const { setAuth, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;

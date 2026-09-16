import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../services/api';

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('budo_token');
    if (!token) return null;
    const res = await api.get('/auth/me');
    return res.data.user;
  } catch (err) {
    localStorage.removeItem('budo_token');
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user');
  }
});

const storedUser = localStorage.getItem('budo_user') ? JSON.parse(localStorage.getItem('budo_user')) : null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    token: localStorage.getItem('budo_token') || null,
    loading: false,
    error: null
  },
  reducers: {
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      localStorage.setItem('budo_token', action.payload.token);
      localStorage.setItem('budo_user', JSON.stringify(action.payload.user));
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('budo_user', JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('budo_token');
      localStorage.removeItem('budo_user');
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
          localStorage.setItem('budo_user', JSON.stringify(action.payload));
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
      });
  }
});

export const { setAuth, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;

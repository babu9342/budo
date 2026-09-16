import { createSlice } from '@reduxjs/toolkit';

const roomSlice = createSlice({
  name: 'room',
  initialState: {
    currentRoom: null,
    lobbyPlayers: [],
    isHost: false,
    loading: false,
    error: null
  },
  reducers: {
    setRoom: (state, action) => {
      state.currentRoom = action.payload.room;
      state.isHost = action.payload.isHost || false;
      state.error = null;
    },
    updateLobby: (state, action) => {
      state.lobbyPlayers = action.payload.players || [];
      if (action.payload.hostId && state.currentRoom) {
        state.currentRoom.host_id = action.payload.hostId;
      }
    },
    clearRoom: (state) => {
      state.currentRoom = null;
      state.lobbyPlayers = [];
      state.isHost = false;
      state.error = null;
    },
    setRoomError: (state, action) => {
      state.error = action.payload;
    }
  }
});

export const { setRoom, updateLobby, clearRoom, setRoomError } = roomSlice.actions;
export default roomSlice.reducer;

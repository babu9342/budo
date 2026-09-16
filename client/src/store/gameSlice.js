import { createSlice } from '@reduxjs/toolkit';

const gameSlice = createSlice({
  name: 'game',
  initialState: {
    gameState: null,
    isOffline: false,
    diceRolling: false,
    selectedTokenId: null,
    validTokens: [],
    recentCaptures: [],
    winner: null,
    rankings: []
  },
  reducers: {
    setGameState: (state, action) => {
      state.gameState = action.payload;
      if (action.payload?.validMoves) {
        state.validTokens = action.payload.validMoves;
      }
      if (action.payload?.winner) {
        state.winner = action.payload.winner;
        state.rankings = action.payload.rankingsList || [];
      }
    },
    setDiceRolling: (state, action) => {
      state.diceRolling = action.payload;
    },
    setValidTokens: (state, action) => {
      state.validTokens = action.payload;
    },
    setSelectedToken: (state, action) => {
      state.selectedTokenId = action.payload;
    },
    setIsOffline: (state, action) => {
      state.isOffline = action.payload;
    },
    resetGame: (state) => {
      state.gameState = null;
      state.diceRolling = false;
      state.selectedTokenId = null;
      state.validTokens = [];
      state.recentCaptures = [];
      state.winner = null;
      state.rankings = [];
    }
  }
});

export const {
  setGameState,
  setDiceRolling,
  setValidTokens,
  setSelectedToken,
  setIsOffline,
  resetGame
} = gameSlice.actions;

export default gameSlice.reducer;

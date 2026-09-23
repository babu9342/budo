export const PLAYER_COLORS_4 = [
  { id: 0, key: 'red', name: 'Red', hex: '#EF4444', lightHex: '#FCA5A5', startOffset: 0 },
  { id: 1, key: 'green', name: 'Green', hex: '#10B981', lightHex: '#6EE7B7', startOffset: 13 },
  { id: 2, key: 'yellow', name: 'Yellow', hex: '#F59E0B', lightHex: '#FCD34D', startOffset: 26 },
  { id: 3, key: 'blue', name: 'Blue', hex: '#3B82F6', lightHex: '#93C5FD', startOffset: 39 }
];

export const PLAYER_COLORS_2 = [
  { id: 0, key: 'red', name: 'Red', hex: '#EF4444', lightHex: '#FCA5A5', startOffset: 0 },
  { id: 1, key: 'yellow', name: 'Yellow', hex: '#F59E0B', lightHex: '#FCD34D', startOffset: 26 }
];

export const PLAYER_COLORS_3 = [
  { id: 0, key: 'red', name: 'Red', hex: '#EF4444', lightHex: '#FCA5A5', startOffset: 0 },
  { id: 1, key: 'yellow', name: 'Yellow', hex: '#F59E0B', lightHex: '#FCD34D', startOffset: 26 }, // Opposite to Red
  { id: 2, key: 'green', name: 'Green', hex: '#10B981', lightHex: '#6EE7B7', startOffset: 13 }
];

export const PLAYER_COLORS_6 = [
  { id: 0, key: 'red', name: 'Red', hex: '#EF4444', lightHex: '#FCA5A5', startOffset: 0 },
  { id: 1, key: 'orange', name: 'Orange', hex: '#F97316', lightHex: '#FDBA74', startOffset: 14 },
  { id: 2, key: 'yellow', name: 'Yellow', hex: '#F59E0B', lightHex: '#FCD34D', startOffset: 28 },
  { id: 3, key: 'green', name: 'Green', hex: '#10B981', lightHex: '#6EE7B7', startOffset: 42 },
  { id: 4, key: 'cyan', name: 'Cyan', hex: '#06B6D4', lightHex: '#67E8F9', startOffset: 56 },
  { id: 5, key: 'purple', name: 'Purple', hex: '#8B5CF6', lightHex: '#C4B5FD', startOffset: 70 }
];

export const PLAYER_COLORS_8 = [
  { id: 0, key: 'red', name: 'Red', hex: '#EF4444', lightHex: '#FCA5A5', startOffset: 0 },
  { id: 1, key: 'orange', name: 'Orange', hex: '#F97316', lightHex: '#FDBA74', startOffset: 12 },
  { id: 2, key: 'yellow', name: 'Yellow', hex: '#F59E0B', lightHex: '#FCD34D', startOffset: 24 },
  { id: 3, key: 'lime', name: 'Lime', hex: '#84CC16', lightHex: '#BEF264', startOffset: 36 },
  { id: 4, key: 'green', name: 'Green', hex: '#10B981', lightHex: '#6EE7B7', startOffset: 48 },
  { id: 5, key: 'cyan', name: 'Cyan', hex: '#06B6D4', lightHex: '#67E8F9', startOffset: 60 },
  { id: 6, key: 'blue', name: 'Blue', hex: '#3B82F6', lightHex: '#93C5FD', startOffset: 72 },
  { id: 7, key: 'purple', name: 'Purple', hex: '#8B5CF6', lightHex: '#C4B5FD', startOffset: 84 }
];

export const BOARD_CONFIGS = {
  2: {
    maxPlayers: 2,
    colors: PLAYER_COLORS_2,
    trackLength: 52,
    homeStretchLength: 6,
    totalStepsToFinish: 57,
    safeTrackIndices: [0, 8, 13, 21, 26, 34, 39, 47]
  },
  3: {
    maxPlayers: 3,
    colors: PLAYER_COLORS_3,
    trackLength: 52,
    homeStretchLength: 6,
    totalStepsToFinish: 57,
    safeTrackIndices: [0, 8, 13, 21, 26, 34, 39, 47]
  },
  4: {
    maxPlayers: 4,
    colors: PLAYER_COLORS_4,
    trackLength: 52,
    homeStretchLength: 6,
    totalStepsToFinish: 57,
    safeTrackIndices: [0, 8, 13, 21, 26, 34, 39, 47]
  },
  6: {
    maxPlayers: 6,
    colors: PLAYER_COLORS_6,
    trackLength: 84,
    homeStretchLength: 6,
    totalStepsToFinish: 89,
    safeTrackIndices: [0, 8, 14, 22, 28, 36, 42, 50, 56, 64, 70, 78]
  },
  8: {
    maxPlayers: 8,
    colors: PLAYER_COLORS_8,
    trackLength: 96,
    homeStretchLength: 6,
    totalStepsToFinish: 101,
    safeTrackIndices: [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90]
  }
};

export function getBoardConfig(playerCount = 4) {
  if (playerCount <= 2) return BOARD_CONFIGS[2];
  if (playerCount === 3) return BOARD_CONFIGS[3];
  if (playerCount <= 4) return BOARD_CONFIGS[4];
  if (playerCount <= 6) return BOARD_CONFIGS[6];
  return BOARD_CONFIGS[8];
}

/**
 * Calculates the CSS rotation degrees so that the specified player's home yard
 * is oriented at the bottom-left of their view.
 * 
 * In standard 4-player board layout:
 * - Red is top-left     -> rotate 270deg brings Red to bottom-left
 * - Green is top-right   -> rotate 180deg brings Green to bottom-left
 * - Yellow is bottom-right -> rotate 90deg brings Yellow to bottom-left
 * - Blue is bottom-left  -> rotate 0deg keeps Blue at bottom-left
 */
export function getBoardRotation(myPlayerIndex, players) {
  if (myPlayerIndex === null || myPlayerIndex === undefined || !players || !players[myPlayerIndex]) {
    return 0;
  }
  const colorKey = players[myPlayerIndex]?.color?.key;
  const ROTATION_MAP = {
    blue: 0,
    yellow: 90,
    green: 180,
    red: 270
  };
  return ROTATION_MAP[colorKey] ?? 0;
}


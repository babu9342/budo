import { getBoardConfig } from './board.js';

export const TOKEN_STATE = {
  HOME: -1,
  ACTIVE: 'ACTIVE',
  SAFE: 'SAFE',
  FINISHED: 'FINISHED'
};

/**
 * Validates whether a token can move given the dice value.
 * @param {number} currentStep - Relative step of the token (-1 for HOME, 0..totalStepsToFinish)
 * @param {number} diceValue - 1..6
 * @param {object} config - Board config from getBoardConfig
 * @returns {boolean}
 */
export function canTokenMove(currentStep, diceValue, config) {
  // If in HOME, must roll a 6 to enter the track (step 0)
  if (currentStep === -1) {
    return diceValue === 6;
  }

  // If already finished, cannot move
  if (currentStep >= config.totalStepsToFinish) {
    return false;
  }

  // Calculate new step
  const newStep = currentStep + diceValue;

  // Cannot overshoot the finish line
  return newStep <= config.totalStepsToFinish;
}

/**
 * Calculates global track index for a token
 * @param {number} playerIndex - 0..maxPlayers-1
 * @param {number} relativeStep - 0..totalStepsToFinish
 * @param {object} config - Board config
 * @returns {number|string} Global track cell index or 'HOME_STRETCH_X' or 'FINISH'
 */
export function getGlobalPosition(playerIndex, relativeStep, config) {
  if (relativeStep === -1) return `HOME_BASE_${playerIndex}`;
  if (relativeStep >= config.totalStepsToFinish) return 'FINISH';

  // If inside home stretch
  const mainTrackLimit = config.trackLength - 1;
  if (relativeStep > mainTrackLimit) {
    const homeStretchIndex = relativeStep - config.trackLength;
    return `HOME_STRETCH_${playerIndex}_${homeStretchIndex}`;
  }

  // Main circular track
  const playerColor = config.colors[playerIndex];
  const globalTrackIdx = (playerColor.startOffset + relativeStep) % config.trackLength;
  return globalTrackIdx;
}

/**
 * Checks if a global position is a safe zone (cannot be captured).
 * @param {number|string} globalPos 
 * @param {object} config 
 * @returns {boolean}
 */
export function isPositionSafe(globalPos, config) {
  if (typeof globalPos === 'string') {
    // Home bases, home stretches, and finish are always safe
    return true;
  }

  return config.safeTrackIndices.includes(globalPos);
}

/**
 * Evaluates move outcome: captures, finishes, bonus turns
 */
export function evaluateMove(game, playerIndex, tokenId, diceValue) {
  const config = getBoardConfig(game.players.length);
  const player = game.players[playerIndex];
  const currentStep = player.tokens[tokenId];

  if (!canTokenMove(currentStep, diceValue, config)) {
    return { valid: false, reason: 'Invalid move for token' };
  }

  let newStep;
  if (currentStep === -1) {
    newStep = 0; // Brought out to starting point
  } else {
    newStep = currentStep + diceValue;
  }

  const newGlobalPos = getGlobalPosition(playerIndex, newStep, config);
  const isSafe = isPositionSafe(newGlobalPos, config);

  // Check captures
  const captures = [];
  if (!isSafe && typeof newGlobalPos === 'number') {
    for (let pIdx = 0; pIdx < game.players.length; pIdx++) {
      if (pIdx === playerIndex) continue;
      const opponent = game.players[pIdx];

      opponent.tokens.forEach((oppStep, oppTokId) => {
        if (oppStep >= 0 && oppStep < config.totalStepsToFinish) {
          const oppGlobalPos = getGlobalPosition(pIdx, oppStep, config);
          if (oppGlobalPos === newGlobalPos) {
            // Captured opponent token!
            captures.push({
              playerIndex: pIdx,
              tokenId: oppTokId,
              userId: opponent.userId
            });
          }
        }
      });
    }
  }

  const reachedFinish = newStep === config.totalStepsToFinish;
  const isSix = diceValue === 6;
  const hasCaptured = captures.length > 0;

  // Bonus turn granted on: rolling a 6, capturing an opponent, or getting a token to Finish
  const bonusTurn = isSix || hasCaptured || reachedFinish;

  return {
    valid: true,
    newStep,
    newGlobalPos,
    captures,
    reachedFinish,
    bonusTurn
  };
}

/**
 * Checks if a player has won (all 4 tokens finished)
 */
export function hasPlayerFinishedAllTokens(tokens, config) {
  return tokens.every(step => step >= config.totalStepsToFinish);
}

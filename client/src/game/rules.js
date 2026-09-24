import { getBoardConfig } from './board';

export function canTokenMove(currentStep, diceValue, config) {
  if (currentStep === -1) {
    return diceValue === 6;
  }
  if (currentStep >= config.totalStepsToFinish) {
    return false;
  }
  return (currentStep + diceValue) <= config.totalStepsToFinish;
}

export function getGlobalPosition(playerIndex, relativeStep, config) {
  if (relativeStep === -1) return `HOME_BASE_${playerIndex}`;
  if (relativeStep >= config.totalStepsToFinish) return 'FINISH';

  // Main track limit: 51 steps (0..50). Step 51 enters Home Stretch (3rd box from star -> center line).
  const mainTrackSteps = config.trackLength - 1;
  if (relativeStep >= mainTrackSteps) {
    const homeStretchIndex = relativeStep - mainTrackSteps;
    return `HOME_STRETCH_${playerIndex}_${homeStretchIndex}`;
  }

  const playerColor = config.colors[playerIndex];
  return (playerColor.startOffset + relativeStep) % config.trackLength;
}

export function isPositionSafe(globalPos, config) {
  if (typeof globalPos === 'string') return true;
  return config.safeTrackIndices.includes(globalPos);
}

export function evaluateMove(game, playerIndex, tokenId, diceValue) {
  const config = getBoardConfig(game.players.length);
  const player = game.players[playerIndex];
  const currentStep = player.tokens[tokenId];

  if (!canTokenMove(currentStep, diceValue, config)) {
    return { valid: false, reason: 'Invalid move for token' };
  }

  let newStep;
  if (currentStep === -1) {
    newStep = 0;
  } else {
    newStep = currentStep + diceValue;
  }

  const newGlobalPos = getGlobalPosition(playerIndex, newStep, config);
  const isSafe = isPositionSafe(newGlobalPos, config);

  const captures = [];
  if (!isSafe && typeof newGlobalPos === 'number') {
    for (let pIdx = 0; pIdx < game.players.length; pIdx++) {
      if (pIdx === playerIndex) continue;
      const opponent = game.players[pIdx];

      opponent.tokens.forEach((oppStep, oppTokId) => {
        if (oppStep >= 0 && oppStep < config.totalStepsToFinish) {
          const oppGlobalPos = getGlobalPosition(pIdx, oppStep, config);
          if (oppGlobalPos === newGlobalPos) {
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

export function hasPlayerFinishedAllTokens(tokens, config) {
  return tokens.every(step => step >= config.totalStepsToFinish);
}

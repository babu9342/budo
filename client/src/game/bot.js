import { canTokenMove, evaluateMove } from './rules';
import { getBoardConfig } from './board';

export function getBotMove(game, botPlayerIndex, diceValue, difficulty = 'medium') {
  const config = getBoardConfig(game.players.length);
  const botPlayer = game.players[botPlayerIndex];

  const validTokens = [];
  botPlayer.tokens.forEach((step, tokId) => {
    if (canTokenMove(step, diceValue, config)) {
      const outcome = evaluateMove(game, botPlayerIndex, tokId, diceValue);
      if (outcome.valid) {
        validTokens.push({
          tokenId: tokId,
          currentStep: step,
          outcome
        });
      }
    }
  });

  if (validTokens.length === 0) return null;
  if (validTokens.length === 1) return validTokens[0].tokenId;

  if (difficulty === 'easy') {
    return validTokens[Math.floor(Math.random() * validTokens.length)].tokenId;
  }

  let bestTokenId = validTokens[0].tokenId;
  let highestScore = -Infinity;

  validTokens.forEach(candidate => {
    let score = 0;
    const { outcome, currentStep } = candidate;

    if (outcome.captures.length > 0) {
      score += 120 * outcome.captures.length;
    }
    if (outcome.reachedFinish) {
      score += 90;
    }
    if (currentStep === -1 && diceValue === 6) {
      const tokensInHome = botPlayer.tokens.filter(s => s === -1).length;
      score += 40 + (tokensInHome * 10);
    }
    if (outcome.newStep >= config.trackLength) {
      score += 35;
    }
    if (typeof outcome.newGlobalPos === 'number' && config.safeTrackIndices.includes(outcome.newGlobalPos)) {
      score += 25;
    }

    if (difficulty === 'hard') {
      score += (outcome.newStep * 0.5);
    }

    if (score > highestScore) {
      highestScore = score;
      bestTokenId = candidate.tokenId;
    }
  });

  return bestTokenId;
}

import { canTokenMove, evaluateMove } from './rules.js';
import { getBoardConfig } from './board.js';

/**
 * AI Bot Decision Maker for Offline and Single-Player / Fill Modes
 * Difficulty: 'easy', 'medium', 'hard'
 */
export function getBotMove(game, botPlayerIndex, diceValue, difficulty = 'medium') {
  const config = getBoardConfig(game.players.length);
  const botPlayer = game.players[botPlayerIndex];

  // Identify all valid tokens
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

  if (validTokens.length === 0) {
    return null; // No valid moves
  }

  if (validTokens.length === 1) {
    return validTokens[0].tokenId;
  }

  // Easy: Random move
  if (difficulty === 'easy') {
    const randomChoice = validTokens[Math.floor(Math.random() * validTokens.length)];
    return randomChoice.tokenId;
  }

  // Score candidate moves
  let bestTokenId = validTokens[0].tokenId;
  let highestScore = -Infinity;

  validTokens.forEach(candidate => {
    let score = 0;
    const { outcome, currentStep } = candidate;

    // 1. Prioritize capturing opponent tokens (+100 points)
    if (outcome.captures.length > 0) {
      score += 120 * outcome.captures.length;
    }

    // 2. Prioritize reaching finish line (+90 points)
    if (outcome.reachedFinish) {
      score += 90;
    }

    // 3. Opening a new token on rolling a 6 (+50 points)
    if (currentStep === -1 && diceValue === 6) {
      // Prioritize opening if not all tokens are out
      const tokensInHome = botPlayer.tokens.filter(s => s === -1).length;
      score += 40 + (tokensInHome * 10);
    }

    // 4. Moving into home stretch (+30 points)
    if (outcome.newStep >= config.trackLength) {
      score += 35;
    }

    // 5. Moving to a safe zone (+25 points)
    if (typeof outcome.newGlobalPos === 'number' && config.safeTrackIndices.includes(outcome.newGlobalPos)) {
      score += 25;
    }

    // 6. Hard mode: Look-ahead threat assessment
    if (difficulty === 'hard') {
      // Advance closer to finish
      score += (outcome.newStep * 0.5);

      // Check if current position is in danger from opponents 1-6 steps behind
      if (typeof outcome.newGlobalPos === 'number') {
        const inDanger = isVulnerable(game, botPlayerIndex, outcome.newGlobalPos, config);
        if (inDanger) {
          score -= 30; // Risky spot
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestTokenId = candidate.tokenId;
    }
  });

  return bestTokenId;
}

function isVulnerable(game, playerIndex, globalPos, config) {
  if (config.safeTrackIndices.includes(globalPos)) return false;

  for (let pIdx = 0; pIdx < game.players.length; pIdx++) {
    if (pIdx === playerIndex) continue;
    const opponent = game.players[pIdx];
    for (let step of opponent.tokens) {
      if (step >= 0 && step < config.trackLength) {
        const oppColor = config.colors[pIdx];
        const oppGlobalPos = (oppColor.startOffset + step) % config.trackLength;
        const distance = (globalPos - oppGlobalPos + config.trackLength) % config.trackLength;
        if (distance >= 1 && distance <= 6) {
          return true;
        }
      }
    }
  }
  return false;
}

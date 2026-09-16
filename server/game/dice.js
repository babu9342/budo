import crypto from 'crypto';

/**
 * Server-Authoritative Cryptographically Secure Dice Roller
 * Generates an integer between 1 and 6
 */
export function rollServerDice() {
  const randomBuffer = crypto.randomBytes(4);
  const randomInt = randomBuffer.readUInt32BE(0);
  return (randomInt % 6) + 1;
}

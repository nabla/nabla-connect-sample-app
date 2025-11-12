import { createHmac, timingSafeEqual } from 'crypto';
import { HttpError } from './types';

type HmacParams = {
  timestamp: string;
  signatures: string;
  rawBody: Buffer;
  key: string;
};

function splitSignatures(signatures: string | undefined) {
  if (!signatures) {
    return [];
  }
  return signatures
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry.startsWith('sha256=') ? entry.slice(7) : entry).toLowerCase());
}

function signaturesMatch(expected: string, provided: string) {
  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(provided, 'hex');
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

export function verifyHmacSignature({ timestamp, signatures, rawBody, key }: HmacParams) {
  const providedSignatures = splitSignatures(signatures);
  if (providedSignatures.length === 0) {
    throw new HttpError(401, 'Missing signature headers');
  }

  const hmac = createHmac('sha256', key);
  hmac.update(timestamp);
  hmac.update(rawBody);
  const computed = hmac.digest('hex');

  const isValid = providedSignatures.some((candidate) => signaturesMatch(computed, candidate));
  if (!isValid) {
    throw new HttpError(401, 'Invalid signature');
  }
}

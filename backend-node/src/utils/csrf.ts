import crypto from 'crypto';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfTokensMatch(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  const left = Buffer.from(cookieToken);
  const right = Buffer.from(headerToken);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

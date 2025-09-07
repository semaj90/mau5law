import { randomBytes, pbkdf2Sync, createHmac, timingSafeEqual } from 'crypto';

export interface AuthPayload {
  userId: string;
  expiresAt: number;
  [key: string]: any;
}

const SECRET = process.env.AUTH_SECRET || randomBytes(32).toString('hex');
const PBKDF2_ITER = 100_000;
const KEYLEN = 32;
const DIGEST = 'sha256';

function base64UrlEncode(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string) {
  const pad = 4 - (s.length % 4);
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + (pad === 4 ? '' : '='.repeat(pad));
  return Buffer.from(b64, 'base64');
}

export class AuthService {
  async hashPassword(password: string, salt?: string) {
    const usedSalt = salt || randomBytes(16).toString('hex');
    const derived = pbkdf2Sync(password, usedSalt, PBKDF2_ITER, KEYLEN, DIGEST);
    return { salt: usedSalt, hash: derived.toString('hex') };
  }

  async verifyPassword(password: string, salt: string, expectedHex: string): Promise<boolean> {
    try {
      const derived = pbkdf2Sync(password, salt, PBKDF2_ITER, KEYLEN, DIGEST);
      const a = Buffer.from(derived.toString('hex'), 'hex');
      const b = Buffer.from(expectedHex, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  createToken(payload: AuthPayload): string {
    const payloadJson = JSON.stringify(payload);
    const payloadB64 = base64UrlEncode(Buffer.from(payloadJson, 'utf8'));
    const sig = createHmac('sha256', SECRET).update(payloadB64).digest('hex');
    return `${payloadB64}.${sig}`;
  }

  verifyToken(token: string): AuthPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      const [payloadB64, sigHex] = parts;
      const expectedSig = createHmac('sha256', SECRET).update(payloadB64).digest('hex');
      const a = Buffer.from(sigHex, 'hex');
      const b = Buffer.from(expectedSig, 'hex');
      if (a.length !== b.length) return null;
      if (!timingSafeEqual(a, b)) return null;
      const payloadBuf = base64UrlDecode(payloadB64);
      const payload = JSON.parse(payloadBuf.toString('utf8')) as AuthPayload;
      if (typeof payload.expiresAt !== 'number' || typeof payload.userId !== 'string') return null;
      if (Date.now() > payload.expiresAt) return null;
      return payload;
    } catch {
      return null;
    }
  }
}

export default new AuthService();

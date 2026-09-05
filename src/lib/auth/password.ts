import { hash, verify } from '@node-rs/argon2';

/* Параметры из рекомендаций OWASP для argon2id: 19 МиБ памяти, 2 прохода. */
const options = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword(digest: string, password: string): Promise<boolean> {
  try {
    return await verify(digest, password, options);
  } catch {
    /* Битый или чужого формата хеш — это неуспешный вход, а не падение. */
    return false;
  }
}

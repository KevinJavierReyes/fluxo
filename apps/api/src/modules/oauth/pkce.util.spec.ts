import { createHash } from 'crypto';
import { isValidCodeChallenge, verifyPkce } from './pkce.util';

function s256Challenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

describe('verifyPkce', () => {
  it('acepta un code_verifier correcto con S256', () => {
    const verifier = 'a'.repeat(43);
    const challenge = s256Challenge(verifier);
    expect(verifyPkce(verifier, challenge, 'S256')).toBe(true);
  });

  it('rechaza un code_verifier que no corresponde al challenge', () => {
    const challenge = s256Challenge('a'.repeat(43));
    expect(verifyPkce('b'.repeat(43), challenge, 'S256')).toBe(false);
  });

  it('rechaza el método "plain" aunque el verifier coincida literalmente (OAuth 2.1 exige S256)', () => {
    const verifier = 'a'.repeat(43);
    expect(verifyPkce(verifier, verifier, 'plain')).toBe(false);
  });

  it('rechaza cualquier método distinto de S256', () => {
    const verifier = 'a'.repeat(43);
    const challenge = s256Challenge(verifier);
    expect(verifyPkce(verifier, challenge, 'S1')).toBe(false);
  });
});

describe('isValidCodeChallenge', () => {
  it('acepta base64url de 43 a 128 caracteres', () => {
    expect(isValidCodeChallenge('a'.repeat(43))).toBe(true);
    expect(isValidCodeChallenge('a'.repeat(128))).toBe(true);
    expect(
      isValidCodeChallenge('abc-DEF_123.~xyz'.repeat(3).slice(0, 60)),
    ).toBe(true);
  });

  it('rechaza strings demasiado cortos o demasiado largos', () => {
    expect(isValidCodeChallenge('a'.repeat(42))).toBe(false);
    expect(isValidCodeChallenge('a'.repeat(129))).toBe(false);
  });

  it('rechaza caracteres fuera del alfabeto base64url', () => {
    expect(isValidCodeChallenge('a'.repeat(42) + '+')).toBe(false);
    expect(isValidCodeChallenge('a'.repeat(42) + '/')).toBe(false);
    expect(isValidCodeChallenge('a'.repeat(42) + '=')).toBe(false);
  });
});

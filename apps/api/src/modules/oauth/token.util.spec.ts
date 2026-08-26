import {
  generateAuthorizationCode,
  generateOpaqueToken,
  hashToken,
  safeEqualHash,
} from './token.util';

describe('generateOpaqueToken', () => {
  it('genera un token con el prefijo dado y un hash consistente', () => {
    const { raw, hash, displayPrefix } = generateOpaqueToken('flx_at_');
    expect(raw.startsWith('flx_at_')).toBe(true);
    expect(displayPrefix.startsWith('flx_at_')).toBe(true);
    expect(hash).toBe(hashToken(raw));
  });

  it('genera tokens distintos en cada llamada', () => {
    const a = generateOpaqueToken('flx_at_');
    const b = generateOpaqueToken('flx_at_');
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });

  it('el displayPrefix no expone el secreto completo', () => {
    const { raw, displayPrefix } = generateOpaqueToken('flx_pat_');
    expect(displayPrefix.length).toBeLessThan(raw.length);
  });
});

describe('hashToken', () => {
  it('es determinístico', () => {
    expect(hashToken('mismo-valor')).toBe(hashToken('mismo-valor'));
  });

  it('produce hashes distintos para valores distintos', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

describe('safeEqualHash', () => {
  it('devuelve true para hashes iguales', () => {
    const h = hashToken('x');
    expect(safeEqualHash(h, h)).toBe(true);
  });

  it('devuelve false para hashes de largo distinto sin lanzar', () => {
    expect(safeEqualHash('ab', 'abcd')).toBe(false);
  });

  it('devuelve false para hashes distintos del mismo largo', () => {
    expect(safeEqualHash(hashToken('a'), hashToken('b'))).toBe(false);
  });
});

describe('generateAuthorizationCode', () => {
  it('genera un code cuyo hash coincide con hashToken(raw)', () => {
    const { raw, hash } = generateAuthorizationCode();
    expect(hash).toBe(hashToken(raw));
  });
});

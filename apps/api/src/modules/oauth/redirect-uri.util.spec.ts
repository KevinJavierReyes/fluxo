import { isRedirectUriAllowed, isSchemeAllowed } from './redirect-uri.util';

describe('isRedirectUriAllowed', () => {
  it('acepta un match exacto', () => {
    const registered = ['https://claude.ai/api/mcp/auth_callback'];
    expect(
      isRedirectUriAllowed(
        'https://claude.ai/api/mcp/auth_callback',
        registered,
      ),
    ).toBe(true);
  });

  it('rechaza una URI que no está registrada', () => {
    const registered = ['https://claude.ai/api/mcp/auth_callback'];
    expect(isRedirectUriAllowed('https://evil.com/callback', registered)).toBe(
      false,
    );
  });

  it('en loopback, acepta un puerto distinto al registrado (clientes nativos abren puertos efímeros)', () => {
    const registered = ['http://127.0.0.1:51000/callback'];
    expect(
      isRedirectUriAllowed('http://127.0.0.1:62345/callback', registered),
    ).toBe(true);
  });

  it('en loopback con localhost, también ignora el puerto', () => {
    const registered = ['http://localhost:3000/callback'];
    expect(
      isRedirectUriAllowed('http://localhost:9999/callback', registered),
    ).toBe(true);
  });

  it('en loopback, exige que coincida el path exacto aunque el puerto varíe', () => {
    const registered = ['http://127.0.0.1:51000/callback'];
    expect(
      isRedirectUriAllowed('http://127.0.0.1:62345/otro-path', registered),
    ).toBe(false);
  });

  it('rechaza http:// en un host no-loopback aunque esté "registrado" (defensa en profundidad)', () => {
    // Un http:// público nunca debería llegar a estar registrado (isSchemeAllowed
    // lo bloquea en el registro), pero si de alguna forma lo estuviera, esta
    // función no lo trata como loopback y lo rechaza igual salvo match exacto.
    const registered = ['http://example.com/callback'];
    expect(
      isRedirectUriAllowed('http://example.com/callback', registered),
    ).toBe(
      true, // match exacto sí pasa — la protección real está en isSchemeAllowed al registrar
    );
    expect(
      isRedirectUriAllowed('http://example.com:9999/callback', registered),
    ).toBe(false); // pero variar el puerto en no-loopback NO se perdona
  });

  it('acepta schemes custom con match exacto (claude://, cursor://)', () => {
    const registered = ['claude://oauth/callback'];
    expect(isRedirectUriAllowed('claude://oauth/callback', registered)).toBe(
      true,
    );
    expect(isRedirectUriAllowed('cursor://oauth/callback', registered)).toBe(
      false,
    );
  });

  it('rechaza una URI malformada', () => {
    expect(isRedirectUriAllowed('no-es-una-url', ['https://a.com/cb'])).toBe(
      false,
    );
  });
});

describe('isSchemeAllowed', () => {
  it('acepta https:// en cualquier host', () => {
    expect(isSchemeAllowed('https://claude.ai/callback')).toBe(true);
  });

  it('acepta http:// solo en loopback', () => {
    expect(isSchemeAllowed('http://127.0.0.1:3000/callback')).toBe(true);
    expect(isSchemeAllowed('http://localhost:3000/callback')).toBe(true);
  });

  it('rechaza http:// en un host público', () => {
    expect(isSchemeAllowed('http://example.com/callback')).toBe(false);
  });

  it('acepta schemes custom (no son http)', () => {
    expect(isSchemeAllowed('claude://oauth/callback')).toBe(true);
  });

  it('rechaza una URI malformada', () => {
    expect(isSchemeAllowed('no-es-una-url')).toBe(false);
  });
});

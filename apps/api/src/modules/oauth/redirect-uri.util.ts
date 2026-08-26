const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/**
 * Valida un `redirect_uri` de la petición contra la lista registrada del
 * cliente (RFC 8252 §7.3):
 * - Match exacto en general.
 * - Para loopback (127.0.0.1/localhost) se ignora el puerto: los clientes
 *   nativos (Claude Desktop) abren un puerto efímero distinto cada vez.
 * - http:// solo se permite en loopback; cualquier otro host debe ser https
 *   o un scheme custom (claude://, cursor://...).
 */
export function isRedirectUriAllowed(
  requested: string,
  registered: string[],
): boolean {
  if (registered.includes(requested)) {
    return true;
  }

  let requestedUrl: URL;
  try {
    requestedUrl = new URL(requested);
  } catch {
    return false;
  }

  if (!isLoopback(requestedUrl.hostname)) {
    return false;
  }

  return registered.some((candidate) => {
    let candidateUrl: URL;
    try {
      candidateUrl = new URL(candidate);
    } catch {
      return false;
    }
    return (
      isLoopback(candidateUrl.hostname) &&
      candidateUrl.protocol === requestedUrl.protocol &&
      candidateUrl.pathname === requestedUrl.pathname &&
      candidateUrl.search === requestedUrl.search
    );
  });
}

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

/** http:// solo es aceptable en loopback; cualquier otro host exige https o un scheme custom. */
export function isSchemeAllowed(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.protocol === 'http:') {
    return isLoopback(url.hostname);
  }
  return true;
}

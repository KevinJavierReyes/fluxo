import { getApiOrigin } from '@/lib/api-origin';

export function getMcpServerUrl(): string {
  return `${getApiOrigin()}/mcp`;
}

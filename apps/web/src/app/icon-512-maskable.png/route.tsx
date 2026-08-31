import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * Igual que icon-512.png pero con el logo achicado a ~60% del canvas: es la
 * zona segura que Android respeta antes de recortar el ícono en un círculo
 * o squircle, así el mark no queda cortado en el launcher.
 */
export async function GET() {
  const logoBase64 = readFileSync(join(process.cwd(), 'public/logo.png')).toString('base64');
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#00927d',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUrl} alt="" width={280} height={311} style={{ objectFit: 'contain' }} />
      </div>
    ),
    { width: 512, height: 512 },
  );
}

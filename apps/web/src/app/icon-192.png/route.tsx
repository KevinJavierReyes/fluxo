import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

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
        <img src={logoDataUrl} alt="" width={130} height={144} style={{ objectFit: 'contain' }} />
      </div>
    ),
    { width: 192, height: 192 },
  );
}

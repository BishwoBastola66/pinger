import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { monitors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [monitor] = await db.select().from(monitors).where(eq(monitors.id, id)).limit(1);

  if (!monitor) {
    return new NextResponse('Not Found', { status: 404 });
  }

  let color = '#4ade80'; // green-400
  let statusText = 'UP';
  let width = 90;

  if (monitor.status === 'failing') {
    color = '#f87171'; // red-400
    statusText = 'DOWN';
  } else if (monitor.status === 'degraded') {
    color = '#facc15'; // yellow-400
    statusText = 'DEGRADED';
    width = 130;
  } else if (monitor.status === 'paused') {
    color = '#9ca3af'; // gray-400
    statusText = 'PAUSED';
    width = 110;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" aria-label="Status: ${statusText}">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="${width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <rect width="50" height="20" fill="#555"/>
    <rect x="50" width="${width - 50}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="260" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="390">status</text>
    <text x="260" y="140" transform="scale(.1)" textLength="390">status</text>
    <text x="${500 + (width - 50) * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(width - 60) * 10}">${statusText}</text>
    <text x="${500 + (width - 50) * 5}" y="140" transform="scale(.1)" textLength="${(width - 60) * 10}">${statusText}</text>
  </g>
</svg>
  `.trim();

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

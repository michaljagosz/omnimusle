// app/api/audio-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  try {
    // Pobieramy audio z zewnętrznego źródła (Deezer)
    const externalRes = await fetch(url);
    
    if (!externalRes.ok) throw new Error('Failed to fetch from source');

    // Przekazujemy plik dalej z nagłówkami, które lubi przeglądarka
    return new NextResponse(externalRes.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new NextResponse('Error fetching audio', { status: 500 });
  }
}
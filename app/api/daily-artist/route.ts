// app/api/daily-artist/route.ts
import { NextResponse } from 'next/server';

const ARTIST_PLAYLIST = [
  "Freddie Mercury",      // Dzień 0
  "Elvis Presley",        // Dzień 1
  "Lady Gaga",            // Dzień 2
  "Eminem",               // Dzień 3
  "Beyonce",              // Dzień 4
  "David Bowie",          // Dzień 5
  "Rihanna",              // Dzień 6
  "Ed Sheeran"            // Dzień 7
];

export async function GET() {
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentDayIndex = Math.floor(Date.now() / msPerDay);
  const artistQuery = ARTIST_PLAYLIST[currentDayIndex % ARTIST_PLAYLIST.length];

  try {
    // Pytamy Deezera o artystę
    const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistQuery)}&limit=1`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ error: 'Nie znaleziono artysty' }, { status: 404 });
    }

    return NextResponse.json(data.data[0]); // Zwracamy obiekt artysty
    
  } catch (error) {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
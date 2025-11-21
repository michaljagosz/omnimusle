import { NextResponse } from 'next/server';

const ALBUM_PLAYLIST = [
  "Pink Floyd Dark Side of the Moon", // Dzień 0
  "Nirvana Nevermind",                // Dzień 1
  "Michael Jackson Thriller",         // Dzień 2
  "Beatles Abbey Road",               // Dzień 3
  "Metallica Master of Puppets",      // Dzień 4
  "Dr Dre 2001",                      // Dzień 5
  "Adele 21"                          // Dzień 6
];

export async function GET() {
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentDayIndex = Math.floor(Date.now() / msPerDay);
  const albumQuery = ALBUM_PLAYLIST[currentDayIndex % ALBUM_PLAYLIST.length];

  try {
    const response = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(albumQuery)}&limit=1`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ error: 'Nie znaleziono albumu' }, { status: 404 });
    }
    return NextResponse.json(data.data[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
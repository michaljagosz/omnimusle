import { NextResponse } from 'next/server';

// LISTA ZAGADEK - TERAZ UŻYWAMY DEEZER ID!
// Znajdź ID w URL na deezer.com (np. deezer.com/track/123456)
const PLAYLIST_IDS = [
  "1109731",   // Queen - Bohemian Rhapsody
  "3135556",   // Billie Eilish - No Time To Die (przykładowe ID)
  "138543",    // Michael Jackson - Billie Jean
  "6569065",   // Nirvana - Smells Like Teen Spirit
  "1109739",   // Queen - Another One Bites The Dust
  "904367"     // Metallica - Enter Sandman
];

export async function GET() {
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentDayIndex = Math.floor(Date.now() / msPerDay);

  // 1. Wybieramy ID na dziś
  const deezerId = PLAYLIST_IDS[currentDayIndex % PLAYLIST_IDS.length];

  try {
    // 2. Pytamy o konkretny utwór po ID
    const response = await fetch(`https://api.deezer.com/track/${deezerId}`);
    const data = await response.json();

    if (data.error || !data.preview) {
      return NextResponse.json({ error: 'Nie znaleziono utworu w Deezerze' }, { status: 404 });
    }

    // 3. Zwracamy gotowy obiekt utworu do frontendu
    // (Deezer zwraca od razu idealny format, nie musimy go mapować)
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
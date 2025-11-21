import { NextResponse } from 'next/server';

// Lista zagadek: ID utworu w Deezerze + Fragmenty tekstu
const LYRICS_PLAYLIST = [
  {
    id: 3135556, // Queen - Bohemian Rhapsody
    lines: [
      "Is this the real life?",
      "Is this just fantasy?",
      "Caught in a landside,",
      "No escape from reality",
      "Open your eyes,",
      "Look up to the skies and see,"
    ]
  },
  {
    id: 3135556, // Michael Jackson - Billie Jean
    lines: [
      "She was more like a beauty queen",
      "From a movie scene",
      "I said don't mind,",
      "But what do you mean,",
      "I am the one",
      "Who will dance on the floor in the round?"
    ]
  },
  {
    id: 3135556, // Przykładowy: Survivor - Eye of the Tiger (ID trzeba sprawdzić)
    lines: [
      "Risin' up, back on the street",
      "Did my time, took my chances",
      "Went the distance, now I'm back on my feet",
      "Just a man and his will to survive",
      "So many times it happens too fast",
      "You trade your passion for glory"
    ]
  }
];

export async function GET() {
  console.log("--- API DAILY-LYRICS START ---");
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentDayIndex = Math.floor(Date.now() / msPerDay);
  
  // Wybór zagadki (modulo zapewnia pętlę)
  const dailyLyric = LYRICS_PLAYLIST[currentDayIndex % LYRICS_PLAYLIST.length];

  console.log(`Wybrano zagadkę ID: ${dailyLyric.id}`);

  try {
    // Pobieramy metadane utworu z Deezera
    const response = await fetch(`https://api.deezer.com/track/${dailyLyric.id}`);
    
    if (!response.ok) {
        throw new Error(`Błąd sieci Deezer: ${response.status}`);
    }

    const trackData = await response.json();

    // Deezer zwraca obiekt "error" wewnątrz JSONa w przypadku problemów
    if (trackData.error) {
        console.error("Deezer API Error:", trackData.error);
        return NextResponse.json({ error: 'Nie znaleziono utworu w Deezerze' }, { status: 404 });
    }

    // Budujemy odpowiedź dla gry
    const gameData = {
      id: trackData.id,
      title: trackData.title,
      artist: {
        name: trackData.artist.name,
        picture_small: trackData.artist.picture_small
      },
      album: {
        cover_medium: trackData.album.cover_medium
      },
      lines: dailyLyric.lines
    };

    return NextResponse.json(gameData);
    
  } catch (error) {
    console.error("KRYTYCZNY BŁĄD API LYRICS:", error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';

// Zestaw "Pewniaków" - te utwory na 100% mają działające preview w Deezerze
const MASHUP_PLAYLIST = [
{
    // Dzień 0: Klasyki Rocka
    trackA: "1109731",   // Queen - Bohemian Rhapsody
    trackB: "6569065",   // Nirvana - Smells Like Teen Spirit
    trackC: "112233"     // Survivor - Eye of the Tiger
  },
    {
    // Dzień 0: Klasyki Rocka
    trackA: "9997018",   // Queen - Bohemian Rhapsody
    trackB: "13791930",   // Nirvana - Smells Like Teen Spirit
    trackC: "576431"     // Survivor - Eye of the Tiger
  },
];

export async function GET() {
  console.log("--- [MASHUP API] START ---");
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentDayIndex = Math.floor(Date.now() / msPerDay);
  // Wybieramy zestaw (modulo)
  const puzzle = MASHUP_PLAYLIST[(currentDayIndex + 2) % MASHUP_PLAYLIST.length];

  console.log(`[MASHUP API] Pobieram ID: ${puzzle.trackA}, ${puzzle.trackB}, ${puzzle.trackC}`);

  // Funkcja pomocnicza do pobierania
  const fetchTrack = async (id: string, label: string) => {
    try {
      const res = await fetch(`https://api.deezer.com/track/${id}`);
      if (!res.ok) return null;
      
      const data = await res.json();
      if (data.error || !data.preview) {
          console.error(`[${label}] Błąd Deezera dla ID ${id}:`, data.error || "Brak preview");
          return null;
      }
      return data;
    } catch (e) {
      console.error(`[${label}] Fetch error:`, e);
      return null;
    }
  };

  try {
    // Pobieramy równolegle
    const [trackA, trackB, trackC] = await Promise.all([
      fetchTrack(puzzle.trackA, "Track A"),
      fetchTrack(puzzle.trackB, "Track B"),
      fetchTrack(puzzle.trackC, "Track C")
    ]);

    // Jeśli którykolwiek nie działa, zwracamy błąd, żeby frontend nie udawał że gra
    if (!trackA || !trackB || !trackC) {
        return NextResponse.json({ error: 'Jeden z utworów jest niedostępny w Deezerze' }, { status: 404 });
    }

    return NextResponse.json({
      trackA,
      trackB,
      trackC
    });

  } catch (error) {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
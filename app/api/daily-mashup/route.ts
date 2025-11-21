import { NextResponse } from 'next/server';

const MASHUP_PLAYLIST = [
  {
    trackA: "561836",   
    // Nirvana - Smells Like Teen Spirit
    trackB: "1153182282",   
    // Survivor - Eye of the Tiger
    trackC: "4603408"
  }
  // ... Twoje zestawy ...
];

export async function GET() {
  console.log("--- [MASHUP API] START ---");
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentDayIndex = Math.floor(Date.now() / msPerDay);
  const puzzle = MASHUP_PLAYLIST[(currentDayIndex + 3) % MASHUP_PLAYLIST.length];

  console.log(`[MASHUP API] Pobieram utwory: A:${puzzle.trackA}, B:${puzzle.trackB}, C:${puzzle.trackC}`);

  // Funkcja pomocnicza do pobierania z logowaniem błędów
  const fetchTrack = async (id: string, label: string) => {
    const url = `https://api.deezer.com/track/${id}`;
    console.log(`[${label}] Fetching: ${url}`);
    
    const res = await fetch(url);
    if (!res.ok) {
        console.error(`[${label}] HTTP Error: ${res.status}`);
        return null;
    }
    
    const data = await res.json();
    
    if (data.error) {
        console.error(`[${label}] Deezer API Error:`, data.error);
        return null;
    }
    
    if (!data.preview) {
        console.error(`[${label}] BRAK PREVIEW (MP3)! Utwór: ${data.title}`);
        return null;
    }

    console.log(`[${label}] Sukces: ${data.title} (Preview OK)`);
    return data;
  };

  try {
    // Pobieramy po kolei (żeby widzieć w logach co pada)
    const trackA = await fetchTrack(puzzle.trackA, "Track A");
    const trackB = await fetchTrack(puzzle.trackB, "Track B");
    const trackC = await fetchTrack(puzzle.trackC, "Track C");

    if (!trackA || !trackB || !trackC) {
        console.error("[MASHUP API] Jeden z utworów nie działa. Przerywam.");
        return NextResponse.json({ error: 'Błąd pobierania utworów' }, { status: 500 });
    }

    return NextResponse.json({
      trackA,
      trackB,
      trackC
    });

  } catch (error) {
    console.error("[MASHUP API] Critical Error:", error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
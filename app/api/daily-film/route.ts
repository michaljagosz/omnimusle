import { NextResponse } from 'next/server';

const FILM_PLAYLIST = [
  {
    tmdbId: 10191,
    title: "How to Train Your Dragon",
    deezerId: "119437636"
  },
    {
    tmdbId: 2270,
    title: "Stardust",
    deezerId: "1115785"
  },
    {
    tmdbId: 744,
    title: "Top Gun",
    deezerId: "7675055"
  }
];

export async function GET() {
  console.log("--- API DAILY-FILM START ---");
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentDayIndex = Math.floor(Date.now() / msPerDay);
  const puzzle = FILM_PLAYLIST[currentDayIndex % FILM_PLAYLIST.length];

  console.log(`Wybrana zagadka: ${puzzle.title} (Deezer: ${puzzle.deezerId}, TMDB: ${puzzle.tmdbId})`);

  try {
    // 1. DEEZER FETCH
    console.log("Pobieranie audio z Deezera...");
    const deezerRes = await fetch(`https://api.deezer.com/track/${puzzle.deezerId}`);
    const trackData = await deezerRes.json();

    if (trackData.error || !trackData.preview) {
        console.error("BŁĄD DEEZERA:", trackData.error || "Brak preview URL");
        // Fallback: zwracamy błąd, ale nie crashujemy
        return NextResponse.json({ error: 'Błąd Deezera' }, { status: 404 });
    }
    
    const audioLink = trackData.preview;
    console.log("Audio OK:", audioLink);

    // 2. TMDB FETCH
    console.log("Pobieranie plakatu z TMDB...");
    const tmdbApiKey = process.env.TMDB_API_KEY;
    let posterUrl = "https://via.placeholder.com/500x750?text=No+Poster"; // Domyślny

    if (!tmdbApiKey) {
        console.warn("UWAGA: Brak klucza TMDB_API_KEY w pliku .env.local!");
    } else {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${puzzle.tmdbId}?api_key=${tmdbApiKey}&language=pl-PL`);
        
        if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            if (tmdbData.poster_path) {
                posterUrl = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
                console.log("Plakat OK:", posterUrl);
            }
        } else {
            console.error("Błąd TMDB API:", tmdbRes.status, tmdbRes.statusText);
        }
    }

    // 3. SUKCES
    return NextResponse.json({
      tmdbId: puzzle.tmdbId,
      title: puzzle.title,
      audioPreview: audioLink,
      poster: posterUrl
    });

  } catch (error) {
    console.error("KRYTYCZNY BŁĄD API:", error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
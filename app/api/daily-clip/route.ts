// app/api/daily-clip/route.ts
import { NextResponse } from 'next/server';

const CLIP_PLAYLIST = [
  {
    // A-ha - Take On Me
    youtubeId: "djV11Xbc914",
    title: "a-ha - Take On Me",
    // 6 momentów czasowych (w sekundach) od najtrudniejszego do najłatwiejszego
    timestamps: [
       162, // Runda 1: Jakieś bazgroły / tło
       15,  // Runda 2: Zbliżenie na rękę
       50,  // Runda 3: Widok z kawiarni
       90,  // Runda 4: Wyścig motorowy
       130, // Runda 5: Twarz wokalisty (szkic)
       175  // Runda 6: Twarz wokalisty (real)
    ]
  },
  {
    // Michael Jackson - Thriller
    youtubeId: "sOnqjkJTMaA",
    title: "Michael Jackson - Thriller",
    timestamps: [370, 60, 200, 450, 560, 320] 
  },
  // Dodaj więcej...

    {
    // Michael Jackson - Thriller
    youtubeId: "zUzd9KyIDrM",
    title: "System Of A Down - B.Y.O.B.",
    timestamps: [3, 47, 58, 150, 219, 139] 
  },

];

export async function GET() {
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentDayIndex = Math.floor(Date.now() / msPerDay);
  const puzzle = CLIP_PLAYLIST[currentDayIndex % CLIP_PLAYLIST.length];

  // Pobieramy metadane z TMDB lub Deezera?
  // W przypadku klipów najłatwiej po prostu zwrócić dane, które mamy ręcznie wpisane,
  // bo YouTube API jest restrykcyjne z limitami.
  // Ale możemy "oszukać" i pobrać okładkę albumu z Deezera jako "rozwiązanie".
  
  let posterUrl = "https://via.placeholder.com/300?text=Music+Video";

  try {
      // Szukamy piosenki w Deezerze żeby mieć ładną okładkę na koniec gry
      const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(puzzle.title)}&limit=1`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
          posterUrl = data.data[0].album.cover_medium;
      }
  } catch (e) {
      console.error(e);
  }

  return NextResponse.json({
    youtubeId: puzzle.youtubeId,
    timestamps: puzzle.timestamps,
    title: puzzle.title, // To jest poprawna odpowiedź
    poster: posterUrl
  });
}
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'track'; 

  if (!query) return NextResponse.json({ data: [] });

  try {
    // --- NOWOŚĆ: OBSŁUGA FILMÓW (TMDB) ---
    if (type === 'film') {
      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
         // Fallback jeśli nie masz klucza (do testów)
         console.error("Brak klucza TMDB_API_KEY w .env.local");
         return NextResponse.json({ data: [] });
      }

      // Szukamy filmów (movie) i seriali (tv)
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pl-PL&include_adult=false`;
      
      const res = await fetch(url);
      const data = await res.json();

      // Mapujemy wyniki TMDB na nasz uniwersalny format
      const formattedResults = data.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => ({
          id: item.id,
          // Filmy mają 'title', seriale 'name'
          title: item.title || item.name, 
          // Plakat filmu (jeśli brak, dajemy placeholder)
          poster: item.poster_path 
            ? `https://image.tmdb.org/t/p/w92${item.poster_path}` 
            : 'https://via.placeholder.com/92x138?text=No+Img',
          year: (item.release_date || item.first_air_date || '').substring(0, 4),
          type: item.media_type // 'movie' lub 'tv'
        }));

      return NextResponse.json({ data: formattedResults });
    }

    // --- STARA OBSŁUGA MUZYKI (DEEZER) ---
    let endpoint = 'search';
    if (type === 'artist') endpoint = 'search/artist';
    if (type === 'album') endpoint = 'search/album';
    
    const response = await fetch(`https://api.deezer.com/${endpoint}?q=${encodeURIComponent(query)}&limit=5`);
    const data = await response.json();
    
    return NextResponse.json(data);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
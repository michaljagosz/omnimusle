'use client';

import { useEffect, useRef, useState } from 'react';

interface PixelatedImageProps {
  src: string;
  pixelFactor: number; // Jak duże mają być piksele (1 = oryginał, 50 = wielkie klocki)
  className?: string;
}

export default function PixelatedImage({ src, pixelFactor, className }: PixelatedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // 1. Ładowanie obrazka do pamięci
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Ważne dla obrazków z Deezera/TMDB
    img.src = src;
    img.onload = () => setImageObj(img);
  }, [src]);

  // 2. Rysowanie pikselizacji
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ustawiamy wielkość canvasa taką samą jak obrazka
    // (Dzięki CSSowi canvas dopasuje się do kontenera na ekranie)
    const w = imageObj.width;
    const h = imageObj.height;
    canvas.width = w;
    canvas.height = h;

    // Wyłączamy wygładzanie (to klucz do efektu pikseli!)
    ctx.imageSmoothingEnabled = false;

    // A. Obliczamy wielkość "zmniejszonego" obrazka
    // Jeśli pixelFactor = 10, to obrazek 500px zmniejszamy do 50px
    const sampleW = Math.max(1, Math.floor(w / pixelFactor));
    const sampleH = Math.max(1, Math.floor(h / pixelFactor));

    // B. Rysujemy obrazek zmniejszony (tracimy dane)
    // drawImage(image, dx, dy, dWidth, dHeight)
    ctx.drawImage(imageObj, 0, 0, sampleW, sampleH);

    // C. Rysujemy ten mały obrazek z powrotem na całą powierzchnię
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    // Bierzemy mały wycinek (0,0 -> sampleW,sampleH) i rysujemy go na dużym (0,0 -> w,h)
    ctx.drawImage(canvas, 0, 0, sampleW, sampleH, 0, 0, w, h);

  }, [imageObj, pixelFactor]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
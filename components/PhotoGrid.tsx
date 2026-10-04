"use client";

import { useState } from "react";
import { Lock, X } from "lucide-react";
import Image from "next/image";

interface Photo {
  id: string;
  storage_path: string;
  guest_name: string | null;
  taken_at: string;
  url: string;
}

interface PhotoGridProps {
  photos: Photo[];
  revealed: boolean;
}

export default function PhotoGrid({ photos, revealed }: PhotoGridProps) {
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">📷</p>
        <p className="text-sm">Nenhuma foto ainda. Seja o primeiro!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => revealed && setLightbox(photo)}
            className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
            aria-label={revealed ? "Ver foto" : "Foto bloqueada"}
          >
            {revealed ? (
              <Image
                src={photo.url}
                alt={photo.guest_name || "Foto do casamento"}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 33vw, 20vw"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal/80">
                <Lock className="w-5 h-5 text-white/60" />
              </div>
            )}
            {photo.guest_name && revealed && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition">
                <p className="text-white text-xs truncate">{photo.guest_name}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox.url}
              alt={lightbox.guest_name || "Foto"}
              width={800}
              height={600}
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
            {lightbox.guest_name && (
              <p className="text-white/70 text-sm text-center mt-2">{lightbox.guest_name}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

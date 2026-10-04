"use client";

import { useState, useCallback, useEffect } from "react";
import { Camera, Images, Heart } from "lucide-react";
import CameraComponent from "@/components/Camera";
import PhotoGrid from "@/components/PhotoGrid";
import RevealTimer from "@/components/RevealTimer";
import { supabase } from "@/lib/supabase";

interface Photo {
  id: string;
  storage_path: string;
  guest_name: string | null;
  taken_at: string;
  url: string;
}

interface Event {
  id: string;
  name: string;
  reveal_at: string;
  slug: string;
}

interface Props {
  event: Event;
  initialPhotos: Photo[];
  supabaseUrl: string;
}

type Tab = "camera" | "album";

export default function EventClient({ event, initialPhotos, supabaseUrl }: Props) {
  const [tab, setTab] = useState<Tab>("camera");
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [revealed, setRevealed] = useState(() => new Date() >= new Date(event.reveal_at));
  const [photoCount, setPhotoCount] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [nameSet, setNameSet] = useState(false);

  const handleRevealed = useCallback(() => setRevealed(true), []);

  const handlePhotoTaken = useCallback(() => {
    setPhotoCount((c) => c + 1);
    setTab("album");
  }, []);

  // Real-time subscription for new photos
  useEffect(() => {
    const channel = supabase
      .channel(`event-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photos", filter: `event_id=eq.${event.id}` },
        (payload) => {
          const newPhoto = payload.new as { id: string; storage_path: string; guest_name: string | null; taken_at: string };
          setPhotos((prev) => [
            {
              ...newPhoto,
              url: `${supabaseUrl}/storage/v1/object/public/photos/${newPhoto.storage_path}`,
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id, supabaseUrl]);

  if (!nameSet) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-3xl mb-3">💐</p>
            <h1 className="text-2xl font-semibold text-charcoal">{event.name}</h1>
            <p className="text-gray-500 text-sm mt-2">Bem-vindo! Como você quer ser identificado nas fotos?</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Seu nome (opcional)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-charcoal placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose transition mb-4"
              maxLength={40}
              onKeyDown={(e) => e.key === "Enter" && setNameSet(true)}
            />
            <button
              onClick={() => setNameSet(true)}
              className="w-full py-3 bg-rose text-white font-medium rounded-xl hover:bg-rose/90 transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Abrir câmera
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-charcoal text-sm">{event.name}</h1>
            <p className="text-xs text-gray-400">{photos.length} foto{photos.length !== 1 ? "s" : ""}</p>
          </div>
          {!revealed && (
            <RevealTimer revealAt={event.reveal_at} onRevealed={handleRevealed} />
          )}
          {revealed && (
            <div className="flex items-center gap-1 text-xs text-rose font-medium">
              <Heart className="w-3 h-3 fill-rose" />
              Reveladas!
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="max-w-md mx-auto flex">
          {(["camera", "album"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t
                  ? "border-rose text-rose"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "camera" ? <Camera className="w-4 h-4" /> : <Images className="w-4 h-4" />}
              {t === "camera" ? "Câmera" : "Álbum"}
              {t === "camera" && photoCount > 0 && (
                <span className="bg-rose text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {photoCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        {tab === "camera" ? (
          <div className="space-y-4">
            <CameraComponent
              eventId={event.id}
              guestName={guestName}
              onPhotoTaken={handlePhotoTaken}
            />
            {photoCount > 0 && (
              <p className="text-center text-sm text-gray-500">
                Você tirou {photoCount} foto{photoCount !== 1 ? "s" : ""}! Continue fotografando 📸
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!revealed && (
              <div className="bg-charcoal/5 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">
                  As fotos serão reveladas quando o timer zerar.<br />
                  Enquanto isso, continue fotografando!
                </p>
              </div>
            )}
            <PhotoGrid photos={photos} revealed={revealed} />
          </div>
        )}
      </div>
    </main>
  );
}

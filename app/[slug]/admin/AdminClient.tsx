"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Download, QrCode, Images, Check, ExternalLink } from "lucide-react";
import PhotoGrid from "@/components/PhotoGrid";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  eventUrl: string;
  supabaseUrl: string;
  adminToken: string;
}

export default function AdminClient({ event, initialPhotos, eventUrl, supabaseUrl, adminToken }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [revealed, setRevealed] = useState(() => new Date() >= new Date(event.reveal_at));
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate QR code
  useEffect(() => {
    async function generateQR() {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(eventUrl, {
          width: 400,
          margin: 2,
          color: { dark: "#2D2D2D", light: "#FFFFFF" },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error("QR generation failed:", err);
      }
    }
    generateQR();
  }, [eventUrl]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`admin-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photos", filter: `event_id=eq.${event.id}` },
        (payload) => {
          const newPhoto = payload.new as { id: string; storage_path: string; guest_name: string | null; taken_at: string };
          setPhotos((prev) => [
            { ...newPhoto, url: `${supabaseUrl}/storage/v1/object/public/photos/${newPhoto.storage_path}` },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id, supabaseUrl]);

  // Countdown
  useEffect(() => {
    if (revealed) return;
    const interval = setInterval(() => {
      if (new Date() >= new Date(event.reveal_at)) {
        setRevealed(true);
        clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [event.reveal_at, revealed]);

  async function copyLink() {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode-${event.slug}.png`;
    a.click();
  }

  const revealDate = format(new Date(event.reveal_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <main className="min-h-screen pb-12">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Painel do organizador</p>
          <h1 className="text-xl font-semibold text-charcoal">{event.name}</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: photos.length, label: "Fotos", icon: "📷" },
            {
              value: revealed ? "Reveladas" : "Bloqueadas",
              label: "Status",
              icon: revealed ? "✨" : "🔒",
            },
            {
              value: revealDate,
              label: "Revelação",
              icon: "⏰",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <div className="text-xl mb-1">{stat.icon}</div>
              <p className="text-sm font-semibold text-charcoal truncate">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-rose" />
            <h2 className="font-semibold text-charcoal">QR Code para os convidados</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0 bg-white rounded-xl p-3 border-2 border-gray-100" ref={qrRef}>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
              ) : (
                <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-rose border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 w-full">
              <p className="text-sm text-gray-500">
                Imprima este QR code e coloque em cada assento. Os convidados escaneiam e a câmera abre direto no browser — sem instalar nada.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={downloadQR}
                  disabled={!qrDataUrl}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose text-white rounded-xl text-sm font-medium hover:bg-rose/90 disabled:opacity-50 transition"
                >
                  <Download className="w-4 h-4" />
                  Baixar QR Code
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-charcoal rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Link copiado!" : "Copiar link"}
                </button>
                <a
                  href={eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-charcoal rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir como convidado
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Admin note about saving link */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700">
            <strong>Guarde este link!</strong> É o único acesso ao painel admin:<br />
            <code className="break-all text-amber-800">{typeof window !== "undefined" ? window.location.href : ""}</code>
          </p>
        </div>

        {/* Photos */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Images className="w-5 h-5 text-rose" />
            <h2 className="font-semibold text-charcoal">Álbum ({photos.length} fotos)</h2>
          </div>
          <PhotoGrid photos={photos} revealed={revealed} />
        </div>
      </div>
    </main>
  );
}

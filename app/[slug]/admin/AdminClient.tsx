"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Copy, Download, QrCode, Images, Check, ExternalLink, Trash2, AlertTriangle, Pencil, PackageOpen } from "lucide-react";
import PhotoGrid from "@/components/PhotoGrid";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
  logoUrl?: string | null;
}

export default function AdminClient({ event, initialPhotos, eventUrl, supabaseUrl, adminToken, logoUrl }: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [revealed, setRevealed] = useState(() => new Date() >= new Date(event.reveal_at));
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [adminUrl, setAdminUrl] = useState("");
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealInput, setRevealInput] = useState("");
  const [savingReveal, setSavingReveal] = useState(false);
  const [revealError, setRevealError] = useState("");
  const [revealAt, setRevealAt] = useState(event.reveal_at);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setAdminUrl(window.location.href); }, []);

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
      if (new Date() >= new Date(revealAt)) {
        setRevealed(true);
        clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [revealAt, revealed]);

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

  const handleDeletePhoto = useCallback(async (id: string) => {
    const res = await fetch(`/api/photos/${id}?adminToken=${adminToken}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir foto");
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, [adminToken]);

  function openRevealModal() {
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    const d = new Date(revealAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setRevealInput(local);
    setShowRevealModal(true);
  }

  async function saveReveal() {
    if (!revealInput) return;
    setSavingReveal(true);
    setRevealError("");
    try {
      const newRevealAt = new Date(revealInput).toISOString();
      const res = await fetch(`/api/events/${event.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, revealAt: newRevealAt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar");
      }
      setRevealAt(newRevealAt);
      setRevealed(new Date() >= new Date(newRevealAt));
      setShowRevealModal(false);
    } catch (err) {
      setRevealError(err instanceof Error ? err.message : "Erro ao salvar. Verifique a conexão.");
    } finally {
      setSavingReveal(false);
    }
  }

  async function handleDeleteEvent() {
    setDeletingEvent(true);
    try {
      const res = await fetch(`/api/events/${event.slug}?adminToken=${adminToken}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir evento");
      router.push("/");
    } catch {
      setDeletingEvent(false);
      setShowDeleteEventModal(false);
    }
  }

  async function downloadAll() {
    if (photos.length === 0 || downloadingAll) return;
    setDownloadingAll(true);
    setDownloadProgress(0);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      await Promise.all(
        photos.map(async (photo, i) => {
          try {
            const res = await fetch(photo.url);
            const blob = await res.blob();
            const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
            const name = photo.guest_name
              ? `${String(i + 1).padStart(3, "0")}-${photo.guest_name}.${ext}`
              : `${String(i + 1).padStart(3, "0")}.${ext}`;
            zip.file(name, blob);
          } catch {
            // skip failed photo
          } finally {
            setDownloadProgress((p) => p + 1);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingAll(false);
      setDownloadProgress(0);
    }
  }

  const revealDate = format(new Date(revealAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <main className="min-h-screen pb-12">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt="Logo do evento"
              width={40}
              height={40}
              className="rounded-lg object-cover w-10 h-10 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Painel do organizador</p>
            <h1 className="text-xl font-semibold text-charcoal truncate">{event.name}</h1>
          </div>
          <button
            onClick={() => setShowDeleteEventModal(true)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
            aria-label="Excluir evento"
            title="Excluir evento"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <div className="text-xl mb-1">📷</div>
            <p className="text-sm font-semibold text-charcoal">{photos.length}</p>
            <p className="text-xs text-gray-400">Fotos</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <div className="text-xl mb-1">{revealed ? "✨" : "🔒"}</div>
            <p className="text-sm font-semibold text-charcoal">{revealed ? "Reveladas" : "Bloqueadas"}</p>
            <p className="text-xs text-gray-400">Status</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <div className="text-xl mb-1">⏰</div>
            <p className="text-xs font-semibold text-charcoal leading-tight">{revealDate}</p>
            <p className="text-xs text-gray-400 mb-1">Revelação</p>
            <button
              onClick={openRevealModal}
              className="inline-flex items-center gap-1 text-xs text-rose hover:underline"
            >
              <Pencil className="w-2.5 h-2.5" /> Alterar
            </button>
          </div>
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
            <code className="break-all text-amber-800">{adminUrl}</code>
          </p>
        </div>

        {/* Photos */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Images className="w-5 h-5 text-rose" />
            <h2 className="font-semibold text-charcoal">Álbum ({photos.length} fotos)</h2>
            {photos.length > 0 && (
              <>
                <span className="text-xs text-gray-400 ml-auto hidden sm:block">Passe o mouse para excluir</span>
                <button
                  onClick={downloadAll}
                  disabled={downloadingAll}
                  className="ml-auto sm:ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-rose text-white text-xs font-medium rounded-lg hover:bg-rose/90 transition disabled:opacity-60"
                  title="Baixar todas as fotos"
                >
                  {downloadingAll ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {downloadProgress}/{photos.length}
                    </>
                  ) : (
                    <>
                      <PackageOpen className="w-3.5 h-3.5" />
                      Baixar tudo
                    </>
                  )}
                </button>
              </>
            )}
          </div>
          <PhotoGrid photos={photos} revealed={true} onDelete={handleDeletePhoto} />
        </div>
      </div>

      {/* Edit Reveal Time Modal */}
      {showRevealModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !savingReveal && setShowRevealModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-charcoal mb-1">Alterar revelação</h3>
            <p className="text-sm text-gray-500 mb-4">Escolha a nova data e hora em que as fotos serão reveladas.</p>
            <input
              type="datetime-local"
              value={revealInput}
              onChange={(e) => { setRevealInput(e.target.value); setRevealError(""); }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-charcoal focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose transition mb-3"
            />
            {revealError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-3">{revealError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRevealModal(false)}
                disabled={savingReveal}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-charcoal text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveReveal}
                disabled={savingReveal || !revealInput}
                className="flex-1 py-2.5 rounded-xl bg-rose text-white text-sm font-medium hover:bg-rose/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingReveal ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {savingReveal ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Modal */}
      {showDeleteEventModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !deletingEvent && setShowDeleteEventModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-charcoal">Excluir evento?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Isso vai apagar <strong>permanentemente</strong> o evento <em>{event.name}</em> e todas as {photos.length} fotos. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteEventModal(false)}
                disabled={deletingEvent}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-charcoal text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deletingEvent}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingEvent ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deletingEvent ? "Excluindo..." : "Excluir tudo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

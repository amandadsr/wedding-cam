"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, FlipHorizontal, X, Check, Loader2, ImagePlus, Send } from "lucide-react";

interface CameraProps {
  eventId: string;
  guestName: string;
  onPhotoTaken: () => void;
}

interface PendingPhoto {
  file: File;
  previewUrl: string;
}

export default function CameraComponent({ eventId, guestName, onPhotoTaken }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<File | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [flash, setFlash] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [error, setError] = useState("");

  const startCamera = useCallback(async (facingMode: "user" | "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setHasCamera(true);
      setError("");
    } catch {
      setHasCamera(false);
      setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facing, startCamera]);

  function flipCamera() {
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facing === "user") {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0);
    } else {
      ctx.drawImage(video, 0, 0);
    }

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    galleryFileRef.current = null;
    setPreview(dataUrl);
  }

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("eventId", eventId);
    if (guestName) formData.append("guestName", guestName);
    const response = await fetch("/api/photos", { method: "POST", body: formData });
    if (!response.ok) throw new Error("Falha no upload");
  }

  function handleGallerySelect(e: React.ChangeEvent<HTMLInputElement>) {
    // Convert to Array BEFORE clearing (clearing resets the FileList)
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (fileList.length === 0) return;

    if (fileList.length === 1) {
      // Single file: show single preview/confirm flow
      galleryFileRef.current = fileList[0];
      setPreview(URL.createObjectURL(fileList[0]));
      return;
    }

    // Multiple files: show confirmation grid
    const pending: PendingPhoto[] = fileList.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingPhotos(pending);
  }

  function removePending(index: number) {
    setPendingPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      const next = prev.filter((_, i) => i !== index);
      // If only 1 left, switch to single preview flow
      if (next.length === 1) {
        galleryFileRef.current = next[0].file;
        setPreview(next[0].previewUrl);
        return [];
      }
      return next;
    });
  }

  function cancelPending() {
    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingPhotos([]);
  }

  async function confirmBatch() {
    if (pendingPhotos.length === 0) return;
    setUploading(true);
    setBatchProgress({ current: 0, total: pendingPhotos.length });
    setError("");

    let succeeded = 0;
    for (let i = 0; i < pendingPhotos.length; i++) {
      setBatchProgress({ current: i + 1, total: pendingPhotos.length });
      try {
        await uploadFile(pendingPhotos[i].file);
        succeeded++;
      } catch {
        // continue
      }
    }

    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingPhotos([]);
    setBatchProgress(null);
    setUploading(false);

    if (succeeded > 0) onPhotoTaken();
    if (succeeded < pendingPhotos.length) {
      setError(`${pendingPhotos.length - succeeded} foto(s) falharam no envio.`);
    }
  }

  async function confirmPhoto() {
    if (!preview) return;
    setUploading(true);
    try {
      let blob: Blob;
      let filename = "photo.jpg";
      if (galleryFileRef.current) {
        blob = galleryFileRef.current;
        filename = galleryFileRef.current.name;
      } else {
        const res = await fetch(preview);
        blob = await res.blob();
      }
      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("eventId", eventId);
      if (guestName) formData.append("guestName", guestName);
      const response = await fetch("/api/photos", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Falha no upload");
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      galleryFileRef.current = null;
      setPreview(null);
      onPhotoTaken();
    } catch {
      setError("Erro ao enviar foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function discardPhoto() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    galleryFileRef.current = null;
    setPreview(null);
  }

  // ── Multi-photo confirmation screen ───────────────────────────────────────
  if (pendingPhotos.length > 0) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-charcoal">
              {pendingPhotos.length} foto{pendingPhotos.length !== 1 ? "s" : ""} selecionada{pendingPhotos.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-rose hover:underline"
              disabled={uploading}
            >
              Adicionar mais
            </button>
          </div>

          {/* Thumbnail grid */}
          <div className="p-3 grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {pendingPhotos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePending(i)}
                  disabled={uploading}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition disabled:opacity-50"
                  aria-label="Remover foto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Progress bar during upload */}
          {batchProgress && (
            <div className="px-4 pb-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Enviando...</span>
                <span>{batchProgress.current} / {batchProgress.total}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose rounded-full transition-all duration-300"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 pb-4 pt-2 flex gap-3">
            <button
              onClick={cancelPending}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-charcoal text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmBatch}
              disabled={uploading || pendingPhotos.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-rose text-white text-sm font-medium hover:bg-rose/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {uploading ? "Enviando..." : `Enviar ${pendingPhotos.length} foto${pendingPhotos.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleGallerySelect}
        />

        {error && <p className="mt-2 text-xs text-red-500 text-center">{error}</p>}
      </div>
    );
  }

  // ── Camera / single preview ───────────────────────────────────────────────
  return (
    <div className="relative w-full max-w-md mx-auto">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGallerySelect}
      />

      {/* Camera viewfinder */}
      {!preview && (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
          {hasCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
              <Camera className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-300 text-sm">{error}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-white/20 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-white/30 transition"
              >
                <ImagePlus className="w-4 h-4" />
                Escolher da galeria
              </button>
            </div>
          )}

          {flash && <div className="absolute inset-0 bg-white animate-pulse" />}

          {hasCamera && (
            <>
              <div className="absolute top-4 right-4">
                <button
                  onClick={flipCamera}
                  className="p-2.5 bg-black/40 rounded-full text-white backdrop-blur-sm"
                  aria-label="Virar câmera"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-8">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-black/40 rounded-full text-white backdrop-blur-sm hover:bg-black/60 transition"
                  aria-label="Escolher da galeria"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <button
                  onClick={takePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-white/50 hover:scale-95 active:scale-90 transition-transform shadow-lg"
                  aria-label="Tirar foto"
                />
                <div className="w-11 h-11" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Single photo preview */}
      {preview && (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute bottom-6 inset-x-0 flex justify-center gap-8">
            <button
              onClick={discardPhoto}
              disabled={uploading}
              className="p-4 bg-black/50 rounded-full text-white backdrop-blur-sm hover:bg-black/70 transition disabled:opacity-50"
              aria-label="Descartar"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={confirmPhoto}
              disabled={uploading}
              className="p-4 bg-rose rounded-full text-white hover:bg-rose/90 transition disabled:opacity-50"
              aria-label="Enviar foto"
            >
              {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}

      {error && hasCamera && !preview && (
        <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}

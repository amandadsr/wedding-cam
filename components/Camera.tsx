"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, FlipHorizontal, X, Check, Loader2 } from "lucide-react";

interface CameraProps {
  eventId: string;
  guestName: string;
  onPhotoTaken: () => void;
}

export default function CameraComponent({ eventId, guestName, onPhotoTaken }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
      setError("");
    } catch {
      setHasCamera(false);
      setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
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
    setPreview(dataUrl);
  }

  async function confirmPhoto() {
    if (!preview) return;
    setUploading(true);

    try {
      const res = await fetch(preview);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append("file", blob, "photo.jpg");
      formData.append("eventId", eventId);
      if (guestName) formData.append("guestName", guestName);

      const response = await fetch("/api/photos", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Falha no upload");

      setPreview(null);
      onPhotoTaken();
    } catch {
      setError("Erro ao enviar foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function discardPhoto() {
    setPreview(null);
  }

  if (!hasCamera) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <Camera className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera viewfinder */}
      {!preview && (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`}
          />

          {/* Flash effect */}
          {flash && <div className="absolute inset-0 bg-white animate-pulse" />}

          {/* Top controls */}
          <div className="absolute top-4 right-4">
            <button
              onClick={flipCamera}
              className="p-2.5 bg-black/40 rounded-full text-white backdrop-blur-sm"
              aria-label="Virar câmera"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Shutter button */}
          <div className="absolute bottom-6 inset-x-0 flex justify-center">
            <button
              onClick={takePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/50 hover:scale-95 active:scale-90 transition-transform shadow-lg"
              aria-label="Tirar foto"
            />
          </div>
        </div>
      )}

      {/* Preview */}
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
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Check className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      )}

      {error && !preview && (
        <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}

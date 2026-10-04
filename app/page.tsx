"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Heart, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState("180");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), date, minutesUntilReveal: Number(minutes) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar evento");
      }

      const { slug, adminToken } = await res.json();
      router.push(`/${slug}/admin?token=${adminToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose rounded-full mb-4">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-charcoal mb-2">Wedding Cam</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Câmera descartável digital para o seu casamento.<br />
            Seus convidados escaneiam, fotografam, e as fotos são reveladas no final.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Nome do evento
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Casamento Amanda & Rafael"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-charcoal placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose transition"
                maxLength={60}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Data do casamento
              </label>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-charcoal focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Revelar fotos após quanto tempo?
              </label>
              <select
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-charcoal focus:outline-none focus:ring-2 focus:ring-rose/30 focus:border-rose transition"
              >
                <option value="10">10 minutos</option>
                <option value="60">1 hora</option>
                <option value="120">2 horas</option>
                <option value="180">3 horas (recomendado)</option>
                <option value="240">4 horas</option>
                <option value="360">6 horas</option>
                <option value="720">12 horas</option>
                <option value="1440">24 horas</option>
              </select>
              <p className="mt-1.5 text-xs text-gray-400">
                As fotos ficam bloqueadas até esse tempo após o início do evento
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !date}
              className="w-full py-3.5 px-6 bg-rose text-white font-medium rounded-xl hover:bg-rose/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Criando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Criar álbum
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "📷", label: "Câmera no browser", desc: "Sem instalar nada" },
            { icon: "🔒", label: "Fotos bloqueadas", desc: "Até a revelação" },
            { icon: "💌", label: "Álbum compartilhado", desc: "Todos os ângulos" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-xs font-medium text-charcoal">{item.label}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
          Feito com <Heart className="w-3 h-3 text-rose fill-rose" /> para momentos especiais
        </p>
      </div>
    </main>
  );
}

# Wedding Cam — Guia de Setup

## Como funciona

1. O casal cria um evento → recebe um QR code
2. O QR é impresso e colocado nos cones de pétalas / mesas
3. Convidados escaneiam → câmera abre direto no browser (sem instalar nada)
4. Fotos ficam bloqueadas até o timer zerar
5. Na revelação, todos veem o álbum completo em tempo real

---

## Passo 1 — Criar conta no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto (região São Paulo ou a mais próxima)
3. Aguarde o projeto inicializar (~2 min)

## Passo 2 — Configurar o banco

1. No painel do Supabase, vá em **SQL Editor**
2. Cole o conteúdo de `supabase-setup.sql` e execute
3. Vá em **Storage** → confirme que o bucket `photos` foi criado como público

## Passo 3 — Pegar as credenciais

No painel Supabase → **Settings** → **API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Passo 4 — Configurar variáveis de ambiente

Copie `env.example` para `.env.local` e preencha:

```bash
cp env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

> **Durante desenvolvimento:** `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Passo 5 — Rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000

## Passo 6 — Deploy na Vercel (gratuito)

```bash
npm install -g vercel
vercel
```

Ou conecte o repositório GitHub em [vercel.com](https://vercel.com) e configure as variáveis de ambiente no painel da Vercel.

---

## Estrutura do projeto

```
wedding-cam/
├── app/
│   ├── page.tsx              # Página inicial (criar evento)
│   ├── [slug]/
│   │   ├── page.tsx          # Página do evento (convidados)
│   │   ├── EventClient.tsx   # Câmera + álbum (client component)
│   │   └── admin/
│   │       ├── page.tsx      # Painel do organizador
│   │       └── AdminClient.tsx
│   └── api/
│       ├── events/route.ts   # POST /api/events
│       └── photos/route.ts   # POST /api/photos
├── components/
│   ├── Camera.tsx            # Câmera do browser
│   ├── PhotoGrid.tsx         # Grid de fotos (com lightbox)
│   └── RevealTimer.tsx       # Countdown para revelação
├── lib/
│   └── supabase.ts           # Cliente Supabase + tipos
└── supabase-setup.sql        # SQL para configurar o banco
```

## Personalização

- **Cores**: edite `tailwind.config.ts` (blush, rose, charcoal)
- **Tempo de revelação**: configurável na criação do evento (1–24h)
- **Nome dos convidados**: opcional, aparece nas fotos no hover

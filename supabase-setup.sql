-- Run this in the Supabase SQL Editor (supabase.com → seu projeto → SQL Editor)

-- 1. Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  reveal_at   TIMESTAMPTZ NOT NULL,
  admin_token TEXT NOT NULL,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de fotos
CREATE TABLE IF NOT EXISTS photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID REFERENCES events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  guest_name   TEXT,
  taken_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler eventos (para mostrar nome/reveal_at)
CREATE POLICY "events_select" ON events FOR SELECT USING (true);

-- Qualquer um pode criar eventos
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);

-- Qualquer um pode ler fotos
CREATE POLICY "photos_select" ON photos FOR SELECT USING (true);

-- Qualquer um pode inserir fotos
CREATE POLICY "photos_insert" ON photos FOR INSERT WITH CHECK (true);

-- 4. Realtime para fotos
ALTER PUBLICATION supabase_realtime ADD TABLE photos;

-- 5. Storage bucket (crie manualmente ou via SQL abaixo)
-- No painel Supabase: Storage → New bucket → nome "photos" → Public: SIM
-- OU via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy de upload para o bucket
CREATE POLICY "photos_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos');

-- Policy de leitura pública
CREATE POLICY "photos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Policy de exclusão (para admin deletar fotos/logos via API)
CREATE POLICY "photos_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos');

-- Policies de exclusão nas tabelas (admin verifica token na API)
CREATE POLICY "photos_delete" ON photos FOR DELETE USING (true);
CREATE POLICY "events_delete" ON events FOR DELETE USING (true);

-- Policy de atualização (para alterar reveal_at via API)
CREATE POLICY "events_update" ON events FOR UPDATE USING (true);

-- ============================================================
-- SE JÁ TEM O BANCO CRIADO, rode apenas estas linhas no SQL Editor:
-- ============================================================
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS logo_url TEXT;
--
-- CREATE POLICY "photos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'photos');
-- CREATE POLICY "photos_delete" ON photos FOR DELETE USING (true);
-- CREATE POLICY "events_delete" ON events FOR DELETE USING (true);
-- CREATE POLICY "events_update" ON events FOR UPDATE USING (true);
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE events;
-- ============================================================

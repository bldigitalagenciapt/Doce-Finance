-- 1. Adicionar novas colunas na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS brand_color TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Criar o bucket de armazenamento para as imagens do atelier (logos)
-- Nota: Isso requer as extensões do Supabase Storage ativas.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('atelier-images', 'atelier-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Configurar políticas de segurança (RLS) para o bucket 'atelier-images'

-- Permitir leitura pública das imagens
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'atelier-images' );

-- Permitir que usuários autenticados façam upload de suas próprias imagens
CREATE POLICY "Authed Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'atelier-images' );

-- Permitir que usuários autenticados deletem suas próprias imagens
CREATE POLICY "Authed Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id = 'atelier-images' );

# Gerenciador de Territórios da Congregação (Supabase Edition)

Este sistema utiliza o Supabase para Autenticação, Banco de Dados (PostgreSQL) e Armazenamento de Mapas.

## ⚠️ CORREÇÃO ESSENCIAL: Upload de Mapas Travado em "Carregando"

Se ao tentar carregar um novo mapa (PDF) o botão fica "Carregando..." indefinidamente, o problema é 100% relacionado às permissões de segurança do **Supabase Storage**. O seu usuário `admin` não tem permissão para **escrever** arquivos no bucket de mapas.

**Para corrigir definitivamente, execute o script SQL abaixo no seu painel do Supabase:**

### Instruções:
1.  Acesse o **SQL Editor** no seu projeto Supabase.
2.  Clique em **"New query"**.
3.  Copie o código abaixo, cole no editor e clique em **"RUN"**.

### Script de Correção do Storage:
```sql
-- Habilita a segurança em nível de linha para o Storage (seguro de rodar múltiplas vezes)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- POLÍTICA DE LEITURA: Permite que qualquer usuário logado VEJA e BAIXE os mapas.
DROP POLICY IF EXISTS "Authenticated users can view maps" ON storage.objects;
CREATE POLICY "Authenticated users can view maps"
ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'maps' );

-- POLÍTICA DE UPLOAD: Permite que APENAS administradores façam UPLOAD de novos mapas.
DROP POLICY IF EXISTS "Admins can upload maps" ON storage.objects;
CREATE POLICY "Admins can upload maps"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'maps' AND EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin') );

-- POLÍTICA DE ATUALIZAÇÃO: Permite que APENAS administradores ATUALIZEM mapas existentes.
DROP POLICY IF EXISTS "Admins can update maps" ON storage.objects;
CREATE POLICY "Admins can update maps"
ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'maps' AND EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin') );

-- POLÍTICA DE EXCLUSÃO: Permite que APENAS administradores DELETEM mapas.
DROP POLICY IF EXISTS "Admins can delete maps" ON storage.objects;
CREATE POLICY "Admins can delete maps"
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'maps' AND EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin') );

-- Para referência futura, este script completo também está salvo em `supabase/storage.sql`.
```
**Após executar este script, o upload funcionará imediatamente.**

---

## 🛠 Configuração Inicial do Banco de Dados

Se você ainda não configurou as tabelas, use este script:

```sql
-- Tabelas Principais
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'publicador' CHECK (role IN ('admin', 'publicador')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'disponivel',
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  assigned_to uuid REFERENCES public.users(auth_id) ON DELETE SET NULL,
  assigned_to_name text,
  assignment_date timestamptz,
  due_date timestamptz,
  history jsonb DEFAULT '[]'::jsonb,
  permanent_notes text
);

CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(auth_id) ON DELETE CASCADE,
  user_name text NOT NULL,
  request_date timestamptz DEFAULT now(),
  status text DEFAULT 'pendente'
);

-- Ativar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso a dados
CREATE POLICY "Qualquer autenticado vê perfis" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir criação de perfil no cadastro" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer autenticado vê territórios" ON public.territories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins gerenciam territórios" ON public.territories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Usuários criam solicitações" ON public.requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Leitura de solicitações" ON public.requests FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins deletam solicitações" ON public.requests FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
);
```

## 📂 Configuração do Storage (Bucket)

1. No Supabase, vá em **Storage**.
2. Crie um bucket chamado `maps`.
3. Deixe como **Public Bucket**.
4. **IMPORTANTE:** Não esqueça de rodar o SQL da seção "CORREÇÃO ESSENCIAL" acima.

## 🔑 Acesso Administrativo
O primeiro usuário a se cadastrar ou o e-mail **`admin@example.com`** terá permissões de Administrador.
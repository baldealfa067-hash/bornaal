

## Plano de Implementação — Funcionalidades antes de publicar

Vou implementar 5 funcionalidades em simultâneo. Os dados de exemplo e imagens existentes serão mantidos intactos.

---

### 1. Páginas "Sobre" e "Contacto"

Criar **`src/pages/About.tsx`** com:
- Secção "Sobre a plataforma" — missão, equipa, visão
- Secção "Contacto" — email, telefone, redes sociais
- Design consistente com o resto da app (max-w-lg, mesmo estilo)

### 2. Páginas "Termos de Uso" e "Política de Privacidade"

Criar **`src/pages/Terms.tsx`** e **`src/pages/Privacy.tsx`** com texto legal básico em português, adaptado à Guiné-Bissau. Páginas simples com texto formatado.

### 3. Pesquisa na Landing Page

Modificar **`src/pages/Landing.tsx`**:
- Adicionar barra de pesquisa no hero que redireciona para `/explorar?q=<termo>`
- Modificar **`src/pages/Explore.tsx`** para ler o parâmetro `q` da URL e preencher o campo de pesquisa automaticamente

### 4. Galeria de fotos dos trabalhos do prestador

**Migração SQL**: Criar tabela `portfolio_images` com colunas:
- `id` (uuid), `provider_id` (uuid → profiles.id), `image_url` (text), `caption` (text nullable), `created_at`
- RLS: SELECT público, INSERT/UPDATE/DELETE apenas pelo próprio provider (via profiles.user_id)

**Código**:
- Modificar **`src/pages/Profile.tsx`** para permitir upload de até 6 fotos de portfólio (usando o bucket `avatars` existente ou criando um novo bucket `portfolio`)
- Modificar **`src/pages/ProviderDetail.tsx`** para mostrar galeria de fotos em grid abaixo da descrição
- Criar hook **`src/hooks/usePortfolio.ts`**

### 5. Sistema de mensagens interno

**Migração SQL**: Criar tabela `messages` com:
- `id` (uuid), `sender_id` (uuid), `receiver_id` (uuid), `content` (text), `read` (boolean default false), `created_at`
- RLS: SELECT/INSERT apenas para sender ou receiver autenticados
- Habilitar realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages`

**Código**:
- Criar **`src/pages/Messages.tsx`** — lista de conversas + vista de conversa individual
- Criar **`src/hooks/useMessages.ts`** — queries e realtime subscription
- Adicionar ícone de mensagens no **`src/components/BottomNav.tsx`**
- Adicionar botão "Enviar mensagem" no **`src/pages/ProviderDetail.tsx`** ao lado do WhatsApp

### 6. Filtro por localização detalhado (bairro/zona)

Modificar **`src/pages/Explore.tsx`**:
- Adicionar dropdown/select de localização com zonas extraídas dos perfis existentes (Bissau, Bafatá, Gabú, etc.)
- Filtrar prestadores por localização seleccionada, combinável com categoria e pesquisa de texto

### 7. Routing e navegação

Actualizar **`src/App.tsx`**:
- Adicionar rotas: `/sobre`, `/termos`, `/privacidade`, `/mensagens`
- A rota `/mensagens` fica dentro do `<Layout>` (com BottomNav)
- As páginas legais ficam fora do Layout (sem BottomNav)

Actualizar **`src/pages/Landing.tsx`** footer:
- Adicionar links para Sobre, Termos, Privacidade

### Resumo de ficheiros

| Acção | Ficheiro |
|-------|---------|
| Criar | `src/pages/About.tsx` |
| Criar | `src/pages/Terms.tsx` |
| Criar | `src/pages/Privacy.tsx` |
| Criar | `src/pages/Messages.tsx` |
| Criar | `src/hooks/usePortfolio.ts` |
| Criar | `src/hooks/useMessages.ts` |
| Editar | `src/App.tsx` (novas rotas) |
| Editar | `src/pages/Landing.tsx` (pesquisa + links footer) |
| Editar | `src/pages/Explore.tsx` (param `q` + filtro localização) |
| Editar | `src/pages/Profile.tsx` (upload portfólio) |
| Editar | `src/pages/ProviderDetail.tsx` (galeria + botão mensagem) |
| Editar | `src/components/BottomNav.tsx` (ícone mensagens) |
| Migração | Tabela `portfolio_images` |
| Migração | Tabela `messages` + realtime |


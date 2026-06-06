## MVP simples — propostas de prestadores + cadastro visível

Foco: manter tudo funcional e simples agora. Confiança avançada (KYC, escrow, mediação, banimentos) fica para fases seguintes.

### 1. Tornar o cadastro de prestador visível

Hoje o acesso a "Entrar/Registar" está só num link discreto no rodapé da landing.

- Adicionar um botão **"Sou prestador — cadastrar"** bem visível:
  - No hero da `Landing.tsx` (já existe, melhorar contraste conforme `.lovable/plan.md`).
  - Um item fixo no `BottomNav` ou um botão no topo das páginas `Explorar` e `Pedidos` ("É prestador? Cadastre-se") que leva a `/login?tab=registar`.
- Em `Login.tsx`, suportar query param `?tab=registar` para abrir já no separador de registo.

### 2. Nova secção: Propostas dos prestadores

Conceito simples: além de clientes publicarem pedidos, **prestadores publicam ofertas/propostas** ("Faço instalação elétrica residencial — desde 15 000 CFA"). Qualquer visitante vê e contacta por WhatsApp.

#### Modelo de dados (nova tabela `proposals`)

Campos principais:
- `provider_id` (FK → profiles)
- `title` (ex: "Instalação elétrica residencial")
- `category`
- `description`
- `price` (CFA, valor fixo ou "a partir de")
- `price_type` ("fixo" | "desde")
- `location`
- `status` ("ativa" | "pausada")
- timestamps

RLS:
- Leitura pública (anon + authenticated) — qualquer visitante vê.
- INSERT/UPDATE/DELETE só pelo próprio prestador (`auth.uid() = provider_id`).
- Admin gere tudo.

#### UX na página `/pedidos`

Transformar em duas abas no topo:
- **Pedidos de clientes** (o que já existe).
- **Propostas de prestadores** (novo) — lista de cards mostrando: foto + nome do prestador, categoria, título, preço, localização, estrelas/avaliações, botão WhatsApp direto + link para o perfil.

Filtro simples por categoria (reutilizar `useCategories`).

#### UX no painel do prestador (`/painel`)

Nova secção **"As minhas propostas"**:
- Lista das suas propostas com editar / pausar / apagar.
- Botão **"Publicar nova proposta"** abre dialog com: título, categoria, descrição, preço, tipo de preço, localização.
- Validação com zod (mesmo padrão de `Requests.tsx`).

### 3. Pequenas melhorias de confiança (baratas, alto impacto)

Sem KYC/escrow ainda, mas dá para começar a transmitir confiança:
- Mostrar selo **"Perfil verificado"** quando admin marcar `is_verified = true` em `profiles` (campo booleano simples + toggle no `AdminDashboard`).
- Mostrar **número de avaliações e média** já em cada card de proposta (reutilizar lógica de `useProviders`).
- Rodapé com link "Como funciona" e "Segurança" (páginas estáticas curtas em português).

### O que fica para depois (não MVP)

- KYC com BI/NIF/selfie.
- Pagamentos em custódia (escrow).
- Sistema de notificações a prestadores quando há pedido novo na sua categoria.
- Chat interno + deteção de partilha de contactos.
- Mediação de disputas e banimentos automáticos.

### Detalhes técnicos

- 1 migração: cria `proposals`, GRANTs, RLS, trigger `updated_at`; adiciona `is_verified boolean default false` em `profiles`.
- Novo hook `useProposals.ts` (lista pública + mutações do prestador).
- `Requests.tsx` passa a usar `Tabs` (`@/components/ui/tabs`).
- `ProviderDashboard.tsx` ganha secção de propostas.
- `Landing.tsx` + `BottomNav` / topo das páginas: CTA visível de cadastro.
- Sem alterações no fluxo de contacto: continua via `wa.me`.

Confirma se avanço com este âmbito (ou diz-me o que cortar/adicionar) e eu implemento.
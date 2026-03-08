

# Nó Tarbadja — Marketplace de Serviços (Guinea-Bissau)

## Visão Geral
Plataforma mobile-first que conecta clientes a prestadores de serviços locais na Guiné-Bissau. Toda a interface em **Português**.

## Design & Tema
- Cores inspiradas na bandeira da Guiné-Bissau (verde, amarelo, vermelho, preto)
- Design mobile-first, limpo e moderno
- Navegação inferior com: Início, Explorar, Publicar, Perfil

## Páginas & Funcionalidades

### 1. Página Inicial
- Barra de pesquisa
- Categorias em destaque (ícones visuais)
- Prestadores em destaque
- Pedidos de serviço recentes

### 2. Autenticação (Supabase Auth)
- Registo/Login por email
- Escolha de tipo: **Cliente** ou **Prestador** (armazenado em tabela separada de perfis)

### 3. Perfil do Prestador
- Formulário: nome, categoria personalizada, telefone, localização, descrição, foto
- Página pública com botão de contacto via **WhatsApp**
- Avaliações e comentários visíveis

### 4. Explorar Prestadores
- Filtro por categoria e localização
- Cards com foto, nome, categoria, avaliação média
- Clique para ver perfil completo

### 5. Pedidos de Serviço (Clientes)
- Criar pedido: categoria, descrição, localização
- Lista de pedidos abertos visível para prestadores

### 6. Sistema de Avaliações
- Clientes podem avaliar prestadores (1-5 estrelas + comentário)
- Avaliação média exibida no card e perfil do prestador

## Base de Dados (Supabase)
- **profiles** — dados dos prestadores (nome, telefone, categoria, localização, descrição, foto)
- **service_requests** — pedidos dos clientes
- **reviews** — avaliações (user_id, provider_id, rating, comment)
- **user_roles** — tabela de roles (client/provider) com RLS seguro
- Storage bucket para fotos de perfil

## Segurança
- RLS em todas as tabelas
- Roles em tabela separada (nunca no perfil)
- Validação de inputs com Zod


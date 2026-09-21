# 📦 Sistema de Controle de Estoque - Vai Mais BG

Sistema completo de controle de estoque desenvolvido com **Next.js + Supabase**, com foco em controle de produtos, movimentações, compras e acompanhamento do estoque em tempo real.

O projeto foi desenvolvido para funcionar em **desktop e dispositivos móveis**, permitindo o gerenciamento do estoque através do navegador.

---

# 🚀 Tecnologias utilizadas

- Next.js
- React
- TypeScript
- Supabase
  - Authentication
  - Database
  - Row Level Security
- Tailwind CSS
- Vercel

---

# 📋 Funcionalidades

## 🔐 Autenticação

- Login de usuários
- Controle de acesso
- Sessão persistente
- Usuários vinculados ao sistema de estoque

---

# 📦 Produtos

- Cadastro de produtos
- Organização por categorias
- Controle de estoque mínimo
- Controle de estoque desejado
- Visualização do estoque atual
- Bloqueio de alteração manual do estoque atual

O estoque atual deve ser alterado somente através de movimentações.

---

# 🔄 Movimentações de estoque

Controle completo de:

## Entradas

- Produto
- Quantidade
- Observação
- Responsável autenticado
- Data e hora

## Saídas

- Produto
- Quantidade
- Observação obrigatória
- Responsável autenticado
- Validação para impedir saída maior que o estoque disponível

---

# 📊 Dashboard

Painel inicial com:

- Resumo do estoque
- Produtos com estoque baixo
- Organização por categorias
- Expansão de categorias mostrando produtos
- Acesso rápido aos produtos

---

# 🛒 Lista de compras

Sistema para auxiliar reposição de estoque:

- Sugestão de produtos abaixo do estoque mínimo
- Adição manual de produtos
- Alteração de quantidade desejada
- Remoção de produtos da lista
- Geração de pedido de compra

---

# 🧾 Pedido de compra

Recursos:

- Visualização dos produtos selecionados
- Quantidades para compra
- Geração de pedido formatado
- Copiar pedido para envio via WhatsApp

---

# 🗄️ Banco de dados

O projeto utiliza Supabase como banco principal.

Principais entidades:
# 📦 Sistema de Controle de Estoque - Vai Mais BG

Sistema completo de controle de estoque desenvolvido com **Next.js + Supabase**, com foco em controle de produtos, movimentações, compras e acompanhamento do estoque em tempo real.

O projeto foi desenvolvido para funcionar em **desktop e dispositivos móveis**, permitindo o gerenciamento do estoque através do navegador.

---

# 🚀 Tecnologias utilizadas

- Next.js
- React
- TypeScript
- Supabase
  - Authentication
  - Database
  - Row Level Security
- Tailwind CSS
- Vercel

---

# 📋 Funcionalidades

## 🔐 Autenticação

- Login de usuários
- Controle de acesso
- Sessão persistente
- Usuários vinculados ao sistema de estoque

---

# 📦 Produtos

- Cadastro de produtos
- Organização por categorias
- Controle de estoque mínimo
- Controle de estoque desejado
- Visualização do estoque atual
- Bloqueio de alteração manual do estoque atual

O estoque atual deve ser alterado somente através de movimentações.

---

# 🔄 Movimentações de estoque

Controle completo de:

## Entradas

- Produto
- Quantidade
- Observação
- Responsável autenticado
- Data e hora

## Saídas

- Produto
- Quantidade
- Observação obrigatória
- Responsável autenticado
- Validação para impedir saída maior que o estoque disponível

---

# 📊 Dashboard

Painel inicial com:

- Resumo do estoque
- Produtos com estoque baixo
- Organização por categorias
- Expansão de categorias mostrando produtos
- Acesso rápido aos produtos

---

# 🛒 Lista de compras

Sistema para auxiliar reposição de estoque:

- Sugestão de produtos abaixo do estoque mínimo
- Adição manual de produtos
- Alteração de quantidade desejada
- Remoção de produtos da lista
- Geração de pedido de compra

---

# 🧾 Pedido de compra

Recursos:

- Visualização dos produtos selecionados
- Quantidades para compra
- Geração de pedido formatado
- Copiar pedido para envio via WhatsApp

---

# 🗄️ Banco de dados

O projeto utiliza Supabase como banco principal.

Principais entidades:
products
categories
stock_users
stock_movements
pedidos_compra
itens_pedido_compra


O banco é independente da aplicação.

A aplicação pode ser migrada entre ambientes mantendo os mesmos dados.

---

# 🔧 Configuração do ambiente

Criar um arquivo:


.env.local


Com as variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SERVICE_ROLE_KEY=

⚠️ Nunca enviar o arquivo .env.local para o GitHub.

▶️ Executando localmente

Instalar dependências:

npm install

Executar:

npm run dev

Abrir:

http://localhost:3000
🌎 Deploy

O projeto pode ser hospedado na:

Vercel
Servidor próprio
Outras plataformas compatíveis com Next.js

As variáveis de ambiente devem ser configuradas no ambiente de hospedagem.

⚠️ Regras importantes do projeto

Antes de realizar alterações:

Não criar outro banco Supabase.
Não alterar tabelas sem necessidade.
Não apagar dados existentes.
Não modificar regras de estoque sem validação.
Não alterar movimentações antigas.
Manter compatibilidade com o banco existente.
🤖 Desenvolvimento com IA (v0)

Este projeto utiliza o v0 como ferramenta auxiliar de desenvolvimento.

Fluxo recomendado:

GitHub
   ↓
v0
   ↓
Alterações
   ↓
Commit
   ↓
GitHub

O GitHub é a fonte oficial do código.

📌 Histórico do projeto

Projeto iniciado como uma aplicação de controle de estoque utilizando:

Next.js
Supabase
Vercel/v0

Evoluído para um sistema completo com:

✅ Controle de produtos
✅ Controle de estoque
✅ Histórico de movimentações
✅ Dashboard
✅ Lista de compras
✅ Pedidos de compra

👨‍💻 Manutenção

Ao adicionar novas funcionalidades:

Criar uma cópia/branch.
Testar antes de publicar.
Nunca alterar o banco de produção diretamente.
Manter backup do Supabase.
Status do projeto

🟢 Sistema em desenvolvimento ativo


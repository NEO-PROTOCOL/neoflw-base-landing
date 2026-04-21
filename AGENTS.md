<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# TOKEN NEOFLW

```text
╔══════════════════════════════════════════════════════════════════╗
║   NEØ FLOWOFF · TOKEN PAGE · AGENTS                              ║
╠══════════════════════════════════════════════════════════════════╣
║   Status   ACTIVE                                                ║
║   Version  v1.1.0                                                ║
║   Repo     neoflw-token-page                                     ║
║   Parent   NEO-FlowOFF (workspace)                               ║
║   Updated  2026-04-18                                            ║
╚══════════════════════════════════════════════════════════════════╝
```

> **Stack:** Astro 5.18 · React 19.2 islands · OnchainKit 1.1 · Wagmi 2.19 · Viem 2.21
> **Chain:** Base Mainnet (`8453`)
> **Deploy:** Vercel (static + 1 serverless function)
> **Contract:** `0x41F4ff3d45DED9C1332e4908F637B75fe83F5d6B`

────────────────────────────────────────

## ⟠ Objetivo

Documento de contexto operacional para qualquer agente
(Cursor, Claude Code, Codex, Gemini, Copilot)
que abra este repositório.

Define stack, convenções, comandos, skills ativas e armadilhas conhecidas.

Antes de propor plano ou editar código, ler este arquivo
e o `NEXTSTEPS.md`.

────────────────────────────────────────

## ⌬ Manifests (source-of-truth)

Toda informação abaixo deriva destes arquivos.
Em caso de divergência, **o manifest vence**, não este AGENTS.

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ MANIFEST                     ┃ DECLARA                        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ package.json                 ┃ deps + scripts + overrides     ┃
┃ astro.config.mjs             ┃ output, integrations, vite     ┃
┃ tsconfig.json                ┃ strict + jsx react-jsx         ┃
┃ src/web3/wagmi.ts            ┃ chain + connectors             ┃
┃ src/web3/abi.ts              ┃ contract address + ABI         ┃
┃ .env.example                 ┃ contrato de variáveis          ┃
┃ skills-lock.json             ┃ skills versionadas             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

────────────────────────────────────────

## ⨷ Identidade do Repo

```text
┏━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ITEM             ┃ VALOR                                      ┃
┣━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Tipo             ┃ landing + mint app (estática)              ┃
┃ Framework        ┃ Astro 5 (output: 'static', format: 'file') ┃
┃ Islands          ┃ React 19 (apenas em src/components/web3/)  ┃
┃ Web3 client      ┃ OnchainKit + Wagmi v2 + Viem               ┃
┃ Wallets          ┃ Coinbase Smart Wallet (v4) + injected      ┃
┃ Connector pref   ┃ 'all' (EOA + Smart Wallet)                 ┃
┃ Gas              ┃ Paymaster sponsored mint (CDP)             ┃
┃ Pages (build)    ┃ 4 estáticas (EN + PT-BR × landing + mint)  ┃
┃ Functions        ┃ 1 serverless (api/track.mjs)               ┃
┃ i18n             ┃ EN (raiz) + PT-BR em /pt-br/               ┃
┃ Analytics        ┃ Turso (libsql) via /api/track              ┃
┃ Package manager  ┃ pnpm@10.33.0 (declarado no package.json)   ┃
┗━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

────────────────────────────────────────

## ⧉ Estrutura

```text
neoflw-token-page/
├── src/
│   ├── pages/                    # Astro routes (4 páginas)
│   │   ├── index.astro           # landing EN
│   │   ├── mint.astro            # mint EN
│   │   └── pt-br/
│   │       ├── index.astro       # landing PT-BR
│   │       └── mint.astro        # mint PT-BR
│   ├── components/
│   │   ├── Nav.astro             # top nav + hamburger
│   │   ├── Footer.astro
│   │   ├── HomePage.astro        # orchestrator (recebe `pt`)
│   │   ├── HeroSection.astro
│   │   ├── StatsBar.astro
│   │   ├── ChartSection.astro
│   │   ├── TokenomicsSection.astro
│   │   ├── ProofSection.astro
│   │   ├── VerifySection.astro   # 3D force graph + modal
│   │   └── web3/                 # React islands (client:only)
│   │       ├── Web3Providers.tsx
│   │       ├── NavConnect.tsx
│   │       └── MintCard.tsx
│   ├── web3/
│   │   ├── wagmi.ts              # createConfig singleton
│   │   └── abi.ts                # NEOFLW_ADDRESS + ABI mínima
│   ├── layouts/Layout.astro      # head + global CSS
│   └── assets/                   # neoflw.png · neoflw-mark.svg · frame
├── api/
│   └── track.mjs                 # Vercel function · Turso writer
├── contracts/                    # source-of-truth Solidity (legado)
├── public/                       # assets crus (favicons, og, base lockup)
├── docs/                         # MARKDOWN_STYLE_GUIDE + outros
├── .agents/skills/               # skills locais (gitignored)
├── .vscode/settings.json         # webhint OFF p/ JSX
├── .env.example                  # template de variáveis
├── astro.config.mjs              # React + Vite optimizeDeps + ssr.noExternal
├── tsconfig.json                 # extends astro/tsconfigs/strict
├── skills-lock.json              # hash das skills instaladas
└── package.json                  # pnpm.overrides: axios + yaml
```

────────────────────────────────────────

## ⧇ Comandos

```bash
# Desenvolvimento
pnpm install
pnpm dev                  # http://localhost:4321
pnpm build                # gera dist/ (4 páginas estáticas)
pnpm preview              # serve dist/

# Skills (agente)
npx skills list           # ver skills ativas
npx skills check          # ver updates disponíveis
npx skills update         # atualizar todas
npx skills find <termo>   # buscar nova skill

# Segurança
pnpm audit                # checar CVEs
pnpm outdated             # versões desatualizadas
```

────────────────────────────────────────

## ⍟ Variáveis de Ambiente

Template oficial: [`.env.example`](./.env.example).
Valores reais ficam em `.env` (gitignored)
e na Vercel (Production + Preview).

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ KEY                        ┃ ESCOPO   ┃ OBRIGATÓRIA            ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ PUBLIC_ONCHAINKIT_API_KEY  ┃ client   ┃ sim                    ┃
┃ PUBLIC_BASE_RPC_URL        ┃ client   ┃ não (default mainnet)  ┃
┃ PUBLIC_CONTRACT_ADDRESS    ┃ client   ┃ não (fallback no abi)  ┃
┃ PUBLIC_SITE_URL            ┃ client   ┃ sim (SEO/OG)           ┃
┃ PUBLIC_BASESCAN_URL        ┃ client   ┃ não (fallback)         ┃
┃ PUBLIC_BASE_APP_ID         ┃ client   ┃ não (Builder Rewards)  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ TURSO_DATABASE_URL         ┃ server   ┃ sim (analytics)        ┃
┃ TURSO_AUTH_TOKEN           ┃ server   ┃ sim (analytics)        ┃
┃ CDP_API_KEY_NAME           ┃ server   ┃ não (SDK não usado)    ┃
┃ CDP_API_KEY_PRIVATE_KEY    ┃ server   ┃ não (SDK não usado)    ┃
┃ BUILDER_CODE               ┃ server   ┃ não (pendente)         ┃
┃ BASE_PROJECT_ID            ┃ server   ┃ não (build info)       ┃
┃ BASE_BUILD_INFO_URL        ┃ server   ┃ não (build info)       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━┛
```

Regra de prefixo Astro:

- `PUBLIC_*` → exposto ao browser via `import.meta.env`
- demais → server-only (Vercel functions)

────────────────────────────────────────

## ◬ Convenções de Código

### Astro

- `output: 'static'` — não introduzir SSR sem decisão arquitetural
- `build.format: 'file'` — gera `mint.html` (não `mint/index.html`)
- Imagens via `astro:assets` `<Image>` (otimização automática via sharp)
- React islands apenas em `src/components/web3/` e `src/web3/`
- Diretiva preferida: `client:only="react"` (evita SSR de hooks Wagmi)

### React (islands)

- Hooks Wagmi v2 (`useAccount`, `useReadContract`, `useWriteContract`)
- Estado de wallet persistido pelo Wagmi (localStorage)
- `wagmiConfig` é singleton em `src/web3/wagmi.ts`
- Transações `payable`: `encodeFunctionData` + `Call[]`
  na prop `calls` do `<Transaction>`
- `ssr: false` no Wagmi config (consistente com `client:only`)

### CSS

- Sem framework (CSS puro em `<style>` por componente)
- Tema cyberpunk dark (variáveis em `Layout.astro`)
- Hard wrap mobile-first
- Breakpoints: 380px · 480px · 720px · 960px

### Solidity

- Source em `contracts/` (legado, não buildado pelo Astro)
- Herda OpenZeppelin (skill `setup-solidity-contracts`)
- Skill `solidity-security` antes de qualquer redeploy

────────────────────────────────────────

## ⨂ Skills Ativas

Instaladas em `.agents/skills/` (symlinks para `~/.agents/skills/`).
Versionadas em [`skills-lock.json`](./skills-lock.json).
Lidas por todos os agentes (Cursor, Claude Code, Codex, etc).

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━┓
┃ SKILL                        ┃ ORIGEM                ┃ USO            ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━┫
┃ astro                        ┃ astrolicious          ┃ Astro best     ┃
┃ vercel-react-best-practices  ┃ vercel-labs           ┃ React islands  ┃
┃ setup-solidity-contracts     ┃ openzeppelin          ┃ OZ patterns    ┃
┃ adding-builder-codes         ┃ base/skills           ┃ Builder Rewards┃
┃ building-with-base-account   ┃ base/skills           ┃ Smart Wallet   ┃
┃ deploying-contracts-on-base  ┃ base/skills           ┃ deploy flow    ┃
┃ migrating-an-onchainkit-app  ┃ base/skills           ┃ OnchainKit ops ┃
┃ registering-agent-base-dev   ┃ base/skills           ┃ Base agent reg ┃
┃ skill-creator                ┃ base/skills           ┃ criar skill    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━┛
```

Para invocar uma skill em conversa:

```md
"use a skill <nome> para <objetivo>"
```

────────────────────────────────────────

## ⧖ Armadilhas Conhecidas

### Webhint vs JSX

- Microsoft Edge Tools faz lint HTML em `.tsx`
- Resulta em falsos positivos `aria-expanded="{expression}"`
- **Correção aplicada:** `.vscode/settings.json` desliga webhint
- Não reverter sem alternativa

### Hidratação de Wagmi

- `eventemitter3` precisa estar em `vite.optimizeDeps.include`
- Já configurado em `astro.config.mjs`
- `@coinbase/onchainkit` listado em `ssr.noExternal` (Vite)
- Sintoma se quebrar: `NavConnect` não renderiza no client

### Connector preference

- `coinbaseWallet({ preference: 'all', version: '4' })`
- `injected({ shimDisconnect: true })` como fallback
- **Não trocar para `smartWalletOnly`** sem decisão de produto
- `'all'` mantém compatibilidade com EOA + Smart Wallet

### CVEs (pnpm overrides)

- `axios ^1.15.0` → patch SSRF + Cloud Metadata Exfil
  - cadeia: `wagmi → @base-org/account → @coinbase/cdp-sdk → axios`
- `yaml ^2.8.3` → patch RCE em parser
- Rodar `pnpm audit` ao adicionar deps web3

### Logo no nav

- PNG em `src/assets/neoflw.png` (não usar SVG no nav)
- SVG `neoflw-mark.svg` reservado para hero / OG
- Texto `<.nav-logo-text>` esconde abaixo de 380px

### Rotas PT-BR

- Pasta é `src/pages/pt-br/` (não `pt/`)
- URLs finais: `/pt-br/` e `/pt-br/mint`
- `HomePage.astro` recebe flag `pt` via `define:vars`

────────────────────────────────────────

## ⦿ Fluxo de Mint (resumo)

```text
┌──────────────────────────────────────────────────────────────────┐
│  user click "Mint"                                               │
│        │                                                         │
│        ▼                                                         │
│  [NavConnect] ───── conecta ───────► [Wagmi store]               │
│        │                                   │                     │
│        ▼                                   ▼                     │
│  [MintCard] ──── reads contract ────► [useReadContract]          │
│        │                                                         │
│        ▼                                                         │
│  [encodeFunctionData('publicMint') → Call[] com value]           │
│        │                                                         │
│        ▼                                                         │
│  [<Transaction calls={...} isSponsored>]                         │
│        │                                                         │
│        ▼                                                         │
│  [CDP Paymaster sponsors gas (Smart Wallet only)]                │
│        │                                                         │
│        ▼                                                         │
│  [onSuccess → refetch info + hasPublicMinted]                    │
└──────────────────────────────────────────────────────────────────┘
```

Contract entrypoints relevantes (ver `src/web3/abi.ts`):

- `getContractInfo() view` → supply, price, mintEnabled, bridge
- `publicMint() payable` → mint público
- `hasPublicMinted(address) view` → flag por wallet

────────────────────────────────────────

## ◮ Histórico Operacional

- Mudanças por sessão: [CHANGELOG](./CHANGELOG.md)
- Próximos passos planejados: [NEXTSTEPS](./NEXTSTEPS.md)
- Deploy: [DEPLOYMENT](./DEPLOYMENT.md)
- Build info Base: [BASE_BUILD_INFO](./BASE_BUILD_INFO.md)
- Estilo de docs: [MARKDOWN_STYLE_GUIDE](./docs/MARKDOWN_STYLE_GUIDE.md)

────────────────────────────────────────

## ⨀ Hard Rules

- Nunca commitar `.env`, `.env.local`, `.npmrc`
- Nunca expor `TURSO_AUTH_TOKEN` em código client
- Nunca trocar `output: 'static'` sem aprovação
- Nunca rodar `pnpm install` ignorando warnings de CVE
- Nunca remover `pnpm.overrides` sem auditoria nova
- Nunca commitar `.agents/` ou `.claude/skills/`
- Nunca usar emoji colorido em docs (ver MARKDOWN_STYLE_GUIDE)
- Nunca editar contratos sem rodar skill `solidity-security`
- URLs legadas `/pt-br/*`: a árvore `src/pages/pt-br/` pode estar ausente após migração; **não remover** os redirects 301 em `vercel.json` que preservam essas rotas (`/pt-br` → `/`, `/pt-br/mint` → `/mint`, etc.). Indexação antiga deve continuar a resolver.

────────────────────────────────────────

## ⍟ Fechamento

```text
▓▓▓ NEØ FLOWOFF · TOKEN PAGE
────────────────────────────────────────
Static onchain landing · Base Mainnet
Mint UX powered by OnchainKit + Smart Wallet
────────────────────────────────────────
```

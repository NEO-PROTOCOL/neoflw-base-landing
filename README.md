# NEØ FlowOFF — Token Page

![neoflw-token-page banner](./docs/assets/neoflw-token-page-banner.svg)

> **neoflw.xyz** · **neoflw.eth** · previews Vercel em `*.vercel.app` (não canónico)

Onchain landing + gasless mint page for the **NEOFLW** token on Base Mainnet.
Built as an Astro static site with React islands for wallet/mint interactions.

---

## ✨ Highlights

- **Astro 5 (static output)** — sub-second TTFB, zero runtime overhead on the landing
- **OnchainKit + Wagmi + Viem** for wallet connection and onchain reads/writes
- **Coinbase Smart Wallet (Base Account)** with EIP-4337 + passkey support
- **Gasless minting** via CDP **Paymaster** (sponsored UserOperations)
- **3D contract graph** (`3d-force-graph` + Three.js) on the Verify section
- **Bilingual** — English (`/`) and Portuguese (`/pt-br/`)
- **Mobile-first** — hamburger nav, fullscreen modals, responsive `<dialog>` UI
- **Wallet analytics** persisted in **Turso** (libsql) via `/api/track`

---

## 🪙 Token Info

| Field | Value |
| --- | --- |
| **Name** | NEØ FlowOFF |
| **Symbol** | NEOFLW |
| **Network** | Base Mainnet (chain `8453`) |
| **Contract** | [`0x41F4ff3d45DED9C1332e4908F637B75fe83F5d6B`](https://basescan.org/token/0x41f4ff3d45ded9c1332e4908f637b75fe83f5d6b) |
| **Max supply** | 1,000,000,000 NEOFLW (hard cap) |
| **Standards** | ERC-20 · ERC20Burnable · ERC20Permit (EIP-2612) · Ownable2Step |
| **Status** | ✅ Verified on Basescan |

---

## 🧱 Stack

| Layer | Tooling |
| --- | --- |
| Framework | [Astro 5](https://astro.build) (`output: 'static'`) |
| UI islands | React 19 (`@astrojs/react`) |
| Onchain | `@coinbase/onchainkit` · `wagmi@^2.19` · `viem@^2.21` · `@tanstack/react-query` |
| 3D graph | `3d-force-graph` · `three@^0.184` |
| Images | `astro:assets` (sharp, AVIF/WebP) |
| Storage | Turso (libsql) — wallet tracking |
| Hosting | Vercel (static + serverless `/api/track`) |
| Package mgr | pnpm 10 |

---

## 📁 Project structure

```text
src/
├── assets/                 # Images optimized at build (PNGs, logos)
├── components/
│   ├── HomePage.astro      # Master layout for / and /pt-br/
│   ├── Nav.astro           # Navigation + mobile hamburger
│   ├── HeroSection.astro
│   ├── ProofSection.astro
│   ├── StatsBar.astro
│   ├── TokenomicsSection.astro
│   ├── ChartSection.astro
│   ├── VerifySection.astro # Contract modal + 3D force graph
│   ├── Footer.astro
│   └── web3/               # React islands (client:only)
│       ├── Web3Providers.tsx  # Wagmi + OnchainKit + React Query
│       ├── NavConnect.tsx     # Wallet button + custom dropdown
│       └── MintCard.tsx       # Mint UI with sponsored tx
├── layouts/
│   └── Layout.astro
├── pages/
│   ├── index.astro         # EN home
│   ├── mint.astro          # EN mint page
│   └── pt-br/
│       ├── index.astro     # PT-BR home
│       └── mint.astro      # PT-BR mint page
└── web3/
    ├── wagmi.ts            # Wagmi config (Base + connectors)
    └── abi.ts              # Contract address + ABI + chain constants
```

---

## 🚀 Quick start

```bash
# Install
pnpm install

# Dev server (http://localhost:4321)
pnpm dev

# Type-check + production build
pnpm build

# Preview the production build locally
pnpm preview
```

Available scripts (see `package.json`):

| Script | Action |
| --- | --- |
| `pnpm dev` | Astro dev server with HMR |
| `pnpm build` | Static build to `dist/` |
| `pnpm preview` | Serve `dist/` locally |
| `pnpm astro` | Run any `astro` CLI command |
| `pnpm lint:md` | Validate Markdown (`docs/MARKDOWN_STYLE_GUIDE.md`, `.markdownlint.json`) |

---

## 🔐 Environment variables

Create `.env` (local) and mirror in **Vercel → Project → Environment Variables** for production.

> Variables prefixed with `PUBLIC_` are exposed to the browser via `import.meta.env`.
> Anything else stays server-side only (used by `/api/*` serverless functions).

### Required (client)

| Variable | Purpose |
| --- | --- |
| `PUBLIC_ONCHAINKIT_API_KEY` | CDP API key — also used to derive the Paymaster URL |
| `PUBLIC_BASE_RPC_URL` | Base RPC endpoint (CDP RPC recommended for higher limits) |
| `PUBLIC_CONTRACT_ADDRESS` | NEOFLW contract address |
| `PUBLIC_BASESCAN_URL` | Basescan token URL |
| `PUBLIC_SITE_URL` | Public site URL (used in OG / canonical) |

### Optional (server / integrations)

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | libsql connection for wallet analytics |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `CDP_API_KEY_NAME` | Coinbase Developer Platform — Secret API key name |
| `CDP_API_KEY_PRIVATE_KEY` | CDP private key (PEM) |
| `PUBLIC_BASE_APP_ID` | Base.dev App ID for Builder Rewards attribution |
| `BUILDER_CODE` | Builder code for incentive programs |

⚠️ **Never commit `.env`** — it is git-ignored. Use `.env.example` as a template if needed.

---

## ⚡ Gasless mint (Paymaster)

The `MintCard` component uses OnchainKit's `<Transaction isSponsored />` together with the Paymaster URL
derived from `PUBLIC_ONCHAINKIT_API_KEY` (`Web3Providers.tsx`).

When a Coinbase Smart Wallet is connected, the mint UserOperation is paid by CDP — the user signs but **does not
pay gas**. Externally Owned Accounts (EOAs from MetaMask, etc.) fall back to standard ETH gas.

To configure the policy: **CDP Dashboard → Paymaster → Base Mainnet → add the contract address as an allowed
recipient**.

---

## 🌐 i18n

Routing is done by directory:

- `/` and `/mint` → English (`locale: 'en'`)
- `/pt-br/` and `/pt-br/mint` → Portuguese (`locale: 'pt-BR'`)

Each `Section` component receives `locale` as a prop and switches strings inline. The `Nav` component exposes a
language toggle (PT ↔ EN).

---

## 🛰️ Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Vercel + ENS playbook.

TL;DR — push to `main`, Vercel auto-deploys. ENS `neoflw.eth` resolves through `.eth.limo` gateways.

---

## 🔗 Links

- 🌐 Website: <https://neoflw.xyz>
- 🐦 Twitter / X: <https://x.com/neoflow_on_chain>
- 🔍 Basescan: <https://basescan.org/token/0x41f4ff3d45ded9c1332e4908f637b75fe83f5d6b>
- 💱 Uniswap:
  <https://app.uniswap.org/swap?outputCurrency=0x41f4ff3d45ded9c1332e4908f637b75fe83f5d6b>
- 🏗️ Base.dev: configured via `PUBLIC_BASE_APP_ID`

---

## 📄 License

MIT © NEØ Protocol — Built for the Base ecosystem.

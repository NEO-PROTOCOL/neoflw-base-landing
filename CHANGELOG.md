<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

```text
========================================
   NEØ FLOWOFF · TOKEN PAGE · CHANGELOG
========================================
Status: ACTIVE
Format: Keep a Changelog (adapted)
========================================
```

> Registro cronológico de mudanças operacionais.
> Entradas mais recentes no topo.
> Datas em UTC.

────────────────────────────────────────

## ⨂ 2026-04-18 · Skills + A11y + Editor

### Adicionado

- `AGENTS.md` na raiz do repo (este arquivo + AGENTS.md).
- `.vscode/settings.json` desligando webhint do Edge Tools
  para evitar falsos positivos em JSX.
- Skills oficiais instaladas em `.agents/skills/`
  (fonte-de-verdade: [`skills-lock.json`](../skills-lock.json)):
  ```text
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ┃ astro                          (astrolicious)
  ┃ vercel-react-best-practices    (vercel-labs)
  ┃ setup-solidity-contracts       (openzeppelin)
  ┃ adding-builder-codes           (base/skills)
  ┃ building-with-base-account     (base/skills)
  ┃ deploying-contracts-on-base    (base/skills)
  ┃ migrating-an-onchainkit-app    (base/skills)
  ┃ registering-agent-base-dev     (base/skills)
  ┃ skill-creator                  (base/skills)
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```

### Corrigido

- ARIA roles em `NavConnect.tsx`:
  - `aria-expanded={open}` → `aria-expanded={open ? 'true' : 'false'}`
  - adicionado `aria-haspopup="menu"` aos botões de toggle
  - adicionado `role="menuitem"` em todos os filhos de `role="menu"`
  - adicionado `role="presentation"` no header não-interativo
  - adicionado `aria-label` descritivo nos containers `role="menu"`

### Modificado

- `.gitignore` agora ignora `.agents/` e `.claude/skills/`
  (skills são instalação local).

### Justificativa

Webhint do Microsoft Edge Tools parseia `.tsx` como HTML estático
e não avalia expressões JSX, gerando falso positivo
`Invalid ARIA attribute value: aria-expanded="{expression}"`.
Build passa, runtime gera atributos válidos.
Solução: desligar webhint via workspace settings.

Skills cobrem o stack completo do projeto:
Astro, React islands, OnchainKit, Smart Wallet, Builder Rewards,
deploy de contratos Base, OZ patterns.

────────────────────────────────────────

## ⨂ 2026-04-17 · Web3 Stack Migration

### Adicionado

- `@coinbase/onchainkit`, `wagmi@^2.16`, `viem@^2.21`,
  `@tanstack/react-query`, `@astrojs/react`.
- `eventemitter3` como dep direta + em `optimizeDeps.include`.
- `3d-force-graph` + `three` + `@types/three` para gráfico 3D.
- `tsconfig.json` (jsx: react-jsx).
- `src/web3/wagmi.ts` (config singleton, preference: 'all').
- `src/web3/abi.ts` (NEOFLW_ADDRESS + ABI mínima).
- `src/components/web3/Web3Providers.tsx` (OnchainKit + Wagmi + RQ).
- `src/components/web3/NavConnect.tsx` (custom dropdown).
- `src/components/web3/MintCard.tsx` (Transaction + isSponsored).
- `.env.example` template completo.
- `pnpm.overrides`: `axios: ^1.15.0` (CVE patch).

### Modificado

- `astro.config.mjs`: integração React + `optimizeDeps.include`.
- `src/pages/mint.astro`: removido ethers.js CDN, integrado MintCard.
- `src/components/Nav.astro`: hamburger menu + logo PNG + NavConnect.
- `src/components/HeroSection.astro`: SVG → PNG.
- `src/components/ChartSection.astro`: SVG → PNG.
- `src/components/HomePage.astro`: passa `pt` via `define:vars`,
  Rainbow icon URL atualizada.
- `src/components/VerifySection.astro`: link Basescan → modal `<dialog>`,
  code preview → 3D force graph (lazy via IntersectionObserver).
- `src/layouts/Layout.astro`: CSS dropdown, hamburger, modal,
  3D graph, breakpoints mobile.
- `README.md`: rewrite completo refletindo novo stack.
- `.gitignore`: adicionado `.npmrc`.

### Corrigido

- `pt is not defined` em `HomePage.astro`.
- Hidratação NavConnect (eventemitter3 missing em optimizeDeps).
- A11y: hamburger label sem texto visível.
- Rainbow icon 401 (URL antiga deprecated).
- Wagmi version mismatch (3.6.3 vs requerido ^2.16).
- Transaction component para função payable
  (encodeFunctionData + Call[] com value).

### Segurança

- Axios SSRF + Cloud Metadata Exfil (moderate)
  via override `^1.15.0`.

────────────────────────────────────────

## ⍟ Fechamento

```text
▓▓▓ NEØ FLOWOFF · CHANGELOG
────────────────────────────────────────
Cronologia operacional · ordem reversa
────────────────────────────────────────
```

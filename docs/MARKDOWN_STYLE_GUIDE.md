# Markdown Style Guide (Seed)

Este guia existe para ser adotado como fonte canônica do novo workspace.
Ele é propositalmente curto no seed.

## Regras

- Use títulos curtos e objetivos.
- Prefira listas quando houver enumeração real.
- Evite texto vago, placeholders soltos e narrativas que não refletem execução.
- Documentos estruturais devem refletir manifests, não inventar segunda realidade.

## Placeholders

- `__FILL__` deve ser substituído por valores finais antes de publicar.

## Verificação automática (markdownlint)

Na raiz deste repositório existe **`.markdownlint.json`** com o perfil abaixo. Rode **`pnpm lint:md`**
(localmente ou no CI) para validar.

Perfil para documentos longos e históricos:

- Comprimento de linha **120** (`MD013`).
- Tolerância a HTML inline (`MD033` desligada) e a comentários `<!-- markdownlint-disable -->`.
- Títulos duplicados permitidos em changelogs (`MD024` desligada).
- URLs “nuas” permitidas onde fizer sentido (`MD034` desligada); prefira `<https://…>` em texto corrido se
  quiser silêncio estrito.
- Estilo de pipes em tabelas não forçado (`MD060` desligada); mantenha pipes com espaços por legibilidade.
- Blocos de código sem linguagem: use ` ```text ` para diagramas ASCII (evita ruído de `MD040` onde não couber
  linguagem real).

Regras que valem manter **ativas** no hábito de escrita:

**MD031** (linha em branco antes/depois de fences ` ``` `),
**MD032** (linha em branco em torno de listas),
consistência de marcadores de lista (`-` em todos os níveis).

Instalação (já refletida em `package.json`):

- `pnpm add -D markdownlint-cli2`
- script `lint:md` ignora `node_modules`, `.pnpm`, `.agents/` e `.claude/` (skills vendorizadas).

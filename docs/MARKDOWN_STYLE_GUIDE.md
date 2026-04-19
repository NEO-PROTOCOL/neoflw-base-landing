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

## Verificação automática (markdownlint) — recomendação

Este repo **ainda não** versiona um `.markdownlint.json` próprio. A configuração
abaixo é a referência sugerida para quando o lint de markdown for ativado —
copie para a raiz como `.markdownlint.json` quando quiser adotá-lo.

Perfil recomendado para documentos longos e históricos:

- Comprimento de linha 120 (`MD013: { line_length: 120 }`).
- Tolerância a HTML inline e a comentários `<!-- markdownlint-disable -->`.
- Títulos duplicados e hierarquia não estrita permitidos em roadmaps/changelogs.
- Blocos de código sem linguagem permitidos (diagramas ASCII em `text`).

Regras que valem manter **ativas** no hábito de escrita:
**MD031** (linha em branco antes/depois de fences ` ``` `),
**MD032** (linha em branco em torno de listas),
consistência de marcadores de lista (`-` em todos os níveis).

Quando for ativar de fato, instale com `pnpm add -D markdownlint-cli2` e
adicione um script `lint:md` excluindo `node_modules`, `.pnpm` e pastas
históricas (`docs/archive`, etc.), alinhado ao check local e ao CI.


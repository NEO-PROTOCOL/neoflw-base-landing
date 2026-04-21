# neoflw-token-page — atalhos para o workflow Astro (pnpm)
# Uso: make | make help

.DEFAULT_GOAL := help

.PHONY: help install install-frozen dev build preview check audit clean commit

PNPM         := pnpm
BRANCH       ?= main
AUDIT_CMD    := $(PNPM) audit --audit-level=moderate --ignore-registry-errors

help:
	@echo "neoflw-token-page — comandos make"
	@echo ""
	@echo "  make install         Instala dependências (pnpm install)"
	@echo "  make install-frozen  Instala com lockfile imutável (CI / reprodutível)"
	@echo "  make dev             Servidor de desenvolvimento (astro dev)"
	@echo "  make build           Build de produção → dist/"
	@echo "  make preview         Pré-visualiza o build (após make build)"
	@echo "  make check           astro check (TypeScript + componentes)"
	@echo "  make audit           Auditoria de dependências (pnpm audit)"
	@echo "  make clean           Remove dist/ e .astro/ (build + cache de tipos)"
	@echo "  make commit          Fluxo interativo: audit → add → commit → push"
	@echo ""

install:
	$(PNPM) install

install-frozen:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) dev

build:
	$(PNPM) run build

preview:
	$(PNPM) run preview

check:
	$(PNPM) exec astro check

audit:
	@echo "Auditoria de dependências (moderate+)…"
	@$(AUDIT_CMD)

clean:
	rm -rf dist .astro
	@echo "Removidos dist/ e .astro/"

commit:
	@echo "Fluxo de commit (audit + git). Branch remota: $(BRANCH)"
	@$(AUDIT_CMD)
	@git status
	@echo "Tipo de commit (feat, fix, docs, style, refactor, chore):"
	@read type; \
	echo "Mensagem:"; \
	read msg; \
	git add -A; \
	git commit -m "$$type: $$msg"; \
	git push origin $(BRANCH)
	@echo "Commit e push concluídos."

# Lab-FON-UFRJ Website

Website institucional do Laboratório de Fonética da Faculdade de Letras da Universidade Federal do Rio de Janeiro (UFRJ).

## 📋 Visão Geral

Este projeto implementa um website modular e escalável utilizando arquitetura baseada em adaptadores, seguindo as melhores práticas de desenvolvimento web moderno com JavaScript vanilla, Vite e Vitest.

## 🎯 Status do Projeto

**Fase Atual:** Walking Skeleton Completo ✅

- ✅ Infraestrutura básica configurada (Vite, Vitest, ESLint, Prettier)
- ✅ Arquitetura modular implementada (Adapter Pattern, Template Method)
- ✅ Fatia funcional completa (seção Pesquisadores)
- ✅ Suite de testes unitários (39 testes, 100% passing)
- ✅ Documentação abrangente
- 🚧 Seções adicionais pendentes (Trabalhos, Parcerias, Contato)

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm 9+

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/Wisleyv/lab-fon-ufrj.git
cd lab-fon-ufrj

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O site estará disponível em `http://localhost:3000`

### Comandos Disponíveis

| Comando                 | Descrição                                  |
| ----------------------- | ------------------------------------------ |
| `npm run dev`           | Inicia servidor de desenvolvimento com HMR |
| `npm run build`         | Gera build de produção otimizado           |
| `npm run preview`       | Preview do build de produção               |
| `npm test`              | Executa testes em modo watch               |
| `npm run test:ui`       | Interface visual para testes               |
| `npm run test:coverage` | Relatório de cobertura de testes           |
| `npm run lint`          | Verifica qualidade do código               |
| `npm run format`        | Formata código com Prettier                |

## 📁 Estrutura do Projeto

```
lab-fon-ufrj/
├── src/
│   ├── js/
│   │   ├── adapters/          # Adaptadores de fonte de dados
│   │   │   ├── DataAdapter.js      # Classe abstrata base
│   │   │   └── JSONAdapter.js      # Implementação JSON
│   │   ├── modules/           # Módulos core
│   │   │   └── renderer.js         # Base para renderização
│   │   ├── sections/          # Renderizadores de seções
│   │   │   └── pesquisadores.js    # Seção pesquisadores
│   │   ├── utils/             # Utilitários
│   │   │   ├── helpers.js          # Funções auxiliares
│   │   │   └── sanitizer.js        # Proteção XSS
│   │   └── main.js            # Entry point
│   ├── css/
│   │   ├── main.css           # Estilos principais
│   │   └── components/        # (Futuro) Componentes CSS
│   ├── assets/
│   │   ├── images/            # Imagens do site
│   │   └── papers/            # (Futuro) PDFs de publicações
│   └── data.json              # Dados de conteúdo
├── tests/
│   ├── unit/                  # Testes unitários
│   │   ├── helpers.test.js
│   │   └── sanitizer.test.js
│   ├── e2e/                   # (Futuro) Testes E2E
│   └── visual/                # (Futuro) Testes visuais
├── docs/                      # Documentação adicional
├── index.html                 # HTML principal
├── vite.config.js            # Configuração Vite
└── package.json              # Dependências e scripts
```

## 🏗️ Arquitetura

### Padrões de Design Implementados

1. **Adapter Pattern**: Abstração de fontes de dados
   - `DataAdapter`: Interface comum para todas as fontes
   - `JSONAdapter`: Implementação para arquivos JSON locais
   - `WordPressAdapter`: (Planejado) Integração com WordPress REST API

2. **Template Method Pattern**: Renderização padronizada
   - `SectionRenderer`: Classe base com lifecycle
   - Métodos: `fetchData()`, `template()`, `afterRender()`
   - Estados: loading, error, empty, success

3. **Dependency Injection**: Configuração flexível
   - Adaptadores injetados nos renderizadores
   - Facilita testes e manutenibilidade

### Segurança

- **XSS Protection**: `HTMLSanitizer` utility
  - Escaping de HTML
  - Filtragem de tags/atributos
  - Validação de URLs

### Acessibilidade (WCAG 2.1 AA)

- HTML semântico (landmarks, headings)
- Atributos ARIA apropriados
- Navegação por teclado
- Skip links
- Contraste de cores adequado

## 🧪 Testes

### Cobertura Atual

- **39 testes unitários** (100% passing)
  - `sanitizer.test.js`: 22 testes de segurança
  - `helpers.test.js`: 17 testes de utilitários

### Executar Testes

```bash
# Modo watch (recomendado para desenvolvimento)
npm test

# Execução única
npm test -- --run

# Com relatório detalhado
npm test -- --run --reporter=verbose

# Interface visual
npm run test:ui

# Com cobertura
npm run test:coverage
```

## 📚 Documentação

O projeto possui documentação abrangente em múltiplos arquivos:

### Documentos Principais

| Documento                                                                                                                        | Descrição                                      | Status        |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------- |
| [EVALUATION_Architecture_and_Best_Practices.md](./EVALUATION_Architecture_and_Best_Practices.md)                                 | Avaliação técnica completa do projeto original | ✅ Completo   |
| [WALKING_SKELETON_README.md](./WALKING_SKELETON_README.md)                                                                       | Documentação técnica da implementação atual    | ✅ Completo   |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)                                                                         | Sumário executivo da implementação             | ✅ Completo   |
| [GIT_WORKFLOW_GUIDE.md](./GIT_WORKFLOW_GUIDE.md)                                                                                 | Guia de fluxo de trabalho Git                  | ✅ Completo   |
| [Algoritmo+Projeto_Modular_Website_Institucional_vCombinada.md](./Algoritmo+Projeto_Modular_Website_Institucional_vCombinada.md) | Proposta original do projeto                   | ✅ Referência |

### Conteúdo por Documento

**EVALUATION_Architecture_and_Best_Practices.md**

- Análise arquitetural detalhada
- Recomendações de segurança e performance
- Estratégias de testes e acessibilidade
- Roadmap de implementação em 3 fases

**WALKING_SKELETON_README.md**

- Decisões arquiteturais com justificativas
- Estrutura de diretórios explicada
- Descrição de cada componente core
- Exemplos de uso e extensão

**IMPLEMENTATION_SUMMARY.md**

- Visão executiva do que foi implementado
- Métricas e validações
- Próximos passos priorizados
- Guia de desenvolvimento futuro

**GIT_WORKFLOW_GUIDE.md**

- Workflow completo Git/GitHub/Codespaces
- Comandos essenciais do dia-a-dia
- Solução de problemas comuns
- Checklists diários

## 🗺️ Roadmap

### Phase 1: Completar Website Básico (Alta Prioridade)

- [ ] Implementar TrabalhosSection (publicações)
- [ ] Implementar ParceriasSection (parceiros)
- [ ] Adicionar formulário de contato
- [ ] Implementar navegação funcional
- [ ] Adicionar Service Worker (suporte offline)

**Estimativa:** ~20 horas

### Phase 2: Funcionalidades Avançadas (Média Prioridade)

- [ ] Criar WordPressAdapter (demonstrar flexibilidade)
- [ ] Implementar busca/filtros
- [ ] Adicionar paginação
- [ ] Otimização de performance
- [ ] Testes E2E com Playwright

**Estimativa:** ~32 horas

### Phase 3: Aprimoramentos (Baixa Prioridade)

- [ ] Recursos PWA completos
- [ ] Integração com Analytics
- [ ] Internacionalização (PT/EN)
- [ ] Painel administrativo

**Estimativa:** TBD

## 🤝 Contribuindo

Este é um projeto acadêmico do Laboratório de Fonética da UFRJ. Para contribuir:

1. Leia a documentação completa (especialmente WALKING_SKELETON_README.md)
2. Siga o workflow Git documentado em GIT_WORKFLOW_GUIDE.md
3. Mantenha os testes passando (`npm test`)
4. Siga os padrões de código (ESLint + Prettier)
5. Documente decisões arquiteturais significativas

## 📄 Licença

MIT License - veja arquivo LICENSE para detalhes.

## 👥 Equipe

**Laboratório de Fonética - UFRJ**  
Faculdade de Letras  
Universidade Federal do Rio de Janeiro

---

## 📝 Notas de Desenvolvimento

### Decisões Arquiteturais Importantes

1. **Por que Vanilla JS?**
   - Reduz complexidade e dependências
   - Melhor performance inicial
   - Facilita manutenção de longo prazo
   - Educacional para equipe

2. **Por que Adapter Pattern?**
   - Permite migração futura para WordPress
   - Facilita testes (mock de dados)
   - Separa lógica de apresentação e dados

3. **Por que Vite?**
   - Build extremamente rápido
   - HMR instantâneo
   - Suporte nativo a ES modules
   - Zero configuração inicial

### Convenções de Código

- **Nomes de arquivos**: camelCase para JS, kebab-case para CSS
- **Classes**: PascalCase
- **Funções/variáveis**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Commits**: Conventional Commits (feat:, fix:, docs:, etc.)

### Troubleshooting

**Problema: Testes falhando**

```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm test
```

**Problema: Servidor não inicia**

```bash
# Verificar porta 3000 disponível
lsof -ti:3000 | xargs kill -9
npm run dev
```

**Problema: Git sync issues**

- Consulte [GIT_WORKFLOW_GUIDE.md](./GIT_WORKFLOW_GUIDE.md)

---

**Última atualização:** 11 de Outubro, 2025  
**Versão:** 1.0.0 (Walking Skeleton)  
**Status:** ✅ Pronto para desenvolvimento incremental

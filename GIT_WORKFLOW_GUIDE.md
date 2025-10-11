# Guia de Workflow Git — Lab Fonética UFRJ

**Autor:** Workspace Assistant  
**Data:** 2025-10-11  
**Objetivo:** Evitar problemas de sincronização entre Codespaces, GitHub e ambiente local

---

## 🎯 Problema Identificado

Você está trabalhando em um **GitHub Codespace** (ambiente de desenvolvimento na nuvem) e precisa garantir que:
1. ✅ Suas alterações sejam salvas no GitHub
2. ✅ Você possa acessar os arquivos no seu computador local
3. ✅ Não haja conflitos ou perda de dados

---

## 📋 Situação Atual

```bash
# Status do repositório:
Branch: main
Remote: https://github.com/Wisleyv/lab-fon-ufrj
Arquivos não rastreados:
  - EVALUATION_Architecture_and_Best_Practices.md (novo)
  - .vscode/ (configurações do editor)
```

---

## 🚀 Solução Imediata: Sincronizar Agora

### Passo 1: Adicionar arquivos ao Git

```bash
# Adicionar o documento de avaliação
git add EVALUATION_Architecture_and_Best_Practices.md

# (Opcional) Adicionar configurações do VS Code
git add .vscode/
```

### Passo 2: Fazer commit das mudanças

```bash
git commit -m "docs: adicionar avaliação técnica de arquitetura e boas práticas"
```

### Passo 3: Enviar para o GitHub

```bash
git push origin main
```

### Passo 4: Verificar no GitHub

Abra no navegador: https://github.com/Wisleyv/lab-fon-ufrj

---

## 🔄 Workflow Recomendado (Uso Diário)

### Opção A: Trabalho no Codespace (recomendado para você)

#### Ao COMEÇAR o trabalho:
```bash
# 1. Puxar últimas alterações do GitHub
git pull origin main

# 2. Criar uma branch para sua feature/task (opcional, mas recomendado)
git checkout -b feature/nome-da-feature
```

#### Durante o trabalho:
```bash
# Salvar progresso frequentemente (mini-commits locais)
git add .
git commit -m "wip: descrição do que foi feito"
```

#### Ao FINALIZAR o trabalho:
```bash
# 1. Commit final (se houver alterações pendentes)
git add .
git commit -m "feat: descrição completa da funcionalidade"

# 2. Voltar para a branch main
git checkout main

# 3. Fazer merge da sua branch de trabalho (se usou)
git merge feature/nome-da-feature

# 4. Enviar para o GitHub
git push origin main

# 5. Deletar branch de trabalho (opcional)
git branch -d feature/nome-da-feature
```

### Opção B: Sincronização entre Codespace e Local

Se você trabalha alternadamente entre Codespace e seu computador:

#### No Codespace (antes de sair):
```bash
git add .
git commit -m "docs: atualização dos documentos"
git push origin main
```

#### No seu computador local:
```bash
# 1. Clonar o repositório (primeira vez)
cd ~/Documentos  # ou pasta de sua preferência
git clone https://github.com/Wisleyv/lab-fon-ufrj.git
cd lab-fon-ufrj

# 2. Puxar alterações (sempre que retornar)
git pull origin main

# 3. Fazer suas alterações...

# 4. Enviar de volta
git add .
git commit -m "docs: edições locais"
git push origin main
```

#### De volta ao Codespace:
```bash
# Puxar as alterações feitas localmente
git pull origin main
```

---

## 🛡️ Prevenção de Conflitos

### Regra de Ouro
**Sempre execute `git pull` ANTES de começar a trabalhar!**

```bash
# Crie um alias para facilitar
git config --global alias.sync '!git add -A && git commit -m "sync: auto-commit" && git pull && git push'

# Uso:
git sync  # Faz commit, pull e push automaticamente
```

### Resolver Conflitos (se acontecerem)

```bash
# Se ao fazer pull aparecer conflitos:
git status  # Ver arquivos em conflito

# Abrir arquivo conflitante no editor
# Procure por marcadores: <<<<<<<, =======, >>>>>>>
# Escolha qual versão manter e remova os marcadores

# Após resolver:
git add arquivo-resolvido.md
git commit -m "fix: resolver conflito de merge"
git push origin main
```

---

## 📦 Acessar Arquivos no Computador Local

### Método 1: Clone do Repositório (recomendado)

```bash
# No terminal do seu computador:
cd ~/Documentos  # ou C:\Users\SeuNome\Documents no Windows
git clone https://github.com/Wisleyv/lab-fon-ufrj.git
cd lab-fon-ufrj

# Os arquivos agora estão na pasta:
# Mac/Linux: ~/Documentos/lab-fon-ufrj/
# Windows: C:\Users\SeuNome\Documents\lab-fon-ufrj\
```

### Método 2: Download ZIP do GitHub

1. Acesse: https://github.com/Wisleyv/lab-fon-ufrj
2. Clique no botão verde **"Code"**
3. Selecione **"Download ZIP"**
4. Extraia o arquivo baixado

⚠️ **Desvantagem:** Precisa fazer download manual sempre que houver alterações.

### Método 3: GitHub Desktop (mais amigável)

1. Baixe: https://desktop.github.com/
2. Instale e faça login com sua conta GitHub
3. Clone o repositório `Wisleyv/lab-fon-ufrj`
4. A interface gráfica facilita commits, pull e push

---

## 📝 Convenções de Commits (recomendadas)

Use prefixos semânticos para organizar o histórico:

```bash
git commit -m "feat: adicionar nova seção de publicações"
git commit -m "fix: corrigir link quebrado no rodapé"
git commit -m "docs: atualizar documentação do projeto"
git commit -m "style: ajustar espaçamento CSS"
git commit -m "refactor: reorganizar estrutura de pastas"
git commit -m "test: adicionar testes unitários"
git commit -m "chore: atualizar dependências"
```

---

## 🔍 Comandos Úteis para Verificação

```bash
# Ver status atual
git status

# Ver histórico de commits
git log --oneline --graph --all --decorate

# Ver diferenças não commitadas
git diff

# Ver branches disponíveis
git branch -a

# Ver arquivos ignorados
cat .gitignore

# Ver último commit
git show HEAD

# Ver arquivos modificados desde último commit
git diff --name-only

# Desfazer alterações locais (cuidado!)
git checkout -- arquivo.md  # Descarta mudanças de um arquivo
git reset --hard HEAD       # Descarta TODAS mudanças locais
```

---

## ⚙️ Configurações Recomendadas

### Adicionar .gitignore

```bash
# Criar arquivo .gitignore na raiz do projeto
cat > .gitignore << 'EOF'
# Dependências
node_modules/
npm-debug.log*

# Ambiente
.env
.env.local

# Editor
.vscode/
.idea/
*.swp
*.swo

# Sistema
.DS_Store
Thumbs.db
desktop.ini

# Build
dist/
build/
*.log

# Temporários
tmp/
temp/
*.tmp
EOF

git add .gitignore
git commit -m "chore: adicionar .gitignore"
git push origin main
```

### Configurar Editor para Auto-Save

No VS Code (já está no Codespace), pressione `Ctrl+,` (ou `Cmd+,` no Mac) e procure por:
- **Files: Auto Save** → defina como `afterDelay`
- **Files: Auto Save Delay** → 1000ms

Isso garante que você não perca trabalho se esquecer de salvar.

---

## 🎓 Workflow Completo — Exemplo Prático

### Cenário: Adicionar nova funcionalidade ao site

```bash
# 1. Atualizar repositório local
git pull origin main

# 2. Criar branch de trabalho
git checkout -b feature/adicionar-galeria-fotos

# 3. Fazer alterações nos arquivos...
# (editar HTML, CSS, JS, etc.)

# 4. Ver o que foi alterado
git status
git diff

# 5. Adicionar arquivos modificados
git add src/js/galeria.js
git add src/css/galeria.css
git add data.json

# 6. Commit com mensagem descritiva
git commit -m "feat: implementar galeria de fotos com lightbox

- Adicionar módulo galeria.js
- Criar estilos responsivos
- Atualizar data.json com URLs das imagens
- Implementar navegação por teclado (a11y)"

# 7. Voltar para main e fazer merge
git checkout main
git merge feature/adicionar-galeria-fotos

# 8. Enviar para GitHub
git push origin main

# 9. Limpar branch de trabalho
git branch -d feature/adicionar-galeria-fotos

# 10. Verificar no GitHub que tudo está lá
```

---

## 🆘 Troubleshooting — Problemas Comuns

### Problema 1: "fatal: refusing to merge unrelated histories"

```bash
git pull origin main --allow-unrelated-histories
```

### Problema 2: "Updates were rejected because the remote contains work"

```bash
# Puxar alterações remotas primeiro
git pull origin main --rebase

# Se houver conflitos, resolvê-los
git add .
git rebase --continue

# Enviar novamente
git push origin main
```

### Problema 3: "Authentication failed"

```bash
# No Codespace (já configurado automaticamente)
# No local, configure um Personal Access Token:
# 1. GitHub → Settings → Developer settings → Personal access tokens
# 2. Generate new token (classic)
# 3. Marcar: repo, workflow, write:packages
# 4. Copiar o token
# 5. Usar como senha ao fazer push
```

### Problema 4: Esqueci de fazer commit antes de fazer pull

```bash
# Salvar trabalho atual temporariamente
git stash

# Puxar alterações
git pull origin main

# Recuperar trabalho salvo
git stash pop

# Resolver conflitos se houver
git add .
git commit -m "feat: continuar trabalho após sync"
```

---

## 📚 Recursos Adicionais

- **Git Cheat Sheet:** https://education.github.com/git-cheat-sheet-education.pdf
- **Interactive Tutorial:** https://learngitbranching.js.org/
- **GitHub Docs:** https://docs.github.com/pt
- **Git Book (Português):** https://git-scm.com/book/pt-br/v2

---

## 🎯 Checklist Diário

Copie e use como rotina:

```markdown
### Ao INICIAR trabalho:
- [ ] Abrir Codespace / Terminal
- [ ] `git pull origin main`
- [ ] Criar branch (opcional): `git checkout -b feature/nome`

### Durante trabalho:
- [ ] Salvar arquivos frequentemente (Ctrl+S)
- [ ] Commits pequenos: `git add . && git commit -m "wip: progresso"`

### Ao FINALIZAR trabalho:
- [ ] Commit final: `git add . && git commit -m "feat: descrição"`
- [ ] Merge para main: `git checkout main && git merge feature/nome`
- [ ] Push: `git push origin main`
- [ ] Verificar no GitHub: https://github.com/Wisleyv/lab-fon-ufrj
```

---

## 🔄 Sincronização Automática (Avançado)

### Criar script de auto-sync

```bash
# filepath: sync.sh
#!/bin/bash
echo "🔄 Sincronizando com GitHub..."

# Add all changes
git add .

# Commit with timestamp
git commit -m "sync: auto-commit $(date '+%Y-%m-%d %H:%M:%S')"

# Pull with rebase
git pull origin main --rebase

# Push
git push origin main

echo "✅ Sincronização completa!"
```

```bash
# Tornar executável
chmod +x sync.sh

# Usar:
./sync.sh
```

---

## 📞 Quando Pedir Ajuda

Se você encontrar problemas que não consegue resolver:

1. **Copie a mensagem de erro completa**
2. **Anote o que estava fazendo quando o erro ocorreu**
3. **Verifique o status:** `git status`
4. **Verifique o histórico:** `git log --oneline -5`
5. **Procure ajuda** (cole as informações acima)

---

**Dica Final:** Git pode parecer complicado no início, mas com prática se torna natural. O importante é fazer commits frequentes e sempre puxar (`pull`) antes de começar a trabalhar!

---

## 🚀 Ação Imediata Recomendada

Execute agora no terminal:

```bash
# 1. Adicionar os novos arquivos
git add EVALUATION_Architecture_and_Best_Practices.md
git add GIT_WORKFLOW_GUIDE.md

# 2. Fazer commit
git commit -m "docs: adicionar avaliação técnica e guia de workflow Git"

# 3. Enviar para GitHub
git push origin main

# 4. Verificar
echo "✅ Acesse: https://github.com/Wisleyv/lab-fon-ufrj"
```

Pronto! Seus arquivos estarão no GitHub e você poderá clonar no seu computador local quando quiser.

---

**Última atualização:** 2025-10-11  
**Mantenha este guia atualizado** conforme seu workflow evolui!

# Avaliação de Compatibilidade: Deploy em WordPress

**Data da Avaliação:** 05 de novembro de 2025  
**Projeto:** Lab Fonética UFRJ - Website Institucional  
**Cenário:** Migração de SPA standalone para ambiente WordPress

---

## 📋 Resumo Executivo

### Veredicto: ✅ **VIÁVEL com ressalvas**

O projeto atual pode ser integrado ao WordPress com acesso SFTP, mas requer planejamento cuidadoso especialmente para a funcionalidade de edição de conteúdo por usuários leigos.

---

## 🎯 Cenário Proposto

### Requisitos Originais
- Site de página única (SPA) responsivo
- Tecnologias: HTML, CSS, JavaScript, JSON
- Publicação independente

### Novo Cenário (Restrições Orçamentárias)
1. Criação de página estática com backend amigável ao usuário leigo
2. Armazenamento no diretório "contents" do WordPress
3. Abertura via item de menu em nova aba (ambiente isolado)
4. Link de retorno ao site principal WordPress
5. Acesso disponível: **apenas SFTP**

---

## ✅ Pontos Positivos

### 1. Natureza Estática do Projeto
- Sites SPA em JS/JSON/CSS/HTML são idealmente portáveis
- Não requerem servidor backend específico
- Podem rodar em qualquer servidor web (Apache/Nginx)

### 2. Isolamento Arquitetônico
- Abrir em nova aba é perfeitamente viável
- Não há conflito com o WordPress
- Mantém identidade visual independente

### 3. Acesso SFTP
- Suficiente para upload de arquivos estáticos
- Permite atualizações manuais de todos os recursos
- Compatível com hospedagem básica

---

## ⚠️ Desafios e Soluções

### Desafio 1: Localização no WordPress

**Estrutura recomendada:**

wp-content/
└── labfonac/
    ├── index.html
    ├── css/
    ├── js/
    ├── data/
    └── assets/
```

### Desafio 2: Backend Amigável para Usuário Leigo

**Problema:**
- ❌ Edição de arquivos JSON via SFTP **NÃO é amigável** para leigos
- ❌ Requer conhecimento técnico (FTP client, sintaxe JSON, etc.)
- ❌ Alto risco de erros de sintaxe quebrar a página

**Soluções Possíveis:**

#### Opção A: Backend Independente com Autenticação Própria (Recomendado)

**⚠️ IMPORTANTE:** Devido à necessidade de isolamento total entre usuários do Lab Fonética e administradores do WordPress PPGLEV, esta solução utiliza um sistema de autenticação completamente independente do `wp-admin`.

**Arquitetura:**
```
Backend PHP Independente → Escreve JSON → Página Estática (JS) lê JSON
```

**Estrutura de Diretórios:**
```
wp-content/
└── labfonac/
    ├── index.html              # Página pública
    ├── admin/                  # 🔒 Sistema administrativo independente
    │   ├── login.php           # Autenticação própria
    │   ├── dashboard.php       # Interface de edição
    │   ├── save.php            # Processa salvamentos
    │   ├── auth/
    │   │   ├── users.json      # Banco de usuários (600)
    │   │   └── session.php     # Gerenciamento de sessão
    │   └── css/admin.css
    ├── data/
    │   ├── content.json        # Dados da página
    │   └── backups/            # Backups automáticos
    └── assets/uploads/         # Imagens enviadas
```

**Como Funciona:**

1. **Autenticação Independente:**
   - Sistema de login próprio (`/wp-content/labfonac/admin/login.php`)
   - Usuários armazenados em arquivo JSON separado
   - Sessions PHP com nome único (não conflita com WordPress)
   - **Nenhum acesso ao wp-admin do PPGLEV**

2. **Interface de Edição:**
   - Dashboard com formulários visuais para editar conteúdo
   - Upload de imagens direto pela interface
   - Preview de alterações antes de publicar
   - Backups automáticos a cada salvamento

3. **Salvamento de Dados:**
   - Sistema PHP grava arquivo JSON no diretório `data/`
   - Validação server-side de todos os dados
   - Mantém histórico de 10 últimos backups

4. **Página Pública Continua Estática:**
   - JavaScript faz `fetch('data/content.json')`
   - Renderiza conteúdo dinamicamente no navegador
   - Sem dependência de PHP em runtime

**Características:**
- ✅ Isolamento total do WordPress principal
- ✅ Interface gráfica amigável para leigos
- ✅ Sistema de usuários próprio
- ✅ Controle granular de permissões
- ✅ Backups automáticos
- ✅ Validação de dados
- ✅ Auto-salvamento de rascunhos
- ✅ Preview antes de publicar
- ✅ Upload de imagens integrado

**Requisitos Técnicos:**
- Servidor com PHP 7.4+ (já disponível no WordPress)
- Permissões de escrita em `data/` e `assets/uploads/` (775)
- Permissões de leitura/escrita em `admin/auth/users.json` (600)
- Acesso SFTP único para upload inicial dos arquivos PHP

**Vantagens sobre Plugin WordPress:**
- ✅ **Segurança:** Usuários do Lab Fonética não têm acesso ao wp-admin
- ✅ **Isolamento:** Sistema completamente separado do WordPress PPGLEV
- ✅ **Simplicidade:** Não requer conhecimento de arquitetura de plugins WP
- ✅ **Portabilidade:** Pode ser movido para outro servidor facilmente
- ✅ **Controle:** Administração independente de usuários

**Desvantagens:**
- ⚠️ Não aproveita infraestrutura de usuários do WordPress
- ⚠️ Requer manutenção de sistema de autenticação próprio
- ⚠️ Necessita desenvolvimento de interface administrativa

**Arquivos Principais a Desenvolver:**

1. **Sistema de Autenticação:**
   - `admin/auth/session.php` - Gerenciamento de sessões
   - `admin/auth/users.php` - CRUD de usuários
   - `admin/auth/users.json` - Banco de dados de usuários

2. **Interface Administrativa:**
   - `admin/login.php` - Tela de login
   - `admin/dashboard.php` - Painel de controle
   - `admin/save.php` - Processamento de salvamentos
   - `admin/upload.php` - Upload de imagens
   - `admin/logout.php` - Encerramento de sessão

3. **Segurança:**
   - `admin/.htaccess` - Proteção de arquivos sensíveis
   - Validação e sanitização de inputs
   - Proteção contra CSRF
   - Hash de senhas (bcrypt)

**Fluxo de Trabalho do Usuário:**

```
1. Usuário acessa: https://seusite.com/wp-content/labfonac/admin/
2. Faz login com credenciais próprias
3. Dashboard mostra formulários de edição
4. Edita conteúdo, faz upload de imagens
5. Clica "Pré-visualizar" para ver resultado
6. Clica "Salvar" quando satisfeito
7. Sistema grava JSON e faz backup
8. Página pública é atualizada automaticamente
```

**Gestão de Usuários:**

```json
// admin/auth/users.json
[
  {
    "id": 1,
    "username": "coordenador",
    "password": "$2y$10$...",  // hash bcrypt
    "name": "Prof. João Silva",
    "email": "joao@labfonac.ufrj.br",
    "role": "admin",
    "created_at": "2025-11-05 10:00:00"
  },
  {
    "id": 2,
    "username": "editor",
    "password": "$2y$10$...",
    "name": "Maria Santos",
    "email": "maria@labfonac.ufrj.br",
    "role": "editor",
    "created_at": "2025-11-05 10:30:00"
  }
]
```

**Segurança do Sistema:**

1. **Senhas:**
   - Hash bcrypt (custo 10)
   - Nunca armazenadas em texto plano

2. **Sessões:**
   - Timeout de 2 horas
   - Regeneração de ID após login
   - Validação de IP (opcional)

3. **Arquivos:**
   - `.htaccess` bloqueia acesso a `users.json`
   - Permissão 600 em arquivos sensíveis
   - Upload apenas de tipos permitidos (jpg, png, pdf)

4. **Proteção CSRF:**
   - Tokens únicos por formulário
   - Validação em cada POST

**Custo de Desenvolvimento:**
- **Estimativa:** 16-24 horas de desenvolvimento
- **Complexidade:** Média
- **Manutenção:** Baixa (após implantação)
- **Custo-Benefício:** Alto (investimento único, uso contínuo)

#### Opção B: Serviço Externo
```
Alternativas:
1. Google Sheets + API pública
2. Airtable + API
3. Contentful (CMS headless gratuito)
```

**Requisitos:**
- Modificar JavaScript para buscar dados de API externa
- Configurar CORS adequadamente
- Dependência de serviço terceiro

**Custo-Benefício:** Médio (grátis mas com limitações)

#### Opção C: Edição Manual Assistida
```
Processo:
1. Usuário solicita mudança via email/ticket
2. Webmaster edita JSON localmente
3. Upload via SFTP
```

**Requisitos:**
- Pessoa técnica disponível
- Tempo de resposta aceitável

**Custo-Benefício:** Baixo (solução temporária)

---

## 📊 Análise Comparativa: Edição Online vs. Aplicativo Desktop

Esta seção compara as três principais abordagens para edição de conteúdo, considerando viabilidade técnica, experiência do usuário e custos de implementação/manutenção.

### Abordagem 1: Backend Web Independente (Opção A)

**Descrição:** Sistema PHP com interface web própria, hospedado junto com a página estática.

**✅ Vantagens:**

1. **Acessibilidade:**
   - Acesso de qualquer lugar com internet
   - Sem necessidade de instalação de software
   - Funciona em qualquer sistema operacional
   - Acesso via navegador (desktop, tablet, mobile)

2. **Colaboração:**
   - Múltiplos usuários podem acessar simultaneamente
   - Sistema de permissões (admin, editor, viewer)
   - Log de quem fez cada alteração
   - Prevenção de edições conflitantes

3. **Facilidade de Uso:**
   - Interface visual amigável (WYSIWYG possível)
   - Preview instantâneo das alterações
   - Formulários guiados com validação em tempo real
   - Upload de imagens com drag-and-drop

4. **Automação:**
   - Backups automáticos a cada salvamento
   - Validação automática de sintaxe JSON
   - Publicação instantânea (sem upload manual)
   - Auto-salvamento de rascunhos

5. **Segurança:**
   - Autenticação centralizada no servidor
   - Logs de auditoria
   - Controle fino de permissões
   - Proteção contra erros de sintaxe

**❌ Desvantagens:**

1. **Dependência de Conexão:**
   - Requer internet estável para trabalhar
   - Não há modo offline
   - Latência em conexões lentas

2. **Desenvolvimento Inicial:**
   - Investimento de 16-24 horas de desenvolvimento
   - Necessita conhecimento de PHP e segurança web
   - Testes extensivos de segurança necessários

3. **Manutenção:**
   - Atualizações de segurança periódicas
   - Gestão de usuários e senhas
   - Monitoramento de logs de acesso

4. **Infraestrutura:**
   - Requer PHP funcional no servidor
   - Permissões de escrita precisam ser configuradas
   - Possível alvo de ataques (requer hardening)

**Custo Total:**
- Desenvolvimento inicial: R$ 2.400 - R$ 4.800 (16-24h × R$ 150-200/h)
- Manutenção anual: R$ 600 - R$ 1.200 (4-8h × R$ 150/h)
- Infraestrutura: R$ 0 (usa servidor WordPress existente)

---

### Abordagem 2: Aplicativo Desktop Standalone

**Descrição:** Software instalado localmente que edita JSON e faz upload via SFTP integrado.

**✅ Vantagens:**

1. **Trabalho Offline:**
   - Edições sem necessidade de internet
   - Preview local sem latência
   - Rascunhos salvos localmente
   - Upload apenas quando finalizado

2. **Performance:**
   - Interface nativa mais rápida
   - Sem dependência de navegador
   - Preview instantâneo sem servidor
   - Recursos do SO (notificações, atalhos)

3. **Controle Local:**
   - Usuário controla quando publicar
   - Testes locais completos antes de upload
   - Histórico de versões no próprio computador
   - Sem exposição de interface administrativa online

4. **Simplicidade de Servidor:**
   - Nenhum código PHP adicional necessário
   - Sem preocupações com segurança de backend
   - Apenas SFTP (já disponível)
   - Não aumenta superfície de ataque do servidor

5. **Integração com Sistema:**
   - Abre arquivos com duplo clique
   - Integração com editor de imagens local
   - Atalhos de teclado nativos
   - Clipboard do sistema operacional

**❌ Desvantagens:**

1. **Instalação e Distribuição:**
   - Precisa instalar software em cada computador
   - Diferentes versões para Windows/Mac/Linux
   - Atualizações precisam ser distribuídas manualmente
   - Possíveis problemas de compatibilidade de SO

2. **Colaboração Limitada:**
   - Dificulta trabalho simultâneo de múltiplos usuários
   - Possível conflito de edições (sobrescrever arquivo)
   - Sem sistema centralizado de permissões
   - Difícil rastrear quem fez cada alteração

3. **Curva de Aprendizado:**
   - Interface nova para aprender
   - Usuário precisa entender SFTP
   - Configuração inicial mais complexa
   - Gerenciamento de credenciais SFTP local

4. **Dependência de Computador:**
   - Vinculado ao computador onde está instalado
   - Dificulta edições rápidas de outros locais
   - Backups dependem do usuário
   - Perda de dados se computador falhar

5. **Desenvolvimento Multiplataforma:**
   - Custo maior de desenvolvimento (3 SOs)
   - Manutenção de múltiplas versões
   - Distribuição e instalação mais complexas
   - Assinatura de código (certificado) necessária

**Custo Total:**
- Desenvolvimento inicial: R$ 6.000 - R$ 12.000 (40-80h × R$ 150/h)
  - Desenvolvimento: 30-50h
  - Testes em múltiplos SOs: 10-20h
  - Empacotamento e instaladores: 5-10h
- Manutenção anual: R$ 1.800 - R$ 3.000 (12-20h × R$ 150/h)
- Certificados de assinatura: R$ 1.500/ano (opcional mas recomendado)

**Tecnologias Possíveis:**
- **Electron** (JavaScript/HTML/CSS): Multiplataforma, mesmo código
- **Python + PyQt/Tkinter**: Leve, boa para formulários
- **Java + JavaFX**: Multiplataforma robusta
- **Native** (C#/Swift/C++): Melhor performance, mais complexo

---

### Abordagem 3: Edição Manual com Cliente SFTP (Opção C)

**Descrição:** Usuário edita JSON em editor de texto e faz upload via FileZilla ou similar.

**✅ Vantagens:**

1. **Custo Zero:**
   - Sem desenvolvimento de software
   - Ferramentas gratuitas existentes (VSCode, FileZilla)
   - Sem custos de manutenção de código
   - Implementação imediata

2. **Flexibilidade Total:**
   - Usuário usa editor favorito
   - Qualquer ferramenta de SFTP
   - Controle total dos arquivos
   - Fácil fazer backups manuais

3. **Simplicidade Técnica:**
   - Nenhuma infraestrutura adicional
   - Sem código para manter
   - Sem preocupações de segurança de aplicação
   - Funciona em qualquer sistema

**❌ Desvantagens:**

1. **Alto Risco de Erros:**
   - ❌❌❌ **Erro de sintaxe JSON quebra página inteira**
   - Falta de validação em tempo real
   - Fácil esquecer vírgula ou aspas
   - Difícil debugar erros para leigos

2. **Experiência Ruim para Leigos:**
   - Interface técnica intimidante
   - Necessita entender sintaxe JSON
   - Precisa usar dois programas (editor + SFTP)
   - Nenhuma visualização do resultado

3. **Sem Proteções:**
   - Sem backups automáticos
   - Possível sobrescrever sem querer
   - Sem controle de versões
   - Sem logs de quem mudou o quê

4. **Ineficiência:**
   - Processo manual demorado
   - Múltiplos passos (editar, validar, upload, testar)
   - Ciclo de feedback lento
   - Propensa a esquecimento de passos

**Custo Total:**
- Desenvolvimento: R$ 0
- Manutenção: R$ 0
- **Custo oculto:** Tempo desperdiçado com erros e retrabalho
- **Custo de oportunidade:** Frustração do usuário, possíveis páginas quebradas

---

## 🏆 Matriz de Decisão

| Critério | Backend Web | App Desktop | SFTP Manual |
|----------|------------|-------------|-------------|
| **Facilidade de Uso** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Custo Inicial** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| **Custo de Manutenção** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Colaboração** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Segurança** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Trabalho Offline** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Preview** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| **Prevenção de Erros** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ |
| **Backups Automáticos** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Acessibilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Tempo até Produção** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| **TOTAL** | **48/55** | **35/55** | **26/55** |

---

## 💡 Recomendação Final

### Para Apresentação aos Gestores:

**Cenário Ideal:** 
- **Backend Web Independente (Opção A)** para uso contínuo
- **SFTP Manual (Opção C)** como solução temporária imediata

**Justificativa:**

1. **Fase 1 (Imediato - Mês 0):**
   - Implementar deploy básico via SFTP
   - Edições emergenciais via SFTP manual (webmaster)
   - **Investimento:** R$ 0
   - **Tempo:** 1 semana

2. **Fase 2 (Desenvolvimento - Meses 1-2):**
   - Desenvolver backend web independente
   - Testes com usuários-piloto
   - **Investimento:** R$ 2.400 - R$ 4.800
   - **Tempo:** 3-4 semanas

3. **Fase 3 (Produção - Mês 3+):**
   - Migração completa para backend web
   - Treinamento de usuários
   - **Custo anual:** R$ 600 - R$ 1.200

**Por que NÃO Aplicativo Desktop:**

❌ Custo 2-3x maior (R$ 6.000 - R$ 12.000)  
❌ Tempo de desenvolvimento 2x maior (2-3 meses)  
❌ Complexidade de distribuição e atualização  
❌ Dificulta colaboração de múltiplos usuários  
❌ Não aproveita infraestrutura existente (servidor WordPress)

**Retorno sobre Investimento (Backend Web):**

```
Cenário: 2 editores, 4 edições/mês, 3 anos de uso

SFTP Manual:
- Tempo por edição: 30 minutos
- Erros e retrabalho: 20% das edições = +15 min
- Total por edição: 45 minutos
- Total anual: 4 × 12 × 45 min = 36 horas
- Custo (R$ 50/h interno): R$ 1.800/ano
- **3 anos: R$ 5.400**

Backend Web:
- Tempo por edição: 10 minutos
- Erros: <1% (validação automática)
- Total anual: 4 × 12 × 10 min = 8 horas
- Custo (R$ 50/h): R$ 400/ano
- Desenvolvimento inicial: R$ 3.600
- **3 anos: R$ 4.800**

ECONOMIA: R$ 600 em 3 anos + melhor experiência do usuário
BREAK-EVEN: 18 meses
```

---

### Desafio 3: Permissões de Arquivo

**Problema:**
- Servidor web precisa ler (e possivelmente escrever) arquivos

**Solução:**
```bash
# Permissões recomendadas via SFTP:
Diretórios: 755 (rwxr-xr-x)
Arquivos: 644 (rw-r--r--)

# Se plugin precisar escrever:
Diretório data/: 775 (rwxrwxr-x)
Arquivos JSON: 664 (rw-rw-r--)
```

**Verificação:**
- Testar acesso à URL após upload
- Verificar logs de erro do servidor (se disponível)

---

### Desafio 4: Processo de Build

**Problema:**
- Projetos modernos podem usar ferramentas de build (Vite, Webpack, etc.)

**Verificação Necessária:**
```bash
# Verificar se existe:
- package.json com scripts de build
- vite.config.js ou webpack.config.js
- Diretório dist/ ou build/
```

**Soluções:**

**Se requer build:**
1. Executar `npm run build` localmente
2. Upload apenas da pasta `dist/` via SFTP
3. Documentar processo para futuras atualizações

**Se não requer build:**
1. Upload direto de todos os arquivos via SFTP

---

## � Documento para Apresentação aos Gestores

### Sumário Executivo

**Objetivo:** Viabilizar a publicação do website institucional do Laboratório de Fonética UFRJ dentro do ambiente WordPress do PPGLEV, mantendo isolamento administrativo completo entre os dois sistemas.

**Solução Proposta:** Página estática HTML/CSS/JavaScript armazenada em `/wp-content/labfonac/` com sistema de administração independente do WordPress.

---

### Benefícios Institucionais

1. **Redução de Custos:**
   - Aproveita infraestrutura existente do WordPress
   - Evita contratação de hospedagem separada (economia: R$ 500-1.000/ano)
   - Investimento único vs. custos recorrentes

2. **Manutenção Simplificada:**
   - Sistema leve e independente
   - Não interfere no WordPress principal
   - Atualizações independentes

3. **Identidade Visual Própria:**
   - Design customizado para o laboratório
   - Sem limitações de tema WordPress
   - Performance superior (página estática)

4. **Autonomia do Laboratório:**
   - Usuários do Lab Fonética gerenciam seu conteúdo
   - Sem necessidade de envolver equipe do PPGLEV
   - Sistema de permissões próprio

---

### Requisitos Técnicos (Para Administrador do Servidor)

#### Permissões Necessárias:

```bash
# Criação de diretório
mkdir /wp-content/labfonac
chown www-data:www-data /wp-content/labfonac

# Estrutura de permissões
/wp-content/labfonac/               755 (rwxr-xr-x)
├── index.html                      644 (rw-r--r--)
├── admin/                          755 (rwxr-xr-x)
│   ├── *.php                       644 (rw-r--r--)
│   └── auth/
│       └── users.json              600 (rw-------)  ⚠️ CRÍTICO
├── data/                           775 (rwxrwxr-x)  ⚠️ Escrita necessária
│   ├── content.json                664 (rw-rw-r--)
│   └── backups/                    775 (rwxrwxr-x)
└── assets/
    └── uploads/                    775 (rwxrwxr-x)  ⚠️ Upload de imagens
```

#### Validação de Ambiente:

```bash
# Verificar versão PHP (mínimo 7.4)
php -v

# Verificar extensões necessárias
php -m | grep -E "(json|session|fileinfo)"

# Verificar permissões de escrita
sudo -u www-data touch /wp-content/labfonac/data/test.json
```

#### Configuração de Segurança:

1. **Arquivo `.htaccess` em `/wp-content/labfonac/admin/`:**
```apache
# Proteção de arquivos sensíveis
<Files "users.json">
    Order Allow,Deny
    Deny from all
</Files>

# Desabilita listagem de diretórios
Options -Indexes

# Força HTTPS (se certificado disponível)
# RewriteEngine On
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

2. **Limitar tentativas de login (fail2ban ou similar):**
```bash
# Monitorar: /wp-content/labfonac/admin/login.php
# Bloquear após 5 tentativas falhas em 10 minutos
```

3. **Backups:**
```bash
# Incluir no backup regular do WordPress:
tar -czf labfonac_backup_$(date +%Y%m%d).tar.gz /wp-content/labfonac/data/
```

---

### Impacto no Sistema PPGLEV

**✅ Nenhum impacto negativo esperado:**

1. **Isolamento Completo:**
   - Código não interage com WordPress core
   - Não usa banco de dados do WordPress
   - Sistema de usuários separado

2. **Recursos do Servidor:**
   - Página estática: carga mínima
   - Admin PHP: uso esporádico (apenas durante edições)
   - Espaço em disco: ~50-100 MB estimado

3. **Segurança:**
   - Não aumenta risco para WordPress principal
   - Autenticação independente
   - Logs separados

4. **Manutenção:**
   - Não requer atualizações junto com WordPress
   - Equipe do Lab Fonética responsável por conteúdo
   - TI do PPGLEV apenas monitora recursos

---

### Cronograma de Implementação

| Fase | Atividade | Responsável | Duração | Entregável |
|------|-----------|-------------|---------|------------|
| **1** | Aprovação e alinhamento | Gestores | 1 semana | Documento assinado |
| **2** | Configuração de permissões no servidor | Admin TI | 1 dia | Diretório configurado |
| **3** | Upload de página estática | Dev Lab Fon | 1 dia | Página acessível |
| **4** | Configuração de menu WordPress | Admin TI | 1 hora | Link funcional |
| **5** | Desenvolvimento de backend admin | Dev Externo | 3-4 semanas | Sistema de edição |
| **6** | Testes de segurança e usabilidade | Dev + TI | 1 semana | Relatório de testes |
| **7** | Treinamento de usuários | Dev Lab Fon | 2 horas | Usuários treinados |
| **8** | Go-live | Todos | 1 dia | Sistema em produção |

**Tempo total:** 5-6 semanas  
**Esforço TI:** ~2 dias de trabalho

---

### Responsabilidades

#### Administrador do Servidor (TI PPGLEV):
- ✅ Criar diretório `/wp-content/labfonac/` com permissões adequadas
- ✅ Configurar `.htaccess` de segurança
- ✅ Adicionar diretório aos backups regulares
- ✅ Monitorar uso de recursos (mensal)
- ✅ Fornecer credenciais SFTP para upload inicial

#### Laboratório de Fonética:
- ✅ Fornecer conteúdo e assets (textos, imagens, etc.)
- ✅ Contratar desenvolvimento do sistema (se necessário)
- ✅ Gerenciar usuários do sistema administrativo
- ✅ Fazer edições e manutenção de conteúdo
- ✅ Reportar problemas técnicos à TI

#### Desenvolvimento (Externo ou Interno):
- ✅ Desenvolver sistema de administração
- ✅ Realizar testes de segurança
- ✅ Documentar código e processo
- ✅ Treinar usuários finais
- ✅ Fornecer suporte pós-implantação (30-60 dias)

---

### Checklist de Aprovação

**Para Gestores PPGLEV:**
- [ ] Aprovar uso de espaço em `/wp-content/` para Lab Fonética
- [ ] Autorizar criação de sistema administrativo independente
- [ ] Confirmar que não haverá conflito de identidade visual
- [ ] Aprovar investimento de ~R$ 3.000-5.000 (se aplicável)

**Para Administrador do Servidor:**
- [ ] Confirmar que servidor suporta PHP 7.4+
- [ ] Verificar espaço em disco disponível (mínimo 500 MB)
- [ ] Aprovar permissões de escrita em subdiretório `wp-content`
- [ ] Confirmar inclusão em rotina de backups
- [ ] Aprovar configurações de segurança (`.htaccess`, fail2ban)

**Para Laboratório de Fonética:**
- [ ] Confirmar disponibilidade de conteúdo (textos, imagens)
- [ ] Definir usuários que terão acesso administrativo
- [ ] Alocar orçamento para desenvolvimento (se necessário)
- [ ] Designar responsável técnico pelo sistema
- [ ] Comprometer-se com treinamento de usuários

---

### Alternativas Consideradas e Descartadas

| Alternativa | Por que foi descartada |
|-------------|------------------------|
| **Hospedagem separada** | Custo recorrente (R$ 500-1.000/ano), duplicação de manutenção |
| **Plugin WordPress tradicional** | Daria acesso ao wp-admin do PPGLEV (risco de segurança) |
| **Subdomínio WordPress** | Requer instalação completa do WordPress (overhead desnecessário) |
| **Integração total ao tema** | Perde identidade visual, dificulta customização |
| **Google Sites** | Falta de controle, limitações de design, dependência externa |

---

### Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Vulnerabilidade de segurança no admin** | Média | Alto | Auditorias de código, testes de penetração, atualizações regulares |
| **Conflito de permissões de arquivo** | Baixa | Médio | Documentação clara, testes antes de produção |
| **Sobrecarga do servidor** | Muito Baixa | Baixo | Página estática tem carga mínima, monitoramento ativo |
| **Perda de dados** | Baixa | Alto | Backups automáticos a cada edição + backup diário do servidor |
| **Usuários esquecem senhas** | Média | Baixo | Sistema de reset de senha, manter 2+ admins |
| **Incompatibilidade futura de PHP** | Baixa | Médio | Código seguindo boas práticas, fácil atualização |

---

### Métricas de Sucesso

**Após 3 meses de implantação, avaliar:**

1. **Usabilidade:**
   - [ ] Usuários conseguem fazer edições sem suporte técnico
   - [ ] Tempo médio de edição < 15 minutos
   - [ ] Taxa de erro < 5%

2. **Performance:**
   - [ ] Tempo de carregamento da página < 2 segundos
   - [ ] Disponibilidade > 99.5%
   - [ ] Sem impacto no WordPress principal

3. **Satisfação:**
   - [ ] Pesquisa com usuários: 4/5 estrelas mínimo
   - [ ] Gestores satisfeitos com autonomia
   - [ ] TI satisfeita com baixa demanda de suporte

---

### Contatos e Suporte

**Dúvidas Técnicas (Administrador do Servidor):**
- Email: [admin@ppglev.ufrj.br]
- Tel: [xxxx-xxxx]
- Horário: Segunda a sexta, 9h-17h

**Gestão do Projeto (Laboratório de Fonética):**
- Email: [coordenador@labfonac.ufrj.br]
- Tel: [xxxx-xxxx]

**Desenvolvimento:**
- Email: [dev@exemplo.com]
- Documentação: `/wp-content/labfonac/docs/`
- Repositório: [GitHub/GitLab URL]

---

## �📋 Checklist de Implementação

### Fase 1: Preparação e Análise
- [ ] Examinar `package.json` e identificar dependências
- [ ] Verificar se há processo de build necessário
- [ ] Fazer build local (se necessário)
- [ ] Testar página standalone no navegador local
- [ ] Identificar todos os arquivos JSON de dados
- [ ] Mapear dependências de assets (imagens, fontes, etc.)

### Fase 2: Preparação WordPress
- [ ] Fazer backup completo do WordPress
- [ ] Verificar versão do WordPress e PHP
- [ ] Documentar estrutura atual do `wp-content/`
- [ ] Verificar permissões do diretório `wp-content/`

### Fase 3: Upload via SFTP
- [ ] Conectar via cliente SFTP (FileZilla, Cyberduck, etc.)
- [ ] Criar diretório: `/wp-content/labfonac/`
- [ ] Configurar permissões: `755` para o diretório
- [ ] Upload de `index.html`
- [ ] Upload de diretório `css/` completo
- [ ] Upload de diretório `js/` completo
- [ ] Upload de diretório `data/` (JSONs)
- [ ] Upload de diretório `assets/` (imagens, fontes)
- [ ] Verificar permissões de todos os arquivos: `644`
- [ ] Testar acesso direto: `https://seusite.com/wp-content/labfonac/`

### Fase 4: Integração com Menu WordPress
- [ ] Acessar painel WordPress: Aparência > Menus
- [ ] Adicionar "Link Personalizado"
- [ ] URL: `/wp-content/labfonac/` ou caminho absoluto
- [ ] Texto: "Laboratório de Fonética" (ou similar)
- [ ] Configurar atributo: `target="_blank"` (nova aba)
- [ ] Salvar menu
- [ ] Testar navegação no frontend

### Fase 5: Modificações na Página SPA
- [ ] Adicionar botão "Voltar ao Site Principal"
- [ ] Linkar para URL do WordPress
- [ ] Estilizar conforme identidade visual
- [ ] Testar responsividade do botão
- [ ] Validar acessibilidade (alt texts, ARIA labels)

### Fase 6: Solução de Edição de Conteúdo

#### Se Opção A: Plugin WordPress
- [ ] Desenvolver plugin de administração
- [ ] Testar plugin localmente
- [ ] Gerar arquivo .zip do plugin
- [ ] Upload via SFTP para `/wp-content/plugins/`
- [ ] Ativar plugin no painel WordPress
- [ ] Configurar permissões de escrita em `data/`
- [ ] Testar ciclo completo de edição
- [ ] Documentar uso para usuários leigos

#### Se Opção B: Serviço Externo
- [ ] Escolher plataforma (Google Sheets, Airtable, etc.)
- [ ] Criar estrutura de dados
- [ ] Configurar API/compartilhamento público
- [ ] Modificar JavaScript para consumir API
- [ ] Implementar cache local (opcional)
- [ ] Testar com conexões lentas
- [ ] Documentar processo de edição

#### Se Opção C: Manual
- [ ] Documentar estrutura JSON
- [ ] Criar guia de edição para webmaster
- [ ] Definir SLA (tempo de resposta)
- [ ] Estabelecer canal de solicitações

### Fase 7: Testes e Validação
- [ ] Testar em navegadores: Chrome, Firefox, Safari, Edge
- [ ] Testar responsividade: mobile, tablet, desktop
- [ ] Validar todos os links internos
- [ ] Verificar carregamento de imagens
- [ ] Testar funcionalidade de edição de conteúdo
- [ ] Validar performance (PageSpeed Insights)
- [ ] Verificar console do navegador (erros JS)

### Fase 8: Documentação
- [ ] Documentar estrutura de diretórios
- [ ] Manual de atualização via SFTP
- [ ] Guia de edição de conteúdo
- [ ] Procedimentos de backup
- [ ] Contatos de suporte técnico

---

## 🏗️ Estrutura de Diretórios Recomendada

```
wp-content/
└── labfonac/                    # Diretório principal da SPA
    ├── index.html                   # Página principal
    ├── css/
    │   ├── main.css                 # Estilos principais
    │   └── responsive.css           # Media queries (se separado)
    ├── js/
    │   ├── main.js                  # JavaScript principal
    │   ├── adapters/
    │   │   ├── DataAdapter.js
    │   │   └── JSONAdapter.js
    │   ├── modules/
    │   │   └── renderer.js
    │   ├── sections/
    │   │   └── pesquisadores.js
    │   └── utils/
    │       ├── helpers.js
    │       └── sanitizer.js
    ├── data/
    │   └── content.json             # Dados editáveis (775 se plugin)
    ├── assets/
    │   ├── images/
    │   │   ├── logo.png
    │   │   └── photos/
    │   ├── fonts/                   # Se usar fontes customizadas
    │   └── icons/
    └── README.md                    # Documentação local (opcional)
```

---

## 🔧 Configurações Técnicas

### Permissões SFTP

```bash
# Após upload, configurar via cliente SFTP ou SSH (se disponível):

# Diretórios
chmod 755 /wp-content/labfonac
chmod 755 /wp-content/labfonac/css
chmod 755 /wp-content/labfonac/js
chmod 755 /wp-content/labfonac/assets
chmod 775 /wp-content/labfonac/data  # Se plugin precisar escrever

# Arquivos
chmod 644 /wp-content/labfonac/index.html
chmod 644 /wp-content/labfonac/css/*.css
chmod 644 /wp-content/labfonac/js/*.js
chmod 664 /wp-content/labfonac/data/*.json  # Se plugin precisar escrever
```

### Configuração do Menu WordPress

**Opção 1: Link Relativo**
```
URL: /wp-content/labfonac/
Vantagem: Funciona em produção e staging
```

**Opção 2: Link Absoluto**
```
URL: https://seusite.com.br/wp-content/labfonac/
Vantagem: Mais explícito
Desvantagem: Precisa mudar em ambientes diferentes
```

**Atributo Target:**
```html
target="_blank"
rel="noopener noreferrer"  # Segurança
```

### Modificação do HTML (Botão de Retorno)

```html
<!-- Adicionar no header ou footer do index.html -->
<nav class="wp-return-nav">
  <a href="https://seusite.com.br" class="btn-return-wp">
    ← Voltar ao Site Principal
  </a>
</nav>
```

```css
/* Adicionar ao CSS */
.wp-return-nav {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
}

.btn-return-wp {
  display: inline-block;
  padding: 10px 20px;
  background-color: #0073aa;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-return-wp:hover {
  background-color: #005177;
}

/* Responsivo */
@media (max-width: 768px) {
  .wp-return-nav {
    position: static;
    margin: 10px;
  }
}
```

---

## 💡 Recomendações Estratégicas

### Curto Prazo (Imediato)
1. **Deploy básico via SFTP**
   - Upload de todos os arquivos estáticos
   - Configuração do menu WordPress
   - Testes de funcionamento
   
2. **Edição manual assistida**
   - Webmaster como intermediário
   - Usuário solicita mudanças via email/ticket

### Médio Prazo (1-3 meses)
1. **Avaliar volume de edições**
   - Se > 5 edições/mês: considerar plugin
   - Se < 5 edições/mês: manter manual

2. **Desenvolver plugin simples** (se justificável)
   - Interface apenas para campos essenciais
   - Validação de dados
   - Preview antes de salvar

### Longo Prazo (6+ meses)
1. **Migração para CMS Headless** (se orçamento permitir)
   - Contentful, Strapi, ou similar
   - Interface profissional de edição
   - Versionamento de conteúdo

---

## 🎨 Considerações sobre Identidade Visual

### Vantagens do Isolamento
- ✅ CSS independente (sem conflitos com tema WordPress)
- ✅ JavaScript independente (sem conflitos com plugins)
- ✅ Carregamento mais rápido (sem overhead do WordPress)
- ✅ Liberdade total de design

### Pontos de Atenção
- ⚠️ Manter consistência mínima com site principal
  - Logo institucional
  - Cores da universidade (se aplicável)
  - Tipografia similar
  
- ⚠️ Experiência do usuário
  - Botão de retorno visível
  - Indicação clara de que é seção do site

---

## 🔒 Segurança e Boas Práticas

### Segurança de Arquivos
```
✅ Não armazenar senhas ou tokens em JSON público
✅ Validar/sanitizar dados no JavaScript
✅ Usar HTTPS para todas as requisições
✅ Implementar Content Security Policy (CSP)
```

### Backup
```
Frequência: Semanal (mínimo)
Método: Download completo via SFTP
Armazenamento: 3 locais diferentes
Retenção: 30 dias (mínimo)
```

### Performance
```
✅ Minificar CSS e JavaScript (se build process)
✅ Otimizar imagens (WebP, compressão)
✅ Implementar lazy loading para imagens
✅ Usar cache de navegador (.htaccess)
```

---

## 📞 Próximos Passos Recomendados

### 1. Análise Detalhada do Código Atual
- Examinar `package.json` para dependências
- Verificar se há processo de build
- Identificar arquivos de dados (JSON)

### 2. Decisão sobre Edição de Conteúdo
- Definir quem são os usuários leigos
- Estimar frequência de edições
- Escolher entre: Plugin / Serviço Externo / Manual

### 3. Preparação do Ambiente
- Obter credenciais SFTP
- Mapear estrutura do WordPress atual
- Definir URL final da página

### 4. Implementação Faseada
- Fase 1: Deploy básico (somente leitura)
- Fase 2: Integração com menu
- Fase 3: Solução de edição

---

## ❓ Perguntas Pendentes

Para refinar esta avaliação, seria útil responder:

1. **Sobre o projeto atual:**
   - Há processo de build? (npm run build)
   - Quais são as dependências do package.json?
   - O JSON é estático ou será editado frequentemente?

2. **Sobre o WordPress:**
   - Qual a versão do WordPress?
   - Que nível de acesso está disponível? (apenas SFTP ou também painel admin?)
   - Há restrições de plugins ou é possível instalar?

3. **Sobre os usuários:**
   - Quantas pessoas editarão o conteúdo?
   - Qual o perfil técnico dessas pessoas?
   - Qual a frequência esperada de edições?

4. **Sobre orçamento:**
   - Há orçamento para desenvolvimento único de plugin? (investimento inicial)
   - Há orçamento para serviços mensais? (ex: CMS headless)
   - Há disponibilidade de webmaster para edições manuais?

---

## 📚 Recursos Adicionais

### Ferramentas SFTP Recomendadas
- **FileZilla** (Windows, Mac, Linux) - Gratuito
- **Cyberduck** (Mac, Windows) - Gratuito
- **WinSCP** (Windows) - Gratuito
- **Transmit** (Mac) - Pago, interface excelente

### Tutoriais WordPress
- [Adicionar Links Externos ao Menu](https://wordpress.org/support/article/custom-links/)
- [Gerenciamento de wp-content](https://developer.wordpress.org/themes/basics/organizing-theme-files/)

### Validadores
- [Validador HTML](https://validator.w3.org/)
- [JSONLint](https://jsonlint.com/) - Validar sintaxe JSON
- [PageSpeed Insights](https://pagespeed.web.dev/) - Performance

---

## 📄 Conclusão

A integração do projeto SPA no ambiente WordPress é **tecnicamente viável** com acesso SFTP, mas requer **planejamento cuidadoso** especialmente para a funcionalidade de edição de conteúdo por usuários leigos.

**Recomendação Principal:**
1. Implementar **deploy básico** imediatamente (baixo risco, custo zero)
2. Iniciar com **edições manuais assistidas**
3. Avaliar **necessidade de plugin** após 2-3 meses de uso
4. Investir em **automação** apenas se justificado pelo volume de edições

Esta abordagem faseada minimiza riscos e custos iniciais, permitindo validar o modelo antes de investimentos maiores.

---

## 📦 Apêndice: Código de Exemplo do Sistema Administrativo

### Estrutura Completa de Arquivos

Para demonstração técnica e avaliação de viabilidade pelos gestores e administrador do servidor, apresentamos a estrutura completa do sistema administrativo proposto:

```
wp-content/labfonac/admin/
├── .htaccess                    # Proteção de arquivos sensíveis
├── index.php                    # Redireciona para login/dashboard
├── login.php                    # Interface de autenticação
├── dashboard.php                # Painel de controle principal
├── save.php                     # Processamento de salvamentos
├── upload.php                   # Gerenciamento de uploads
├── logout.php                   # Encerramento de sessão
├── auth/
│   ├── session.php              # Gerenciamento de sessões PHP
│   ├── users.php                # CRUD de usuários
│   └── users.json               # Banco de dados de usuários (600)
├── css/
│   └── admin.css                # Estilos da interface administrativa
└── js/
    └── admin.js                 # JavaScript do painel
```

### Principais Características do Código

**1. Sistema de Autenticação (`auth/session.php`):**
- Sessions PHP com nome único (`LABFONAC_SESSION`)
- Timeout de 2 horas de inatividade
- Regeneração de ID de sessão após login (anti-fixation)
- Validação de IP opcional
- Funções: `isAuthenticated()`, `login()`, `logout()`, `requireAuth()`

**2. Gerenciamento de Usuários (`auth/users.php`):**
- Armazenamento em JSON (não usa banco MySQL do WordPress)
- Senhas com hash bcrypt (custo 10)
- Funções: `authenticateUser()`, `createUser()`, `changePassword()`
- Usuário admin padrão criado automaticamente

**3. Interface de Login (`login.php`):**
- Formulário HTML simples e responsivo
- Validação server-side
- Mensagens de erro amigáveis
- Link para voltar ao site público
- Proteção contra timing attacks

**4. Dashboard Administrativo (`dashboard.php`):**
- Sidebar com navegação entre seções (Conteúdo, Equipe, Pesquisas, Imagens)
- Formulários com validação HTML5
- Campos dinâmicos (adicionar/remover membros da equipe)
- Botão de pré-visualização (abre página pública)
- Auto-salvamento de rascunhos no localStorage
- Confirmação antes de sair sem salvar

**5. Salvamento de Dados (`save.php`):**
- Validação server-side de todos os campos
- Backup automático antes de sobrescrever
- Mantém histórico de 10 últimos backups
- Registra timestamp e usuário que fez a alteração
- Retorna mensagem de sucesso/erro

**6. Segurança (`.htaccess`):**
```apache
# Bloqueia acesso direto ao users.json
<Files "users.json">
    Order Allow,Deny
    Deny from all
</Files>

# Desabilita listagem de diretórios
Options -Indexes

# Proteção contra injeção
php_flag display_errors Off
```

**7. Estilos (`css/admin.css`):**
- Design moderno e responsivo
- Gradiente na página de login
- Grid layout para dashboard
- Formulários estilizados com validação visual
- Mobile-first approach
- Compatível com todos navegadores modernos

**8. JavaScript (`js/admin.js`):**
- Navegação entre seções sem reload
- Adicionar/remover itens dinamicamente (equipe, publicações)
- Auto-salvamento de rascunhos a cada 2 minutos
- Restauração de rascunhos ao recarregar
- Confirmação antes de sair com mudanças não salvas
- Preview da página em nova aba

### Exemplo de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│ Usuário acessa: /wp-content/labfonac/admin/            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ index.php: Verifica sessão                              │
│  - Logado? → dashboard.php                              │
│  - Não logado? → login.php                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ login.php: Formulário de autenticação                   │
│  POST username/password                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ auth/users.php: authenticateUser()                      │
│  - Busca em users.json                                  │
│  - Verifica hash bcrypt                                 │
│  - Retorna usuário ou false                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ auth/session.php: login()                               │
│  - Regenera session ID                                  │
│  - Armazena user_id, username                           │
│  - Redireciona para dashboard                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ dashboard.php: Interface de edição                      │
│  - Carrega content.json atual                           │
│  - Exibe formulários preenchidos                        │
│  - JavaScript gerencia interação                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Usuário edita e clica "Salvar"                          │
│  POST com todos os dados do formulário                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ save.php: Processamento                                 │
│  1. requireAuth() verifica sessão                       │
│  2. Valida todos os campos                              │
│  3. Faz backup de content.json                          │
│  4. Escreve novo content.json                           │
│  5. Remove backups antigos (mantém 10)                  │
│  6. Redireciona com mensagem de sucesso                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Visitante acessa: /wp-content/labfonac/index.html      │
│  - JavaScript faz fetch('data/content.json')            │
│  - Recebe JSON atualizado                               │
│  - Renderiza página com novos dados                     │
└─────────────────────────────────────────────────────────┘
```

### Exemplo de Estrutura JSON

```json
{
  "title": "Laboratório de Fonética Experimental",
  "subtitle": "Universidade Federal do Rio de Janeiro",
  "description": "O Laboratório de Fonética Experimental da UFRJ desenvolve pesquisas nas áreas de fonética acústica, percepção de fala e processamento de linguagem natural.",
  "team": [
    {
      "name": "Prof. Dr. João Silva",
      "role": "Coordenador",
      "bio": "Doutor em Linguística pela UFRJ, especialista em fonética acústica.",
      "photo": "assets/uploads/joao-silva.jpg"
    },
    {
      "name": "Profa. Dra. Maria Santos",
      "role": "Pesquisadora",
      "bio": "Doutora em Ciências da Computação, foco em processamento de fala.",
      "photo": "assets/uploads/maria-santos.jpg"
    }
  ],
  "research": [
    {
      "title": "Análise Acústica de Vogais do Português Brasileiro",
      "description": "Estudo detalhado das características acústicas das vogais em diferentes contextos fonéticos.",
      "year": 2024,
      "status": "em andamento"
    }
  ],
  "updated_at": "2025-11-05 14:30:00",
  "updated_by": "coordenador"
}
```

### Requisitos de Instalação

**Para o Administrador do Servidor:**

1. **Criar estrutura de diretórios:**
```bash
cd /path/to/wordpress/wp-content/
mkdir -p labfonac/{admin/{auth,css,js},data/backups,assets/uploads}
```

2. **Upload de arquivos via SFTP:**
   - Todos os arquivos PHP em `admin/`
   - Arquivos CSS e JS em subpastas
   - Permissões iniciais: 644 para arquivos, 755 para diretórios

3. **Ajustar permissões críticas:**
```bash
# Permitir escrita em dados e uploads
chmod 775 labfonac/data
chmod 775 labfonac/data/backups
chmod 775 labfonac/assets/uploads

# Proteger arquivo de usuários
chmod 600 labfonac/admin/auth/users.json

# Proprietário correto (www-data no Ubuntu, apache no CentOS)
chown -R www-data:www-data labfonac/
```

4. **Testar instalação:**
   - Acessar: `https://seusite.com/wp-content/labfonac/admin/`
   - Login padrão: `admin` / `labfonac2025`
   - **IMPORTANTE:** Alterar senha imediatamente após primeiro acesso

5. **Configurar backup:**
```bash
# Adicionar ao cron diário
0 3 * * * tar -czf /backups/labfonac_$(date +\%Y\%m\%d).tar.gz /path/to/wp-content/labfonac/data/
```

### Considerações de Desenvolvimento

**Se a instituição optar por desenvolver internamente:**

- **Linguagem:** PHP puro (sem frameworks para simplicidade)
- **Dependências:** Zero (usa apenas PHP nativo)
- **Compatibilidade:** PHP 7.4+, funciona em qualquer servidor WordPress
- **Tamanho do código:** ~1.500 linhas total (bem documentado)
- **Tempo estimado:** 16-24 horas para desenvolvedor experiente

**Se contratar desenvolvimento externo:**

- **Especificação:** Este documento serve como especificação completa
- **Entregáveis:** Código-fonte + documentação + treinamento
- **Garantia:** Suporte de 30-60 dias pós-implantação
- **Custo estimado:** R$ 2.400 - R$ 4.800 (conforme análise comparativa)

### Melhorias Futuras Possíveis

Após implantação básica, o sistema pode ser expandido:

1. **Gestão de múltiplos idiomas** (português/inglês)
2. **Editor WYSIWYG** para textos longos (TinyMCE/CKEditor)
3. **Galeria de imagens** com crop e resize automático
4. **Versionamento de conteúdo** (histórico de alterações)
5. **Agendamento de publicações** (publicar em data futura)
6. **Notificações por email** quando conteúdo é alterado
7. **Integração com Google Analytics** (estatísticas no dashboard)
8. **API REST** para integração com outros sistemas

Cada melhoria adiciona 4-8 horas de desenvolvimento.

---

**Documento criado em:** 05/11/2025  
**Última atualização:** 05/11/2025  
**Versão:** 2.0

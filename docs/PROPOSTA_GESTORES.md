# Proposta: Website Institucional do Laboratório de Fonética

**Para:** Gestores PPGLEV e Administrador do Servidor  
**De:** Laboratório de Fonética UFRJ  
**Data:** 05 de novembro de 2025  
**Assunto:** Solicitação de hospedagem no ambiente WordPress institucional

---

## 📋 Resumo Executivo

Solicitamos autorização para hospedar o website institucional do Laboratório de Fonética dentro do ambiente WordPress do PPGLEV, utilizando o diretório `/wp-content/labfonac/`, com sistema de administração completamente independente.

**Investimento Total Estimado:** R$ 3.000 - R$ 5.000 (único)  
**Economia Anual:** R$ 500 - R$ 1.000 (vs. hospedagem separada)  
**Tempo de Implementação:** 5-6 semanas  
**Impacto no PPGLEV:** Mínimo (isolamento completo)

---

## 🎯 Objetivos

1. **Reduzir custos** aproveitando infraestrutura WordPress existente
2. **Manter identidade visual própria** do Laboratório de Fonética
3. **Garantir autonomia administrativa** sem acesso ao wp-admin do PPGLEV
4. **Facilitar manutenção** com interface amigável para usuários leigos

---

## 💡 Solução Proposta

### Arquitetura

```
WordPress PPGLEV (inalterado)
    ↓
Menu: "Laboratório de Fonética" → Nova aba
    ↓
/wp-content/labfonac/
    ├── index.html (página pública estática)
    ├── admin/ (sistema de edição independente)
    └── data/ (conteúdo em JSON)
```

### Características Principais

✅ **Página estática** (HTML/CSS/JavaScript) - alta performance  
✅ **Sistema administrativo próprio** - autenticação independente do WordPress  
✅ **Edição visual** - interface amigável sem conhecimento técnico  
✅ **Backups automáticos** - segurança de dados  
✅ **Isolamento total** - zero impacto no WordPress principal

---

## 💰 Análise de Custos

### Opção 1: Hospedagem Separada (NÃO recomendada)
- Hospedagem: R$ 500-1.000/ano (recorrente)
- Domínio: R$ 40/ano
- Manutenção duplicada
- **Total 3 anos:** R$ 1.620+

### Opção 2: Integração WordPress (RECOMENDADA)
- Desenvolvimento: R$ 3.000-5.000 (único)
- Hospedagem: R$ 0 (usa infraestrutura existente)
- Manutenção: R$ 600-1.200/ano
- **Total 3 anos:** R$ 4.800

**ECONOMIA:** R$ 1.620+ em 3 anos + Simplificação operacional

---

## 🔧 Requisitos Técnicos

### O que precisamos do Administrador do Servidor

1. **Criação de diretório:**
   ```bash
   mkdir /wp-content/labfonac
   chown www-data:www-data /wp-content/labfonac
   ```

2. **Permissões específicas:**
   - Diretórios: 755
   - Arquivos: 644
   - Dados editáveis: 775 (apenas `/data/` e `/assets/uploads/`)

3. **Inclusão em backup:** Adicionar `/wp-content/labfonac/data/` à rotina existente

4. **Tempo estimado:** 2-4 horas de trabalho (setup único)

### O que o Lab Fonética fornece

- Todo o código e assets
- Gestão de conteúdo
- Suporte aos usuários finais
- Manutenção do sistema administrativo

---

## 🛡️ Segurança e Isolamento

### Garantias de Não-Interferência

| Aspecto | Status | Detalhes |
|---------|--------|----------|
| **Banco de Dados** | ✅ Isolado | Não usa MySQL do WordPress |
| **Usuários** | ✅ Isolado | Sistema de autenticação próprio |
| **Código WordPress** | ✅ Isolado | Não interage com core/plugins |
| **Tema** | ✅ Isolado | CSS/JS completamente independentes |
| **Performance** | ✅ Otimizado | Página estática = carga mínima |

### Medidas de Segurança

- ✅ Senhas com hash bcrypt
- ✅ Proteção `.htaccess` em arquivos sensíveis
- ✅ Timeout de sessão (2 horas)
- ✅ Validação server-side de todos inputs
- ✅ Logs de auditoria de alterações

---

## 📅 Cronograma

| Semana | Atividade | Responsável | Entregável |
|--------|-----------|-------------|------------|
| 1 | Aprovação e alinhamento | Gestores | Autorização formal |
| 1 | Configuração servidor | Admin TI | Diretório pronto |
| 2 | Upload página básica | Lab Fon | Site acessível |
| 2-5 | Desenvolvimento admin | Dev Externo | Sistema de edição |
| 6 | Testes e treinamento | Todos | Go-live |

**Prazo total:** 6 semanas  
**Esforço TI PPGLEV:** ~4 horas (setup + acompanhamento)

---

## 🎓 Benefícios Institucionais

### Para o PPGLEV

1. **Fortalecimento da presença digital** dos laboratórios vinculados
2. **Valorização da pesquisa** com melhor divulgação
3. **Economia de recursos** (infraestrutura compartilhada)
4. **Modernização** sem custos adicionais significativos

### Para o Lab Fonética

1. **Autonomia** para gerir conteúdo sem intermediários
2. **Identidade visual própria** alinhada à pesquisa
3. **Facilidade de uso** para equipe sem perfil técnico
4. **Profissionalização** da comunicação institucional

---

## ❓ FAQ - Perguntas Frequentes

### 1. Isso vai deixar o site do PPGLEV mais lento?
**Não.** A página é estática e carrega independentemente. O sistema administrativo só é acessado durante edições (raramente).

### 2. Usuários do Lab Fonética terão acesso ao wp-admin?
**Não.** Sistema de autenticação completamente separado. Zero acesso ao WordPress principal.

### 3. E se o Lab Fonética quiser migrar depois?
**Fácil.** Todo o conteúdo está em arquivos estáticos. Basta copiar a pasta via SFTP para outro servidor.

### 4. Quem fará manutenção técnica?
**Lab Fonética.** TI do PPGLEV apenas mantém infraestrutura básica (servidor, backups). Conteúdo e sistema são responsabilidade do laboratório.

### 5. Há riscos de segurança para o WordPress?
**Mínimos.** Sistema isolado, código auditado, sem interação com WordPress core. Risco comparável a ter uma pasta de imagens no servidor.

---

## ✅ Checklist de Aprovação

### Gestores PPGLEV
- [ ] Aprovar uso de espaço em `/wp-content/` 
- [ ] Autorizar sistema administrativo independente
- [ ] Confirmar alinhamento com identidade institucional
- [ ] Aprovar investimento (se orçamento institucional)

### Administrador do Servidor
- [ ] Confirmar capacidade técnica (PHP 7.4+, espaço em disco)
- [ ] Aprovar permissões de escrita em subdiretório
- [ ] Incluir em rotina de backups
- [ ] Revisar configurações de segurança propostas

### Laboratório de Fonética
- [ ] Confirmar disponibilidade de conteúdo
- [ ] Alocar orçamento para desenvolvimento
- [ ] Designar responsável técnico
- [ ] Comprometer-se com gestão de conteúdo

---

## 📞 Contatos

**Laboratório de Fonética:**
- Coordenador: [Nome]
- Email: [email@labfonac.ufrj.br]
- Tel: [xxxx-xxxx]

**Desenvolvimento (se contratado):**
- Empresa/Profissional: [Nome]
- Email: [dev@exemplo.com]
- Tel: [xxxx-xxxx]

---

## 📎 Documentação Complementar

Para análise técnica detalhada, consultar:

1. **`WORDPRESS_DEPLOYMENT_EVALUATION.md`**
   - Avaliação completa de viabilidade
   - Análise comparativa de soluções
   - Especificações técnicas detalhadas

2. **`docs/ADMIN_SYSTEM_CODE_EXAMPLES.md`**
   - Exemplos de código completos
   - Estrutura de arquivos
   - Instruções de instalação

---

## 🚀 Próximos Passos

1. **Reunião de alinhamento** com gestores e TI (1 hora)
2. **Aprovação formal** via email ou documento assinado
3. **Configuração inicial** do servidor (meia jornada de trabalho)
4. **Kick-off do desenvolvimento** (se aprovado orçamento)

**Estamos à disposição para esclarecer dúvidas e ajustar a proposta conforme necessário.**

---

**Data:** 05/11/2025  
**Versão:** 1.0  
**Status:** Aguardando aprovação

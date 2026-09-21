# Índice de documentação

Este índice separa a documentação vigente do material histórico produzido durante o desenvolvimento do Lab-FON e do Editor Labfonac.

## Uso do Editor

- [Guia do Usuário do Editor Labfonac](docs/GUIA-DO-USUARIO.md): instalação, abertura do projeto remoto, edição, revisão e publicação para mantenedores não técnicos.

## Desenvolvimento e versões

- [README](README.md): visão geral, comandos principais e divisão entre uso comum e desenvolvimento.
- [Instruções do projeto](AGENTS.md): arquitetura, segurança, acessibilidade, testes e disciplina de mudança.
- [Publicação e empacotamento](DEPLOYMENT.md): geração e validação do site e do aplicativo Windows.
- [Contrato de seções personalizadas](docs/CUSTOM_SECTION_CONTRACT.md): contrato técnico para blocos de página suportados.
- [Esquema das linhas de pesquisa](docs/RESEARCH_LINES_SCHEMA.md): referência técnica dos dados dessa seção.
- [Estratégia de gestão de conteúdo](docs/decisions/001-content-management-strategy.md): decisão arquitetural sobre conteúdo estruturado e edição.

## Estado e evidências da versão

- [Baseline editorial](docs/RELEASE_BASELINE_2026-09-16.md): registro detalhado da baseline aceita durante a preparação da versão.
- [Relatório de aceitação C2](docs/C2-manual-acceptance-report-2026-09-13.md): resultados da aceitação manual do Editor.
- [Log de desenvolvimento atual](docs/DEVELOPMENT_LOG.md): histórico recente da implementação e das verificações.
- [Relatório de sanitização](docs/SANITIZATION_REPORT_2026-09-11.md): decisões anteriores sobre arquivos preservados e removidos.

Os relatórios de reteste em `docs/` registram evidências pontuais de aceitação. Eles não substituem o guia do usuário nem descrevem, isoladamente, o estado atual completo.

## Material histórico

Documentos como avaliações de WordPress, propostas de backend, registros de sessões, o walking skeleton e planos de implementação foram preservados como histórico de decisões. Eles podem conter estados, números de testes, caminhos ou fluxos antigos e não devem ser usados como instruções operacionais atuais.

Para qualquer operação cotidiana, comece pelo [guia do usuário](docs/GUIA-DO-USUARIO.md). Para desenvolvimento, comece pelo [README](README.md) e por [AGENTS.md](AGENTS.md).

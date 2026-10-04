# Índice de documentação

Este índice separa a documentação vigente do material histórico produzido durante o desenvolvimento do Lab-FON e do Editor Labfonac.

## Uso do Editor

- [Guia do Usuário do Editor Labfonac](docs/GUIA-DO-USUARIO.md): instalação, abertura do projeto remoto, edição, revisão e publicação para mantenedores não técnicos.
- O guia descreve **Atualizar site**, recuperação explícita e revisão de limpeza somente leitura na release v1.1.0.

## Desenvolvimento e versões

- [README](README.md): visão geral, comandos principais e divisão entre uso comum e desenvolvimento.
- [Instruções do projeto](AGENTS.md): arquitetura, segurança, acessibilidade, testes e disciplina de mudança.
- [Publicação e empacotamento](DEPLOYMENT.md): geração e validação do site e do aplicativo Windows.
- [Handover final de arquitetura e operações](docs/ARCHITECTURE_AND_OPERATIONS_HANDOVER.md): suporte técnico, destinos oficiais, ambiente, recuperação, custódia, estimativa de esforço e responsabilidades institucionais pendentes.
- [Contrato de seções personalizadas](docs/CUSTOM_SECTION_CONTRACT.md): proposta C0 preservada como histórico de design; implementação C2 posteriormente aceita no relatório de aceitação.
- [Esquema das linhas de pesquisa](docs/RESEARCH_LINES_SCHEMA.md): referência técnica dos dados dessa seção.
- [Estratégia de gestão de conteúdo](docs/decisions/001-content-management-strategy.md): decisão arquitetural sobre conteúdo estruturado e edição.

## Estado e evidências da versão

- [Release 1.1.0 e aceitação do candidato](docs/RELEASE_CANDIDATE_1.1.0.md): entradas, proveniência do tag, artefatos/checksums e aceitação instalada/portátil. [Download oficial](https://github.com/Wisleyv/lab-fon-ufrj/releases/tag/v1.1.0).
- [Notas de release 1.1.0](docs/RELEASE_NOTES_1.1.0.md): novidades, instalação, integridade e limites aceitos.

- [Fechamento e higiene após a release](docs/FINAL_CLOSURE_ASSESSMENT.md): avaliação das cinco fases, destino de branches/PRs, limpeza local verificada e pendências institucionais.
- [Inventário de entrega e preservação](docs/DELIVERY_INVENTORY.md): inventário datado da Fase 1, capturas e requisitos de custódia; suas lacunas documentais foram superadas pelas fases posteriores.
- [Convergência de produção aceita em 2026-10-03](docs/PRODUCTION_CONVERGENCE_2026-10-03.md): registro sanitizado do estado operacional; substitui as pendências de produção dos checkpoints anteriores, sem autorizar limpeza ou nova publicação.
- [Auditoria de continuidade e reproducibilidade](docs/CONTINUITY_REPRODUCIBILITY_AUDIT.md): evidência datada da Fase 3 aprovada por setup/retrieval institucional novos e aceitação cumulativa; condição DNS/TLS descartável não bloqueante. Preparação e publicação posteriores estão no registro de release.
- [Baseline editorial](docs/RELEASE_BASELINE_2026-09-16.md): registro detalhado da baseline aceita durante a preparação da versão.
- [Relatório de aceitação C2](docs/C2-manual-acceptance-report-2026-09-13.md): resultados da aceitação manual do Editor.
- [Log de desenvolvimento atual](docs/DEVELOPMENT_LOG.md): histórico recente da implementação e das verificações.
- [Relatório de sanitização](docs/SANITIZATION_REPORT_2026-09-11.md): decisões anteriores sobre arquivos preservados e removidos.
- [Aceitação em FTP descartável](docs/DISPOSABLE_FTP_ACCEPTANCE_REPORT.md): falha/retry, interrupção, recuperação pública/fonte e revisão sem exclusão.
- [Contrato de backup e recuperação](docs/BACKUP_RECOVERY_CONTRACT.md), [atualização guiada](docs/PHASE_7_GUIDED_UPDATE_VERIFICATION.md) e [limpeza somente leitura](docs/PHASE_8_CLEANUP_VERIFICATION.md): referências técnicas; suas pendências históricas são contextualizadas pelas aceitações posteriores.

Os relatórios de reteste em `docs/` registram evidências pontuais de aceitação. Eles não substituem o guia do usuário nem descrevem, isoladamente, o estado atual completo.

## Material histórico

Documentos como avaliações de WordPress, propostas de backend, registros de sessões, o walking skeleton e planos de implementação foram preservados como histórico de decisões. Eles podem conter estados, números de testes, caminhos ou fluxos antigos e não devem ser usados como instruções operacionais atuais.

Para qualquer operação cotidiana, comece pelo [guia do usuário](docs/GUIA-DO-USUARIO.md). Para desenvolvimento, comece pelo [README](README.md) e por [AGENTS.md](AGENTS.md).

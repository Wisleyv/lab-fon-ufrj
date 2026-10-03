# Lab-FON UFRJ

Site institucional do Laboratório de Fonética da Universidade Federal do Rio de Janeiro e seu aplicativo de manutenção, o Editor Labfonac.

O **Editor Labfonac** foi concebido e desenvolvido por **Wisley Vilela**, com financiamento de **PPGLEV/UFRJ**. É uma ferramenta específica para projetos e servidores compatíveis com o fluxo LAB-FON.

Este repositório distribui software, documentação, contratos e exemplos sintéticos. O conteúdo de produção fica fora do Git: `content/`, dados gerados e fotografias locais não são distribuídos. Sem `content/`, `npm run build` usa `examples/content/` para gerar um site demonstrativo; isso não constitui conteúdo publicável de produção. O build desktop contém somente o Editor e não copia `public/`. Consulte [a política e auditoria de conteúdo](docs/REPOSITORY_CONTENT_BOUNDARY.md).

O site é estático e pode ser hospedado em um servidor FTP comum. O conteúdo institucional permanece separado da apresentação, passa pelos adaptadores e renderizadores do projeto e é convertido em arquivos estáticos pelo Vite.

## Para quem mantém o conteúdo

Use a versão empacotada do **Lab-FON Editor**. O aplicativo recupera o projeto remoto, permite editar e revisar o conteúdo, gera o site e conduz a atualização e a publicação. Não é necessário instalar Node.js, editar JSON ou operar um cliente FTP.

Consulte o [Guia do Usuário do Editor Labfonac](docs/GUIA-DO-USUARIO.md) para instalação e uso cotidiano.

O instalador e a distribuição portátil são artefatos de versão; binários gerados não são armazenados neste repositório.

## Para desenvolvimento

### Requisitos

- Node.js compatível com o projeto;
- npm;
- Windows para executar e empacotar o aplicativo desktop.

### Comandos principais

```powershell
npm ci
npm run dev
npm test -- --run
npm run build
npm run editor:dev
npm run editor:build
```

- `npm run dev`: inicia o site em desenvolvimento.
- `npm test -- --run`: executa a suíte de testes uma vez.
- `npm run build`: gera o site estático.
- `npm run editor:dev`: abre o Editor em modo de desenvolvimento.
- `npm run editor:build`: gera o instalador NSIS para Windows e a distribuição não instalada.

Os detalhes de publicação e empacotamento estão em [DEPLOYMENT.md](DEPLOYMENT.md). As instruções permanentes de arquitetura e manutenção estão em [AGENTS.md](AGENTS.md).

## Arquitetura

```text
Conteúdo estruturado
        ↓
    DataAdapter
        ↓
   Renderizadores
        ↓
       Vite
        ↓
   Site estático
        ↓
       FTP
```

Princípios do projeto:

- site de produção inteiramente estático;
- conteúdo separado da apresentação;
- edição por componentes e campos controlados;
- publicação pelo Editor Labfonac;
- credenciais e binários fora do Git;
- acessibilidade e manutenção institucional de longo prazo.

## Documentação

- [Guia do usuário](docs/GUIA-DO-USUARIO.md): instalação e operação por mantenedores de conteúdo.
- [Índice de documentação](DOCUMENTATION_INDEX.md): referências atuais, técnicas e históricas.
- [Publicação e empacotamento](DEPLOYMENT.md): orientação para desenvolvedores e responsáveis pela versão.
- [Instruções do projeto](AGENTS.md): restrições arquiteturais e práticas de desenvolvimento.

## Segurança

Nunca registre no repositório senhas de FTP, tokens, chaves ou dados privados. As credenciais de publicação são mantidas fora do código-fonte.

## Licença

Software de código aberto sob a [MIT License](LICENSE). O financiamento não altera a licença. A licença do software não concede direitos sobre conteúdo institucional ou fotografias mantidos fora deste repositório.

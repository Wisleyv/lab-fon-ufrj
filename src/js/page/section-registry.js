import { ExtensaoSection } from "../sections/extensao.js";
import { LinhasPesquisaSection } from "../sections/linhas-pesquisa.js";
import { ParceriasSection } from "../sections/parcerias.js";
import { PesquisadoresSection } from "../sections/pesquisadores.js";
import { PublicacoesSection } from "../sections/publicacoes.js";

export const SECTION_REGISTRY = {
  sobre: {
    type: "sobre",
    label: "Sobre",
    sectionId: "sobre",
    renderable: false,
    unique: true,
  },
  linhas_pesquisa: {
    type: "linhas_pesquisa",
    label: "Linhas de Pesquisa",
    sectionId: "linhas-pesquisa",
    containerId: "linhas-pesquisa-content",
    dataSource: "site",
    dataKey: "linhas_pesquisa",
    Renderer: LinhasPesquisaSection,
    unique: true,
    rendererOptions: {
      loadingMessage: "Carregando linhas de pesquisa...",
      errorMessage: "Não foi possível carregar as linhas de pesquisa.",
      emptyMessage: "Nenhuma linha de pesquisa cadastrada.",
    },
  },
  equipe: {
    type: "equipe",
    label: "Equipe",
    sectionId: "pesquisadores",
    containerId: "pesquisadores-container",
    dataSource: "site",
    dataKey: "equipe",
    Renderer: PesquisadoresSection,
    unique: true,
    rendererOptions: {
      loadingMessage: "Carregando equipe...",
      errorMessage: "Não foi possível carregar a equipe.",
      emptyMessage: "Nenhum membro da equipe cadastrado.",
    },
  },
  publicacoes: {
    type: "publicacoes",
    label: "Publicações",
    sectionId: "trabalhos",
    containerId: "publicacoes-content",
    dataSource: "publications",
    dataKey: "references",
    Renderer: PublicacoesSection,
    unique: true,
    rendererOptions: {
      loadingMessage: "Carregando publicações...",
      errorMessage: "Não foi possível carregar as publicações.",
      emptyMessage: "Nenhuma publicação cadastrada.",
    },
  },
  extension: {
    type: "extension",
    label: "Extensão",
    sectionId: "extensao",
    containerId: "extensao-content",
    dataSource: "site",
    dataKey: "extensao",
    Renderer: ExtensaoSection,
    unique: true,
    rendererOptions: {
      loadingMessage: "Carregando extensão...",
      errorMessage: "Não foi possível carregar extensão.",
      emptyMessage: "Nenhuma atividade de extensão cadastrada.",
    },
  },
  parcerias: {
    type: "parcerias",
    label: "Parcerias",
    sectionId: "parcerias",
    containerId: "parcerias-content",
    dataSource: "site",
    dataKey: "parcerias",
    Renderer: ParceriasSection,
    unique: true,
    rendererOptions: {
      loadingMessage: "Carregando parcerias...",
      errorMessage: "Não foi possível carregar as parcerias.",
      emptyMessage: "Nenhuma parceria cadastrada.",
    },
  },
};

export function getSectionDefinition(type, registry = SECTION_REGISTRY) {
  return registry[type] || null;
}

export function isRenderableSection(type, registry = SECTION_REGISTRY) {
  const definition = getSectionDefinition(type, registry);
  return Boolean(definition?.Renderer && definition?.containerId);
}

export function createSectionRenderer(type, registry = SECTION_REGISTRY) {
  const definition = getSectionDefinition(type, registry);

  if (!definition) {
    throw new Error(`Unsupported section type: ${type}`);
  }

  if (!isRenderableSection(type, registry)) {
    return null;
  }

  return new definition.Renderer(
    definition.containerId,
    definition.rendererOptions,
  );
}

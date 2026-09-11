export const DEFAULT_PAGE_SECTIONS = [
  {
    id: "sobre",
    type: "sobre",
    enabled: true,
    order: 1,
    navigation: {
      visible: true,
      label: "Sobre",
      children: [
        {
          label: "O Laboratório",
          targetId: "sobre",
        },
        {
          label: "Linhas de Pesquisa",
          type: "linhas_pesquisa",
        },
        {
          label: "Parcerias",
          type: "parcerias",
        },
      ],
    },
    presentation: {
      variant: "default",
    },
  },
  {
    id: "linhas-pesquisa",
    type: "linhas_pesquisa",
    enabled: true,
    order: 2,
    navigation: {
      visible: false,
      label: "Linhas de Pesquisa",
    },
    presentation: {
      variant: "cards",
    },
  },
  {
    id: "pesquisadores",
    type: "equipe",
    enabled: true,
    order: 3,
    navigation: {
      visible: true,
      label: "Equipe",
    },
    presentation: {
      variant: "grouped",
    },
  },
  {
    id: "publicacoes",
    type: "publicacoes",
    enabled: true,
    order: 4,
    navigation: {
      visible: true,
      label: "Publicações",
    },
    presentation: {
      variant: "default",
    },
    lifecycle: {
      status: "scheduled_removal",
    },
  },
  {
    id: "extensao",
    type: "extension",
    enabled: false,
    order: 5,
    navigation: {
      visible: true,
      label: "Extensão",
    },
    presentation: {
      variant: "default",
    },
  },
  {
    id: "parcerias",
    type: "parcerias",
    enabled: true,
    order: 6,
    navigation: {
      visible: false,
      label: "Parcerias",
    },
    presentation: {
      variant: "default",
    },
  },
];

export function createDefaultPageComposition() {
  return {
    kind: "single-page",
    sections: DEFAULT_PAGE_SECTIONS.map((section) => ({ ...section })),
  };
}

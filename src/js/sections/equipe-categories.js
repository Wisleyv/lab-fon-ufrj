export const EQUIPE_CATEGORIES = [
  {
    id: "fundador",
    title: "Fundador do Laboratório de Fonética Acústica",
    order: 1,
    current: false,
  },
  {
    id: "docentes",
    title: "Docentes",
    order: 2,
    current: true,
  },
  {
    id: "doutorandas",
    title: "Doutorandas",
    order: 3,
    current: false,
  },
  {
    id: "mestres",
    title: "Mestres",
    order: 4,
    current: false,
  },
  {
    id: "mestrandos",
    title: "Mestrandos",
    order: 5,
    current: false,
  },
  {
    id: "graduadas",
    title: "Graduadas",
    order: 6,
    current: false,
  },
  {
    id: "graduandos",
    title: "Graduandos",
    order: 7,
    current: false,
  },
  {
    id: "egressos",
    title: "Egressos",
    order: 8,
    current: true,
  },
  {
    id: "coordenacao",
    title: "Coordenação",
    order: 20,
    current: true,
    legacy: true,
  },
  {
    id: "pos_graduacao",
    title: "Discentes de Pós-Graduação",
    order: 30,
    current: true,
    legacy: true,
  },
  {
    id: "graduacao",
    title: "Discentes de Graduação",
    order: 40,
    current: true,
    legacy: true,
  },
];

export function getEquipeCategoryMap(categories = EQUIPE_CATEGORIES) {
  return categories.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});
}

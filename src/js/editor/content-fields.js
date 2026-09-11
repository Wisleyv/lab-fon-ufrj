import { EQUIPE_CATEGORIES } from "../sections/equipe-categories.js";

const text = (key, label, required = false) => ({ key, label, required });
const area = (key, label, required = false) => ({ key, label, required, type: "textarea" });
const url = (key, label) => ({ key, label, type: "url" });
const group = (key, label, fields) => ({ key, label, fields });
const list = (key, label, fields, empty) => ({ key, label, fields, empty, type: "list" });
const linkFields = [text("label", "Rótulo"), url("href", "Destino")];
const personFields = [text("name", "Nome"), text("role", "Função")];

export const CONTENT_DATASETS = {
  site: {
    label: "Site", singleton: true,
    fields: [
      group("header", "Cabeçalho", [text("title", "Título", true), text("subtitle", "Subtítulo"),
        group("logo", "Logotipo", [url("source", "Imagem"), url("fallback", "Imagem alternativa"), text("srcset", "Imagens por resolução"), text("alt", "Descrição da imagem", true)])]),
      group("hero", "Apresentação", [text("title", "Título", true), area("description", "Descrição"),
        list("actions", "Links", [...linkFields, { key: "style", label: "Estilo", options: ["primary", "secondary"] }], { label: "", href: "", style: "secondary" })]),
      group("sobre", "Sobre", [text("title", "Título", true), list("paragraphs", "Parágrafos", [text("label", "Rótulo"), area("text", "Texto")], "")]),
      group("footer", "Rodapé", [
        list("sections", "Blocos", [text("title", "Título"), list("lines", "Linhas", null, ""),
          list("contacts", "Contatos", [...linkFields, text("text", "Texto")], { label: "", href: "", text: "" }),
          list("links", "Links", linkFields, { label: "", href: "" })], { title: "", lines: [] }),
        list("institutionalCredits", "Créditos institucionais", [text("label", "Rótulo"), text("name", "Nome")], { label: "", name: "" }),
        group("coordination", "Coordenação", [list("lab", "Laboratório", personFields, { name: "", institution: "" }), list("extensionProject", "Extensão", personFields, { name: "", institution: "" })]),
        text("bottomText", "Texto final"),
      ]),
    ],
  },
  equipe: {
    label: "Equipe", empty: { nome: "", instituicao: "", categoria: "docentes", foto: "assets/images/avatar.webp", lattes: "" },
    fields: [text("nome", "Nome", true), text("instituicao", "Instituição", true),
      { key: "categoria", label: "Categoria", options: EQUIPE_CATEGORIES.map((c) => c.id) }, url("foto", "Foto"), url("lattes", "Currículo Lattes")],
  },
  linhasPesquisa: {
    label: "Linhas de Pesquisa", empty: { id: "", nome: "", descricao: "", icon: "fa-solid fa-flask", estudantes: 0, pesquisadores: 0, ordem: 1 },
    fields: [text("id", "Identificador", true), text("nome", "Nome", true), area("descricao", "Descrição", true), text("icon", "Ícone"),
      ...["estudantes", "pesquisadores", "ordem"].map((key) => ({ key, label: { estudantes: "Estudantes", pesquisadores: "Pesquisadores", ordem: "Ordem" }[key], type: "number" }))],
  },
  parcerias: {
    label: "Parcerias", empty: { nome: "", sigla: "", localizacao: "", tipo: "instituicao", descricao: "", url: "" },
    fields: [text("nome", "Nome", true), text("sigla", "Sigla"), text("localizacao", "Localização"), text("tipo", "Tipo", true), area("descricao", "Descrição"), url("url", "Site")],
  },
  extensao: {
    label: "Extensão", singleton: true,
    fields: [list("projects", "Projetos", [text("id", "Identificador", true), text("projectType", "Tipo", true), text("title", "Título", true),
      group("image", "Imagem", [url("src", "Arquivo"), text("alt", "Descrição da imagem")]), area("minibio", "Apresentação"), area("complementaryText", "Texto complementar"),
      list("coordination", "Coordenação", personFields, { name: "", institution: "" }),
      list("socialLinks", "Redes sociais", [text("label", "Rótulo"), url("url", "URL")], { label: "", url: "" }),
      group("instagram", "Instagram", [{ key: "enabled", label: "Ativo", type: "checkbox" }, url("source", "Origem"), text("provider", "Provedor")]),
    ], { id: "", title: "", projectType: "Projeto de Extensão", image: null, minibio: "", complementaryText: "", coordination: [], socialLinks: [], instagram: { enabled: false, source: null, provider: null } })],
  },
};

export function validateContent(value, fields) {
  const errors = [];
  for (const field of fields) {
    const item = value?.[field.key];
    if (field.required && (typeof item !== "string" || !item.trim())) errors.push(`${field.label}: campo obrigatório.`);
    if (field.type === "number" && (!Number.isInteger(item) || item < 0)) errors.push(`${field.label}: use um inteiro não negativo.`);
    if (field.type === "url" && item && !/^(https?:\/\/|mailto:|#|\/?(?:assets\/|images\/))/.test(item)) errors.push(`${field.label}: endereço inválido.`);
    if (field.key === "id" && item && !/^[a-z0-9][a-z0-9_-]*$/.test(item)) errors.push("Identificador: use letras minúsculas, números e hífens.");
    if (field.type === "list") {
      if (item !== undefined && !Array.isArray(item)) errors.push(`${field.label}: lista inválida.`);
      else if (field.fields) for (const entry of item || []) if (typeof entry === "object") errors.push(...validateContent(entry, field.fields));
      const ids = (item || []).map((entry) => entry?.id).filter(Boolean);
      if (new Set(ids).size !== ids.length) errors.push(`${field.label}: identificador duplicado.`);
    } else if (field.fields && item) errors.push(...validateContent(item, field.fields));
  }
  return errors;
}

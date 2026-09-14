import fs from "node:fs";
import { expect, it } from "vitest";
import { ParceriasSection } from "../../src/js/sections/parcerias.js";
import { CONTENT_DATASETS, validateContent } from "../../src/js/editor/content-fields.js";

it.each([undefined, "", "C:\\private\\logo.png", "file:///private/logo.png", "javascript:alert(1)"])("keeps partner %s logo absent without a placeholder", (logo) => {
  const partner = { nome: "Institution", tipo: "instituicao", url: "https://example.org", descricao: "Description", logo };
  const card = new ParceriasSection("unused").createPartnerCard(partner);
  expect(card.querySelector("img")).toBeNull();
  expect(card.querySelector("h3").textContent).toBe(partner.nome);
  expect(card.querySelector("a").href).toBe("https://example.org/");
  expect(card.textContent).toContain("Description");
});

it("renders a restrained decorative logo beside its named institution and removes failed images", () => {
  const partner = { nome: "Institution", tipo: "instituicao", logo: "assets/images/image-test.png" };
  expect(validateContent(partner, CONTENT_DATASETS.parcerias.fields)).toEqual([]);
  const card = new ParceriasSection("unused").createPartnerCard(partner);
  const img = card.querySelector("img");
  expect(img.getAttribute("src")).toBe(partner.logo);
  expect(img.alt).toBe("");
  expect(img.width).toBe(160); expect(img.height).toBe(80);
  img.dispatchEvent(new Event("error"));
  expect(card.querySelector("img")).toBeNull();
  expect(card.querySelector("h3").textContent).toBe(partner.nome);
});

it("renders exactly one CNPq alongside existing partners through the current schema", async () => {
  const files = fs.readdirSync("content/parcerias").filter((file) => file.endsWith(".json"));
  const partners = files.map((file) => JSON.parse(fs.readFileSync(`content/parcerias/${file}`, "utf8")));
  expect(files).toContain("cnpq.json");
  expect(partners.filter((partner) => partner.sigla === "CNPq")).toHaveLength(1);
  const cnpq = partners.find((partner) => partner.sigla === "CNPq");
  expect(cnpq.nome).toBe("Conselho Nacional de Desenvolvimento Científico e Tecnológico");
  expect(cnpq.url).toBe("https://www.gov.br/cnpq/pt-br/");
  expect(validateContent(cnpq, CONTENT_DATASETS.parcerias.fields)).toEqual([]);
  expect(Object.keys(cnpq).sort()).toEqual(Object.keys(partners.find((partner) => partner.sigla === "CAPES")).sort());
  document.body.innerHTML = '<div id="parcerias-content"></div>';
  await new ParceriasSection("parcerias-content").render(partners);
  expect(document.querySelectorAll(".parceria-card")).toHaveLength(partners.length);
  expect([...document.querySelectorAll(".parceria-nome")].map((node) => node.textContent)).toEqual(partners.map((partner) => partner.nome));
  expect([...document.querySelectorAll(".parceria-nome")].filter((node) => node.textContent === cnpq.nome)).toHaveLength(1);
  for (const partner of partners) expect(document.querySelector("#parcerias-content").textContent).toContain(partner.nome);
});

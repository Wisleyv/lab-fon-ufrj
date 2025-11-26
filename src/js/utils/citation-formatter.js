/**
 * Citation Formatter Utility
 * Formats publication citations in ABNT style
 */

import { HTMLSanitizer } from "./sanitizer.js";

/**
 * Formats a complete citation based on publication type
 * @param {Object} publication - Publication object
 * @returns {string} Formatted citation HTML
 */
export function formatCitation(publication) {
  if (!publication) return "";

  const type = publication.type || "article-journal";

  switch (type) {
    case "article-journal":
      return formatArticle(publication);
    case "chapter":
      return formatChapter(publication);
    case "undergraduate-thesis":
    case "master-thesis":
    case "doctoral-thesis":
      return formatThesis(publication);
    case "special-issue":
      return formatSpecialIssue(publication);
    default:
      return formatGeneric(publication);
  }
}

/**
 * Formats authors in ABNT style (LASTNAME, Given names)
 * @param {Array} authors - Array of author objects
 * @returns {string} Formatted author string
 */
export function formatAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) {
    return "[Autor não informado]";
  }

  const formatted = authors.map((author) => {
    const family = HTMLSanitizer.sanitize(author.family_name || "");
    const given = HTMLSanitizer.sanitize(author.given_name || "");

    if (!family) return null;

    // ABNT format: LASTNAME, Given names
    return `${family.toUpperCase()}, ${given}`;
  }).filter(Boolean);

  if (formatted.length === 0) return "[Autor não informado]";
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}; ${formatted[1]}`;

  // For 3+ authors, join with semicolon
  return formatted.join("; ");
}

/**
 * Formats year from imprint date
 * @param {Object} imprint - Imprint object with date
 * @returns {string} Year or [sem data]
 */
function formatYear(imprint) {
  if (!imprint || !imprint.date) return "[sem data]";
  return HTMLSanitizer.sanitize(String(imprint.date));
}

/**
 * Formats article citation
 * AUTHORS. Title. Journal, volume, issue, pages, year.
 */
function formatArticle(pub) {
  const authors = formatAuthors(pub.authors);
  const title = HTMLSanitizer.sanitize(pub.title || "[Título não informado]");
  const journal = pub.container?.title
    ? HTMLSanitizer.sanitize(pub.container.title)
    : "Revista não identificada";
  const volume = pub.container?.volume
    ? `v. ${HTMLSanitizer.sanitize(pub.container.volume)}`
    : "";
  const issue = pub.container?.issue
    ? `n. ${HTMLSanitizer.sanitize(pub.container.issue)}`
    : "";
  const pages = pub.page_range
    ? `p. ${HTMLSanitizer.sanitize(pub.page_range)}`
    : "";
  const year = formatYear(pub.imprint);

  // Build volume/issue/pages string
  const details = [volume, issue, pages].filter(Boolean).join(", ");

  return `${authors}. <strong>${title}</strong>. <em>${journal}</em>${details ? ", " + details : ""}, ${year}.`;
}

/**
 * Formats book chapter citation
 * AUTHORS. Title. In: EDITOR (Org.). Book title. Place: Publisher, year. Pages.
 */
function formatChapter(pub) {
  const authors = formatAuthors(pub.authors);
  const title = HTMLSanitizer.sanitize(pub.title || "[Título não informado]");
  const bookTitle = pub.container?.title
    ? HTMLSanitizer.sanitize(pub.container.title)
    : "[Livro não identificado]";
  const place = pub.imprint?.place
    ? HTMLSanitizer.sanitize(pub.imprint.place)
    : "[s.l.]";
  const publisher = pub.imprint?.publisher
    ? HTMLSanitizer.sanitize(pub.imprint.publisher)
    : "[s.n.]";
  const year = formatYear(pub.imprint);
  const pages = pub.page_range
    ? `p. ${HTMLSanitizer.sanitize(pub.page_range)}`
    : "";

  return `${authors}. ${title}. In: <em>${bookTitle}</em>. ${place}: ${publisher}, ${year}${pages ? ". " + pages : ""}.`;
}

/**
 * Formats thesis citation
 * AUTHOR. Title. Year. Pages. Thesis type – Institution, Place, Year.
 */
function formatThesis(pub) {
  const authors = formatAuthors(pub.authors);
  const title = HTMLSanitizer.sanitize(pub.title || "[Título não informado]");
  const year = formatYear(pub.imprint);
  const pages = pub.page_range
    ? `${HTMLSanitizer.sanitize(pub.page_range)} f.`
    : "";

  // Determine thesis type label
  let thesisType = "Trabalho acadêmico";
  switch (pub.type) {
    case "undergraduate-thesis":
      thesisType = "Monografia (Graduação)";
      break;
    case "master-thesis":
      thesisType = "Dissertação (Mestrado)";
      break;
    case "doctoral-thesis":
      thesisType = "Tese (Doutorado)";
      break;
  }

  const genre = pub.genre
    ? HTMLSanitizer.sanitize(pub.genre)
    : thesisType;
  const institution = pub.imprint?.publisher
    ? HTMLSanitizer.sanitize(pub.imprint.publisher)
    : "[Instituição não informada]";
  const place = pub.imprint?.place
    ? HTMLSanitizer.sanitize(pub.imprint.place)
    : "[s.l.]";

  return `${authors}. <strong>${title}</strong>. ${year}. ${pages} ${genre} – ${institution}, ${place}, ${year}.`;
}

/**
 * Formats special issue citation
 * AUTHORS (Org.). Title. Journal, volume, issue, year.
 */
function formatSpecialIssue(pub) {
  const authors = formatAuthors(pub.authors);
  const title = HTMLSanitizer.sanitize(pub.title || "[Título não informado]");
  const journal = pub.container?.title
    ? HTMLSanitizer.sanitize(pub.container.title)
    : "Revista não identificada";
  const volume = pub.container?.volume
    ? `v. ${HTMLSanitizer.sanitize(pub.container.volume)}`
    : "";
  const issue = pub.container?.issue
    ? `n. ${HTMLSanitizer.sanitize(pub.container.issue)}`
    : "";
  const year = formatYear(pub.imprint);

  const details = [volume, issue].filter(Boolean).join(", ");

  return `${authors} (Org.). <strong>${title}</strong>. <em>${journal}</em>${details ? ", " + details : ""}, ${year}.`;
}

/**
 * Formats generic publication (fallback)
 */
function formatGeneric(pub) {
  const authors = formatAuthors(pub.authors);
  const title = HTMLSanitizer.sanitize(pub.title || "[Título não informado]");
  const year = formatYear(pub.imprint);

  return `${authors}. <strong>${title}</strong>. ${year}.`;
}

/**
 * Formats short citation for compact view
 * @param {Object} publication - Publication object
 * @returns {string} Short citation (authors, title, year)
 */
export function formatShortCitation(publication) {
  if (!publication) return "";

  const authors = formatAuthors(publication.authors);
  const title = HTMLSanitizer.sanitize(publication.title || "[Título não informado]");
  const year = formatYear(publication.imprint);

  // Get first author's last name only for compact display
  const firstAuthor = publication.authors?.[0]
    ? HTMLSanitizer.sanitize(publication.authors[0].family_name || "")
    : "[Autor]";
  const etAl = publication.authors?.length > 1 ? " et al." : "";

  return `${firstAuthor.toUpperCase()}${etAl}. ${title}. ${year}.`;
}

/**
 * Extracts plain text from HTML citation (for copying)
 * @param {string} htmlCitation - HTML citation string
 * @returns {string} Plain text citation
 */
export function toPlainText(htmlCitation) {
  if (!htmlCitation) return "";

  // Remove HTML tags
  const temp = document.createElement("div");
  temp.innerHTML = htmlCitation;
  return temp.textContent || temp.innerText || "";
}

/**
 * Formats publication type label for display
 * @param {string} type - Publication type
 * @returns {string} Portuguese label
 */
export function formatTypeLabel(type) {
  const labels = {
    "article-journal": "Artigo",
    chapter: "Capítulo de livro",
    "undergraduate-thesis": "Monografia",
    "master-thesis": "Dissertação",
    "doctoral-thesis": "Tese",
    "special-issue": "Dossiê especial",
  };

  return labels[type] || "Publicação";
}

/**
 * Generates BibTeX entry for a publication
 * @param {Object} publication - Publication object
 * @returns {string} BibTeX formatted entry
 */
export function toBibTeX(publication) {
  if (!publication) return "";

  const id = publication.id || "ref";
  const type = publication.type === "article-journal" ? "article" : "misc";
  const year = formatYear(publication.imprint);
  const title = (publication.title || "").replace(/[{}]/g, "");
  
  const authors = publication.authors
    ?.map((a) => `${a.family_name || ""}, ${a.given_name || ""}`)
    .join(" and ") || "";

  const journal = publication.container?.title || "";
  const volume = publication.container?.volume || "";
  const number = publication.container?.issue || "";
  const pages = publication.page_range || "";

  let bibtex = `@${type}{${id},\n`;
  if (authors) bibtex += `  author = {${authors}},\n`;
  if (title) bibtex += `  title = {${title}},\n`;
  if (journal) bibtex += `  journal = {${journal}},\n`;
  if (volume) bibtex += `  volume = {${volume}},\n`;
  if (number) bibtex += `  number = {${number}},\n`;
  if (pages) bibtex += `  pages = {${pages}},\n`;
  if (year && year !== "[sem data]") bibtex += `  year = {${year}},\n`;
  bibtex += `}\n`;

  return bibtex;
}

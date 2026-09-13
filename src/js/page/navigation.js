import { getSectionAnchor } from "./section-registry.js";
import { createElement } from "../utils/helpers.js";

function findSectionByType(composition, type) {
  return composition.sections.find(
    (section) => section.type === type && section.enabled,
  );
}

function createNavLink(label, targetId) {
  return createElement("a", { href: `#${targetId}` }, label);
}

function createChildLink(child, composition, registry) {
  const targetSection = child.type
    ? findSectionByType(composition, child.type)
    : null;
  const targetId =
    child.targetId ||
    (targetSection ? getSectionAnchor(targetSection, registry) : null);

  if (!targetId) return null;

  const item = createElement("li");
  item.appendChild(
    createNavLink(child.label || targetSection.navigation.label, targetId),
  );
  return item;
}

function createNavItem(section, composition, registry, documentRef) {
  const item = createElement("li");
  const children = section.navigation?.children || [];

  if (children.length > 0) {
    item.className = "has-dropdown";
    const link = createNavLink(
      section.navigation.label || section.title,
      getSectionAnchor(section, registry),
    );
    link.setAttribute("aria-haspopup", "true");
    link.setAttribute("aria-expanded", "false");

    const arrow = createElement("span", { className: "dropdown-arrow" }, "▾");
    link.appendChild(documentRef.createTextNode(" "));
    link.appendChild(arrow);

    const menu = createElement("ul", { className: "dropdown-menu" });
    children
      .map((child) => createChildLink(child, composition, registry))
      .filter(Boolean)
      .forEach((childItem) => menu.appendChild(childItem));

    item.appendChild(link);
    item.appendChild(menu);
    return item;
  }

  item.appendChild(
    createNavLink(
      section.navigation.label || section.title,
      getSectionAnchor(section, registry),
    ),
  );
  return item;
}

export function getNavigationSections(composition) {
  return composition.sections.filter(
    (section) => section.enabled && section.navigation?.visible,
  );
}

export function renderPageNavigation({
  documentRef = document,
  composition,
  registry,
  containerId = "main-navigation",
  root = documentRef,
}) {
  const navList = root.querySelector(`[id="${containerId}"]`);
  if (!navList || !composition) return [];

  const navigationSections = getNavigationSections(composition);

  navList.innerHTML = "";
  navigationSections
    .map((section) =>
      createNavItem(section, composition, registry, documentRef),
    )
    .forEach((item) => navList.appendChild(item));

  const contactItem = createElement("li");
  contactItem.appendChild(createNavLink("Contato", "contato"));
  navList.appendChild(contactItem);

  return navigationSections;
}

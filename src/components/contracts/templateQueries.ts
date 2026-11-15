import { contractService } from "../../services/contract.service";

export const TEMPLATE_PAGE_SIZE = 20;

/**
 * Chargement de la bibliothèque : recherche (le serveur pagine), catégorie (paginée par le serveur) ou page triée par date. Si recherche et catégorie sont combinées, la catégorie filtre la recherche.
 */
export const fetchTemplates = async (search: string, categoryFilter: string, page: number) => {
  const size = TEMPLATE_PAGE_SIZE;
  if (search.trim()) {
    const r = await contractService.searchTemplates(search, { page, size });
    if (!categoryFilter) return r;
    const content = r.content.filter((t) => t.category === categoryFilter);
    return { ...r, content, totalElements: content.length };
  }
  if (categoryFilter) {
    return contractService.getTemplatesByCategory(categoryFilter, { page, size });
  }
  return contractService.getTemplatesPage({ page, size, sort: "createdAt,desc" });
};

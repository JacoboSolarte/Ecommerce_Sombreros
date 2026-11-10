/** 32 departments + Bogotá D.C. = the 33 entries the API validates against. */
export const DEPARTMENTS = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
] as const;

export const GUEST_CART_KEY = "cg_guest_cart";
export const CITY_KEY = "cg_city";
export const SITE_NAME = "Casa Guaico";

export const SORT_OPTIONS = [
  { value: "relevance", label: "Más relevantes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "newest", label: "Recién tejidos" },
] as const;

/** Only same-site relative paths are valid post-login destinations. */
export function safeNext(next: string | null | undefined, fallback = "/cuenta"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Link2, Trash2 } from "lucide-react";
import { api, errorMessage, fieldErrors, parseError } from "@/lib/api";
import { formatCOP, WEAVE_LABELS, WEAVE_ORDER } from "@/lib/format";
import type {
  AdminProductDetail,
  ArtisanOption,
  CategoryOption,
  Color,
  ProductInput,
  Size,
  WeaveGrade,
} from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton, Swatch } from "@/components/ui/misc";
import { Pill } from "@/components/ui/pill";
import { AInput, ASelect, ATextarea } from "./fields";
import { useToast } from "./toast";
import { useApi } from "./use-api";
import { BlockError, CONTROL, MONO, TH, TH_R } from "./ui";

interface ImageRow {
  key: number;
  url: string;
  alt: string;
}

interface FormState {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  artisanId: string;
  isFeatured: boolean;
  priceCop: string;
  compareAt: string;
  weaveGrade: WeaveGrade | "";
  weavingHours: string;
  brimCm: string;
  deliveryMin: string;
  deliveryMax: string;
  images: ImageRow[];
  colorIds: number[];
  stock: Record<string, string>;
}

const cell = (size: string, colorId: number) => `${size}:${colorId}`;
const INT = /^\d+$/;
const MAX_UPLOAD = 5 * 1024 * 1024;

let imageKey = 1;

function emptyForm(): FormState {
  return {
    name: "",
    sku: "",
    shortDescription: "",
    description: "",
    categoryId: "",
    artisanId: "",
    isFeatured: false,
    priceCop: "",
    compareAt: "",
    weaveGrade: "",
    weavingHours: "",
    brimCm: "",
    deliveryMin: "",
    deliveryMax: "",
    images: [],
    colorIds: [],
    stock: {},
  };
}

function fromProduct(p: AdminProductDetail): FormState {
  const colorIds: number[] = [];
  const stock: Record<string, string> = {};
  for (const v of p.variants) {
    if (!colorIds.includes(v.colorId)) colorIds.push(v.colorId);
    stock[cell(v.sizeCode, v.colorId)] = String(v.stock);
  }
  return {
    name: p.name,
    sku: p.sku,
    shortDescription: p.shortDescription,
    description: p.description,
    categoryId: String(p.categoryId),
    artisanId: String(p.artisanId),
    isFeatured: p.isFeatured,
    priceCop: String(p.priceCop),
    compareAt: p.compareAtPriceCop ? String(p.compareAtPriceCop) : "",
    weaveGrade: p.weaveGrade,
    weavingHours: String(p.weavingHours),
    brimCm: String(p.brimCm).replace(".", ","),
    deliveryMin: String(p.deliveryDaysMin),
    deliveryMax: String(p.deliveryDaysMax),
    images: p.images.map((i) => ({ key: imageKey++, url: i.url, alt: i.alt ?? "" })),
    colorIds,
    stock,
  };
}

/** Mirrors the API rules (domain/validation.py) so most mistakes show before sending. */
function validate(f: FormState, sizes: Size[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 3) e.name = "El nombre es obligatorio (mínimo 3 letras).";
  if (f.name.length > 180) e.name = "El nombre admite hasta 180 caracteres.";
  if (!f.sku.trim()) e.sku = "El SKU es obligatorio.";
  if (f.sku.length > 60) e.sku = "El SKU admite hasta 60 caracteres.";
  if (!f.shortDescription.trim()) e.shortDescription = "Escribe una descripción corta.";
  if (f.shortDescription.length > 300) e.shortDescription = "La descripción corta admite hasta 300 caracteres.";
  if (!f.description.trim()) e.description = "Escribe la descripción del producto.";
  if (!f.categoryId) e.categoryId = "Elige una categoría.";
  if (!f.artisanId) e.artisanId = "Elige quién lo tejió.";

  const price = INT.test(f.priceCop.trim()) ? Number(f.priceCop) : NaN;
  if (!(price > 0)) e.priceCop = "El precio debe ser un número entero mayor a cero.";
  else if (price > 100_000_000) e.priceCop = "El precio es demasiado alto.";
  if (f.compareAt.trim()) {
    const c = INT.test(f.compareAt.trim()) ? Number(f.compareAt) : NaN;
    if (Number.isNaN(c)) e.compareAtPriceCop = "Escribe un número entero.";
    else if (!(c > price)) e.compareAtPriceCop = "El precio anterior debe ser mayor al precio actual.";
  }

  if (!f.weaveGrade) e.weaveGrade = "Elige el grado de tejido.";
  if (!(INT.test(f.weavingHours.trim()) && Number(f.weavingHours) > 0))
    e.weavingHours = "Las horas de tejido deben ser un entero mayor a cero.";
  const brim = Number(f.brimCm.trim().replace(",", "."));
  if (!f.brimCm.trim() || Number.isNaN(brim) || brim <= 0) e.brimCm = "El ala debe medir más de cero.";
  const dMin = INT.test(f.deliveryMin.trim()) ? Number(f.deliveryMin) : NaN;
  const dMax = INT.test(f.deliveryMax.trim()) ? Number(f.deliveryMax) : NaN;
  if (Number.isNaN(dMin)) e.deliveryDaysMin = "Escribe los días mínimos de entrega.";
  if (Number.isNaN(dMax)) e.deliveryDaysMax = "Escribe los días máximos de entrega.";
  else if (!Number.isNaN(dMin) && dMax < dMin) e.deliveryDaysMax = "El máximo no puede ser menor que el mínimo.";

  if (f.images.length === 0) e.images = "Agrega al menos una imagen.";
  else if (f.images.length > 12) e.images = "Máximo 12 imágenes.";
  else if (f.images.some((i) => !i.url.trim())) e.images = "Hay una imagen sin URL. Complétala o quítala.";

  let variants = 0;
  let badStock = false;
  for (const s of sizes)
    for (const c of f.colorIds) {
      const t = (f.stock[cell(s.code, c)] ?? "").trim();
      if (t === "") continue;
      if (!INT.test(t)) badStock = true;
      else variants++;
    }
  if (badStock) e.variants = "El stock debe ser un número entero de cero o más.";
  else if (variants === 0) e.variants = "Agrega al menos una combinación de talla y color con su stock.";
  return e;
}

function buildInput(f: FormState, sizes: Size[]): ProductInput {
  const variants: ProductInput["variants"] = [];
  for (const s of sizes)
    for (const c of f.colorIds) {
      const t = (f.stock[cell(s.code, c)] ?? "").trim();
      if (t !== "") variants.push({ sizeCode: s.code, colorId: c, stock: Number(t) });
    }
  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    shortDescription: f.shortDescription.trim(),
    description: f.description.trim(),
    priceCop: Number(f.priceCop),
    compareAtPriceCop: f.compareAt.trim() ? Number(f.compareAt) : null,
    categoryId: Number(f.categoryId),
    artisanId: Number(f.artisanId),
    weaveGrade: f.weaveGrade as WeaveGrade,
    weavingHours: Number(f.weavingHours),
    brimCm: Number(f.brimCm.trim().replace(",", ".")),
    deliveryDaysMin: Number(f.deliveryMin),
    deliveryDaysMax: Number(f.deliveryMax),
    isFeatured: f.isFeatured,
    images: f.images.map((i) => ({ url: i.url.trim(), alt: i.alt.trim() })),
    variants,
  };
}

/** Maps a field key (client or API) to the id of the control to focus. */
function targetId(key: string): string {
  if (key.startsWith("images")) return "f-images";
  if (key.startsWith("variants")) return "f-variants";
  return `f-${key}`;
}

function Section({
  title,
  id,
  hint,
  children,
}: {
  title: string;
  id?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} tabIndex={id ? -1 : undefined} className="rounded-card border border-edge p-4 sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 mb-4 text-sm text-ink-2">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </section>
  );
}

function FormSkeleton() {
  return (
    <div aria-hidden className="grid max-w-[880px] gap-4">
      <span className="sr-only" role="status">
        Cargando formulario…
      </span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-72" />
      <Skeleton className="h-40" />
      <Skeleton className="h-56" />
    </div>
  );
}

export function ProductForm({ productId }: { productId?: string }) {
  const sizes = useApi<Size[]>("/sizes");
  const colors = useApi<Color[]>("/colors");
  const cats = useApi<CategoryOption[]>("/admin/categories");
  const arts = useApi<ArtisanOption[]>("/admin/artisans");
  const product = useApi<AdminProductDetail>(productId ? `/admin/products/${encodeURIComponent(productId)}` : null);

  const failed = sizes.error ?? colors.error ?? cats.error ?? arts.error ?? product.error;
  const retry = () => {
    sizes.reload();
    colors.reload();
    cats.reload();
    arts.reload();
    product.reload();
  };
  const ready = sizes.data && colors.data && cats.data && arts.data && (!productId || product.data);

  return (
    <div>
      <Link href="/admin/productos" className="mb-3 inline-flex items-center gap-1.5 text-sm text-link hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Productos
      </Link>
      {failed && !ready ? (
        failed.status === 404 ? (
          <Alert tone="error" title="No encontramos este producto">
            Puede que se haya eliminado. Vuelve a la lista de productos.
          </Alert>
        ) : (
          <BlockError error={failed} onRetry={retry} what="el formulario" />
        )
      ) : !ready ? (
        <FormSkeleton />
      ) : (
        <FormBody
          productId={productId}
          product={product.data}
          sizes={sizes.data!}
          colors={colors.data!}
          categories={cats.data!}
          artisans={arts.data!}
        />
      )}
    </div>
  );
}

function FormBody({
  productId,
  product,
  sizes,
  colors,
  categories,
  artisans,
}: {
  productId?: string;
  product?: AdminProductDetail;
  sizes: Size[];
  colors: Color[];
  categories: CategoryOption[];
  artisans: ArtisanOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const editing = !!productId;
  const [f, setF] = useState<FormState>(() => (product ? fromProduct(product) : emptyForm()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const err = (k: string) => errors[k];

  const price = INT.test(f.priceCop.trim()) ? Number(f.priceCop) : null;
  const compare = INT.test(f.compareAt.trim()) ? Number(f.compareAt) : null;

  /* ----- images ----- */
  function moveImage(i: number, d: number) {
    setF((cur) => {
      const arr = [...cur.images];
      const j = i + d;
      if (j < 0 || j >= arr.length) return cur;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...cur, images: arr };
    });
  }
  function addUrl() {
    const url = newUrl.trim();
    if (!url) return;
    if (!/^(https?:\/\/|\/)/i.test(url)) {
      setUploadErr("Escribe una URL que empiece por https:// o con una ruta como /images/…");
      return;
    }
    setUploadErr(null);
    setF((cur) => ({ ...cur, images: [...cur.images, { key: imageKey++, url, alt: "" }] }));
    setNewUrl("");
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploadErr(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setUploadErr(`${file.name}: solo se aceptan imágenes JPG, PNG o WebP.`);
          continue;
        }
        if (file.size > MAX_UPLOAD) {
          setUploadErr(`${file.name}: la imagen no puede superar 5 MB.`);
          continue;
        }
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/uploads", { method: "POST", body, credentials: "include" });
        if (!res.ok) {
          setUploadErr(`${file.name}: ${(await parseError(res)).message}`);
          continue;
        }
        const { url } = (await res.json()) as { url: string };
        setF((cur) => ({
          ...cur,
          images: [...cur.images, { key: imageKey++, url, alt: cur.name.trim() }],
        }));
      }
    } catch {
      setUploadErr("No pudimos subir la imagen. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /* ----- variants ----- */
  function toggleColor(id: number) {
    setF((cur) => {
      if (cur.colorIds.includes(id)) {
        const stock = { ...cur.stock };
        for (const s of sizes) delete stock[cell(s.code, id)];
        return { ...cur, colorIds: cur.colorIds.filter((c) => c !== id), stock };
      }
      return { ...cur, colorIds: [...cur.colorIds, id] };
    });
  }
  const chosen = colors.filter((c) => f.colorIds.includes(c.id));
  const stockNum = (s: string, c: number) => {
    const t = (f.stock[cell(s, c)] ?? "").trim();
    return INT.test(t) ? Number(t) : 0;
  };
  const rowTotal = (s: string) => chosen.reduce((a, c) => a + stockNum(s, c.id), 0);
  const colTotal = (c: number) => sizes.reduce((a, s) => a + stockNum(s.code, c), 0);
  const grandTotal = chosen.reduce((a, c) => a + colTotal(c.id), 0);
  const variantCount = sizes.reduce(
    (a, s) => a + chosen.filter((c) => (f.stock[cell(s.code, c.id)] ?? "").trim() !== "").length,
    0,
  );

  function focusFirst(errs: Record<string, string>) {
    const order = Object.keys(errs);
    const first = Array.from(document.querySelectorAll<HTMLElement>("[id^='f-']")).find((el) =>
      order.some((k) => targetId(k) === el.id),
    );
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
    first?.focus({ preventScroll: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGeneral(null);
    const errs = validate(f, sizes);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setGeneral("Revisa los campos marcados en rojo antes de guardar.");
      window.setTimeout(() => focusFirst(errs), 0);
      return;
    }
    setSaving(true);
    try {
      const input = buildInput(f, sizes);
      if (editing) await api(`/admin/products/${encodeURIComponent(productId!)}`, { method: "PUT", body: input });
      else await api("/admin/products", { method: "POST", body: input });
      toast(editing ? "Producto actualizado." : "Producto creado.");
      router.refresh();
      router.push("/admin/productos");
    } catch (ex) {
      const fe = fieldErrors(ex);
      setErrors(fe);
      setGeneral(
        Object.keys(fe).length ? `${errorMessage(ex)} Revisa los campos marcados.` : errorMessage(ex),
      );
      if (Object.keys(fe).length) window.setTimeout(() => focusFirst(fe), 0);
      setSaving(false);
    }
  }

  const unmapped = Object.entries(errors).filter(
    ([k]) => !/^(name|sku|shortDescription|description|categoryId|artisanId|priceCop|compareAtPriceCop|weaveGrade|weavingHours|brimCm|deliveryDaysMin|deliveryDaysMax|images.*|variants.*)$/.test(k),
  );

  return (
    <form onSubmit={submit} noValidate className="max-w-[880px]">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] leading-8 font-semibold">{editing ? f.name || "Editar producto" : "Nuevo producto"}</h1>
        {product && <Pill tone={product.isActive ? "ok" : "neutral"}>{product.isActive ? "Activo" : "Inactivo"}</Pill>}
      </div>

      {general && (
        <Alert tone="error" className="mb-4">
          {general}
          {unmapped.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {unmapped.map(([k, m]) => (
                <li key={k}>
                  {k}: {m}
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <div className="grid gap-4">
        <Section title="Información">
          <div className="grid gap-4 sm:grid-cols-2">
            <AInput
              id="f-name"
              label="Nombre"
              required
              value={f.name}
              maxLength={180}
              onChange={(e) => set("name", e.target.value)}
              error={err("name")}
              wrapperClassName="sm:col-span-2"
            />
            <AInput
              id="f-sku"
              label="SKU"
              required
              value={f.sku}
              maxLength={60}
              onChange={(e) => set("sku", e.target.value)}
              error={err("sku")}
              className={MONO}
              hint="Código único del producto."
            />
            <label className="flex min-h-10 cursor-pointer items-center gap-2 self-end text-sm sm:pb-0">
              <input
                type="checkbox"
                checked={f.isFeatured}
                onChange={(e) => set("isFeatured", e.target.checked)}
                className="size-4 accent-[var(--color-chart)]"
              />
              Producto destacado en la tienda
            </label>
            <ATextarea
              id="f-shortDescription"
              label="Descripción corta"
              required
              value={f.shortDescription}
              maxLength={300}
              onChange={(e) => set("shortDescription", e.target.value)}
              error={err("shortDescription")}
              className="min-h-16"
              hint={`${f.shortDescription.length} de 300 caracteres. Aparece en las tarjetas del catálogo.`}
              wrapperClassName="sm:col-span-2"
            />
            <ATextarea
              id="f-description"
              label="Descripción"
              required
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              error={err("description")}
              className="min-h-36"
              wrapperClassName="sm:col-span-2"
            />
            <ASelect
              id="f-categoryId"
              label="Categoría"
              required
              value={f.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              error={err("categoryId")}
            >
              <option value="">Elige una categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </ASelect>
            <ASelect
              id="f-artisanId"
              label="Artesano"
              required
              value={f.artisanId}
              onChange={(e) => set("artisanId", e.target.value)}
              error={err("artisanId")}
            >
              <option value="">Elige quién lo tejió</option>
              {artisans.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName} · {a.municipality}
                </option>
              ))}
            </ASelect>
          </div>
        </Section>

        <Section title="Precio" hint="En pesos colombianos, con IVA incluido.">
          <div className="grid gap-4 sm:grid-cols-2">
            <AInput
              id="f-priceCop"
              label="Precio (COP)"
              required
              inputMode="numeric"
              value={f.priceCop}
              onChange={(e) => set("priceCop", e.target.value.replace(/[^\d]/g, ""))}
              error={err("priceCop")}
              hint={price ? formatCOP(price) : "Solo números, sin puntos."}
              className="tnum"
            />
            <AInput
              id="f-compareAtPriceCop"
              label="Precio anterior (opcional)"
              inputMode="numeric"
              value={f.compareAt}
              onChange={(e) => set("compareAt", e.target.value.replace(/[^\d]/g, ""))}
              error={err("compareAtPriceCop")}
              hint={compare ? `${formatCOP(compare)}, se muestra tachado.` : "Debe ser mayor que el precio actual."}
              className="tnum"
            />
          </div>
        </Section>

        <Section title="Ficha de tejido" hint="Estos datos se muestran en la página del producto.">
          <div className="grid gap-4 sm:grid-cols-2">
            <ASelect
              id="f-weaveGrade"
              label="Grado de tejido"
              required
              value={f.weaveGrade}
              onChange={(e) => set("weaveGrade", e.target.value as WeaveGrade | "")}
              error={err("weaveGrade")}
            >
              <option value="">Elige el grado</option>
              {WEAVE_ORDER.map((w) => (
                <option key={w} value={w}>
                  {WEAVE_LABELS[w]}
                </option>
              ))}
            </ASelect>
            <AInput
              id="f-weavingHours"
              label="Horas de tejido"
              required
              inputMode="numeric"
              value={f.weavingHours}
              onChange={(e) => set("weavingHours", e.target.value.replace(/[^\d]/g, ""))}
              error={err("weavingHours")}
              className="tnum"
            />
            <AInput
              id="f-brimCm"
              label="Ala (cm)"
              required
              inputMode="decimal"
              value={f.brimCm}
              onChange={(e) => set("brimCm", e.target.value.replace(/[^\d.,]/g, ""))}
              error={err("brimCm")}
              hint="Por ejemplo 7,5."
              className="tnum"
            />
            <div className="grid grid-cols-2 gap-4">
              <AInput
                id="f-deliveryDaysMin"
                label="Entrega mínima (días)"
                required
                inputMode="numeric"
                value={f.deliveryMin}
                onChange={(e) => set("deliveryMin", e.target.value.replace(/[^\d]/g, ""))}
                error={err("deliveryDaysMin")}
                className="tnum"
              />
              <AInput
                id="f-deliveryDaysMax"
                label="Entrega máxima (días)"
                required
                inputMode="numeric"
                value={f.deliveryMax}
                onChange={(e) => set("deliveryMax", e.target.value.replace(/[^\d]/g, ""))}
                error={err("deliveryDaysMax")}
                className="tnum"
              />
            </div>
          </div>
        </Section>

        <Section
          id="f-images"
          title="Imágenes"
          hint="La primera es la portada. Agrega una por URL o súbela (JPG, PNG o WebP, hasta 5 MB)."
        >
          {err("images") && (
            <p role="alert" className="mb-3 text-sm font-medium text-out">
              {err("images")}
            </p>
          )}
          {f.images.length > 0 && (
            <ul className="mb-4 grid gap-3">
              {f.images.map((im, i) => (
                <li key={im.key} className="flex flex-wrap items-start gap-3 rounded-card bg-tile p-3 sm:flex-nowrap">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-field bg-tone">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {im.url.trim() && <img src={im.url} alt="" className="size-full object-cover" />}
                  </span>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`img-url-${im.key}`} className="mb-1 block text-xs font-medium text-ink-2">
                        URL de la imagen {i + 1}
                        {i === 0 && " (portada)"}
                      </label>
                      <input
                        id={`img-url-${im.key}`}
                        value={im.url}
                        onChange={(e) =>
                          setF((cur) => ({
                            ...cur,
                            images: cur.images.map((x) => (x.key === im.key ? { ...x, url: e.target.value } : x)),
                          }))
                        }
                        className={cn(CONTROL, "h-9 w-full")}
                      />
                    </div>
                    <div>
                      <label htmlFor={`img-alt-${im.key}`} className="mb-1 block text-xs font-medium text-ink-2">
                        Texto alternativo {i + 1}
                      </label>
                      <input
                        id={`img-alt-${im.key}`}
                        value={im.alt}
                        maxLength={300}
                        onChange={(e) =>
                          setF((cur) => ({
                            ...cur,
                            images: cur.images.map((x) => (x.key === im.key ? { ...x, alt: e.target.value } : x)),
                          }))
                        }
                        className={cn(CONTROL, "h-9 w-full")}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {(
                      [
                        [ArrowUp, "Subir", -1, i === 0],
                        [ArrowDown, "Bajar", 1, i === f.images.length - 1],
                      ] as const
                    ).map(([Icon, label, d, off]) => (
                      <button
                        key={label}
                        type="button"
                        disabled={off}
                        onClick={() => moveImage(i, d)}
                        aria-label={`${label} imagen ${i + 1}`}
                        className="grid size-9 place-items-center rounded-field text-ink-2 hover:bg-tone disabled:text-field disabled:hover:bg-transparent"
                      >
                        <Icon className="size-4" aria-hidden />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setF((cur) => ({ ...cur, images: cur.images.filter((x) => x.key !== im.key) }))}
                      aria-label={`Quitar imagen ${i + 1}`}
                      className="grid size-9 place-items-center rounded-field text-out hover:bg-out-bg"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <label htmlFor="img-new" className="mb-1 block text-sm font-medium">
                Agregar por URL
              </label>
              <input
                id="img-new"
                value={newUrl}
                placeholder="https://…"
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrl();
                  }
                }}
                className={cn(CONTROL, "h-10 w-full")}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addUrl}>
              <Link2 className="size-4" aria-hidden /> Agregar URL
            </Button>
            <input
              ref={fileRef}
              id="img-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => upload(e.target.files)}
            />
            <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              <ImagePlus className="size-4" aria-hidden /> Subir imagen
            </Button>
          </div>
          {uploadErr && (
            <p role="alert" className="mt-2 text-sm font-medium text-out">
              {uploadErr}
            </p>
          )}
        </Section>

        <Section
          id="f-variants"
          title="Variantes"
          hint={
            editing
              ? "Cada celda es el stock de una talla y color. En un producto existente, cambiar el stock aquí se registra como un ajuste en el inventario; quitar un color elimina esas combinaciones."
              : "Elige los colores y escribe el stock de cada talla. Una celda vacía significa que esa combinación no existe."
          }
        >
          {err("variants") && (
            <p role="alert" className="mb-3 text-sm font-medium text-out">
              {err("variants")}
            </p>
          )}
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-medium">Colores disponibles</legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => {
                const on = f.colorIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleColor(c.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors duration-150",
                      on
                        ? "border-link bg-ok-bg font-semibold text-ink"
                        : "border-field bg-surface text-ink-2 hover:border-ink-2 hover:text-ink",
                    )}
                  >
                    <Swatch hex={c.hex} size={14} /> {c.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {chosen.length === 0 ? (
            <p className="rounded-card border border-dashed border-field px-4 py-6 text-center text-sm text-ink-2">
              Elige al menos un color para escribir el stock por talla.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-max">
                <caption className="sr-only">Stock por talla y color</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH}>
                      Talla
                    </th>
                    {chosen.map((c) => (
                      <th key={c.id} scope="col" className={cn(TH_R, "min-w-24")}>
                        <span className="inline-flex items-center gap-1.5">
                          <Swatch hex={c.hex} size={12} /> {c.name}
                        </span>
                      </th>
                    ))}
                    <th scope="col" className={TH_R}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((s) => (
                    <tr key={s.code} className="border-t border-rule">
                      <th scope="row" className="px-3 py-2 text-left text-sm font-medium whitespace-nowrap">
                        {s.code}
                        <span className="block text-xs font-normal text-ink-2">
                          {s.headCmMin}–{s.headCmMax} cm
                        </span>
                      </th>
                      {chosen.map((c) => (
                        <td key={c.id} className="px-2 py-1.5 text-right">
                          <input
                            inputMode="numeric"
                            aria-label={`Stock talla ${s.code}, color ${c.name}`}
                            value={f.stock[cell(s.code, c.id)] ?? ""}
                            placeholder="–"
                            onChange={(e) =>
                              setF((cur) => ({
                                ...cur,
                                stock: { ...cur.stock, [cell(s.code, c.id)]: e.target.value.replace(/[^\d]/g, "") },
                              }))
                            }
                            className={cn(CONTROL, "tnum h-9 w-20 text-right")}
                          />
                        </td>
                      ))}
                      <td className="tnum px-3 py-2 text-right text-sm text-ink-2">{rowTotal(s.code)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-edge">
                    <th scope="row" className="px-3 py-2 text-left text-sm font-semibold">
                      Total
                    </th>
                    {chosen.map((c) => (
                      <td key={c.id} className="tnum px-3 py-2 text-right text-sm text-ink-2">
                        {colTotal(c.id)}
                      </td>
                    ))}
                    <td className="tnum px-3 py-2 text-right text-sm font-semibold">{grandTotal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="tnum mt-3 text-sm text-ink-2" aria-live="polite">
            {variantCount} {variantCount === 1 ? "variante" : "variantes"} · {grandTotal}{" "}
            {grandTotal === 1 ? "unidad" : "unidades"} en total
          </p>
        </Section>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 -mb-5 flex flex-wrap items-center justify-end gap-2 border-t border-edge bg-surface px-4 py-3 lg:-mx-6 lg:-mb-6 lg:px-6">
        <Button href="/admin/productos" variant="outline" size="sm">
          Cancelar
        </Button>
        <Button type="submit" variant="secondary" size="sm" loading={saving}>
          Guardar producto
        </Button>
      </div>
    </form>
  );
}

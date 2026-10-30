import { apiFetch } from './client';

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Product {
  id: string;
  name: string;
  category: string;
  vendor: string;
  price_clp: number | null;
  status: ProductStatus;
  external_url: string;
  image_url?: string | null;
  updated_at: string;
}

export interface ProductsListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProductListParams {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
}

export interface ProductPayload {
  name: string;
  category: string;
  vendor: string;
  price_clp?: number | null;
  external_url: string;
  image_url?: string | null;
}

export type ProductPatch = Partial<ProductPayload> & { status?: ProductStatus };

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchProducts(params: ProductListParams): Promise<ProductsListResponse> {
  const query = new URLSearchParams({ page: String(params.page ?? 1), page_size: '25' });
  if (params.search) query.set('q', params.search);
  if (params.status) query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  const response = await apiFetch(`/marketplace/products?${query}`);
  if (!response.ok) throw new Error('No fue posible cargar los productos.');
  return response.json();
}

export async function createProduct(payload: ProductPayload): Promise<void> {
  const response = await apiFetch('/marketplace/products', { method: 'POST', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible crear el producto.'));
}

export async function updateProduct(productId: string, payload: ProductPatch): Promise<void> {
  const response = await apiFetch(`/marketplace/products/${productId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible guardar el producto.'));
}

export async function archiveProduct(productId: string): Promise<void> {
  const response = await apiFetch(`/marketplace/products/${productId}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible archivar el producto.'));
}

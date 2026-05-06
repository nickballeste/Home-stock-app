import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AlertSummary,
  Category,
  CreateMemberInput,
  CreateProductInput,
  DurationOverrideInput,
  ExtractedProduct,
  ExtractedRoutine,
  Member,
  Product,
  ProductFilters,
  ProductSummary,
  RoutineSlot,
  SystemSettings,
  UpdateMemberInput,
  UpdateProductInput,
  UpdateSettingsInput,
} from '@homestock/types';
import { api } from './client';

// ── Members ─────────────────────────────────────────────────────

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: () => api<Member[]>('/members'),
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => api<Member>(`/members/${id}`),
    enabled: Boolean(id),
  });
}

export function useMemberRoutine(id: string | undefined) {
  return useQuery({
    queryKey: ['member-routine', id],
    queryFn: () =>
      api<{ slots: RoutineSlot[]; weeklyPresenceHours: number }>(
        `/members/${id}/routine`,
      ),
    enabled: Boolean(id),
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemberInput) =>
      api<Member>('/members', { method: 'POST', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useUpdateMember(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMemberInput) =>
      api<Member>(`/members/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['member', id] });
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useReplaceRoutine(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slots: Omit<RoutineSlot, 'id' | 'memberId'>[]) =>
      api<{ slots: RoutineSlot[]; weeklyPresenceHours: number }>(
        `/members/${id}/routine`,
        { method: 'PUT', body: { slots } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-routine', id] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

// ── Products ────────────────────────────────────────────────────

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () =>
      api<ProductSummary[]>('/products', {
        query: {
          status: filters.status,
          categoryId: filters.categoryId,
          search: filters.search,
          sort: filters.sort,
        },
      }),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api<Product>(`/products/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      api<Product>('/products', { method: 'POST', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['alert-summary'] });
    },
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) =>
      api<Product>(`/products/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', id] });
    },
  });
}

export function useRestockProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<Product>(`/products/${id}/restock`, { method: 'POST' }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['alert-summary'] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useOverrideDuration(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DurationOverrideInput) =>
      api<Product>(`/products/${id}/duration`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useReInferDuration(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<Product>(`/products/${id}/re-infer-duration`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Categories ──────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
}

// ── AI ──────────────────────────────────────────────────────────

export function useExtractRoutine() {
  return useMutation({
    mutationFn: (prompt: string) =>
      api<ExtractedRoutine>('/ai/extract-routine', {
        method: 'POST',
        body: { prompt },
      }),
  });
}

export function useExtractProductFromImage() {
  return useMutation({
    mutationFn: (input: { imageBase64: string; mimeType: 'image/jpeg' | 'image/png' }) =>
      api<ExtractedProduct>('/ai/extract-product-from-image', {
        method: 'POST',
        body: input,
      }),
  });
}

// ── Alerts & Settings ───────────────────────────────────────────

export function useAlertSummary() {
  return useQuery({
    queryKey: ['alert-summary'],
    queryFn: () => api<AlertSummary>('/alerts/summary'),
  });
}

export function useActiveAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => api<ProductSummary[]>('/alerts'),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api<SystemSettings>('/settings'),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) =>
      api<SystemSettings>('/settings', { method: 'PATCH', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

/**
 * Shared types for HomeStock — used by both the API and Web app.
 *
 * These types describe the wire format (API response/request shapes).
 * Internal Prisma types live in the API package and are mapped onto these.
 */

export type ProductUnit = 'ml' | 'g' | 'units' | 'sheets' | 'doses';
export type ConsumerScope = 'all' | 'specific';
export type AlertStatus = 'ok' | 'alert' | 'overdue';
export type AlertChannel = 'email';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  weeklyPresenceHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineSlot {
  id: string;
  memberId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface AlertConfig {
  id: string;
  productId: string;
  overrideThresholdDays: number | null;
  emailEnabled: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  categoryId: string;
  category?: Category;
  unit: ProductUnit;
  packageSize: number;
  currentQuantity: number;
  consumerScope: ConsumerScope;
  consumerMemberIds: string[];
  estimatedDurationDays: number;
  estimatedEndDate: string;
  durationOverridden: boolean;
  inferenceConfidenceNote: string | null;
  alertConfig: AlertConfig;
  alertStatus: AlertStatus;
  daysRemaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  brand: string | null;
  categoryId: string;
  unit: ProductUnit;
  currentQuantity: number;
  estimatedEndDate: string;
  daysRemaining: number;
  alertStatus: AlertStatus;
}

export interface AlertDelivery {
  id: string;
  productId: string;
  sentAt: string;
  channel: AlertChannel;
  success: boolean;
}

export interface SystemSettings {
  id: string;
  defaultAlertThresholdDays: number;
  digestEmailTime: string;
  digestEmailAddress: string;
  timezone: string;
}

// ── AI contract types ───────────────────────────────────────────

export interface ExtractedRoutine {
  slots: Array<Omit<RoutineSlot, 'id' | 'memberId'>>;
  weeklyPresenceHours: number;
}

export interface DurationInferenceInput {
  product: {
    name: string;
    brand?: string | null;
    category: string;
    unit: ProductUnit;
    packageSize: number;
    currentQuantity: number;
  };
  household: {
    totalWeeklyPresenceHours: number;
    memberCount: number;
  };
}

export interface DurationInferenceOutput {
  estimatedDurationDays: number;
  estimatedEndDate: string;
  confidenceNote: string;
}

export interface ExtractedProduct {
  name: string | null;
  brand: string | null;
  suggestedCategory: string | null;
  unit: ProductUnit | null;
  packageSize: number | null;
}

// ── API envelope ────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    page?: number;
    total?: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Filter / input shapes ───────────────────────────────────────

export interface ProductFilters {
  status?: AlertStatus;
  categoryId?: string;
  search?: string;
  sort?: 'name' | 'endDate' | 'category';
}

export interface CreateMemberInput {
  name: string;
  avatarUrl?: string | null;
}

export interface UpdateMemberInput {
  name?: string;
  avatarUrl?: string | null;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
}

export interface CreateProductInput {
  name: string;
  brand?: string | null;
  categoryId?: string;
  unit: ProductUnit;
  packageSize: number;
  currentQuantity: number;
  consumerScope?: ConsumerScope;
  consumerMemberIds?: string[];
  estimatedDurationDays?: number;
  estimatedEndDate?: string;
}

export interface UpdateProductInput {
  name?: string;
  brand?: string | null;
  categoryId?: string;
  unit?: ProductUnit;
  packageSize?: number;
  currentQuantity?: number;
  consumerScope?: ConsumerScope;
  consumerMemberIds?: string[];
}

export interface DurationOverrideInput {
  estimatedDurationDays?: number;
  estimatedEndDate?: string;
}

export interface AlertConfigInput {
  overrideThresholdDays?: number | null;
  emailEnabled?: boolean;
}

export interface UpdateSettingsInput {
  defaultAlertThresholdDays?: number;
  digestEmailTime?: string;
  digestEmailAddress?: string;
  timezone?: string;
}

export interface AlertSummary {
  totalAlerts: number;
  totalOverdue: number;
  totalOk: number;
}

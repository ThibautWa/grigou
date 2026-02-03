// types/category.ts

export type CategoryType = 'income' | 'outcome' | 'both';

export interface Category {
    id: number;
    name: string;
    type: CategoryType;
    icon: string | null;
    color: string | null;
    user_id: number | null;
    is_system: boolean;
    is_active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface CreateCategoryDto {
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
}

export interface UpdateCategoryDto {
    name?: string;
    type?: CategoryType;
    icon?: string;
    color?: string;
    is_active?: boolean;
    sort_order?: number;
}

// Catégories groupées par type pour l'affichage
export interface CategoriesByType {
    income: Category[];
    outcome: Category[];
}

// Liste des icônes disponibles
export const CATEGORY_ICONS = [
    '🛒', '🍽️', '🚗', '🏠', '📄', '🏥', '🎮', '🛍️', '📚', '✈️',
    '📱', '🎁', '🐾', '📦', '💰', '💼', '📈', '🔄', '🏷️', '🏛️',
    '💵', '🎬', '🎵', '⚽', '💪', '✂️', '🔧', '💊', '👶', '👗',
    '💄', '🚌', '🚇', '⛽', '🅿️', '🏋️', '🎓', '💻', '📞', '🌐',
    '☕', '🍺', '🎂', '🌳', '🐕', '🐈', '🏦', '💳', '🏪', '📌'
];

// Liste des couleurs disponibles
export const CATEGORY_COLORS = [
    '#22c55e', // green
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#f97316', // orange
    '#ef4444', // red
    '#ec4899', // pink
    '#f59e0b', // amber
    '#06b6d4', // cyan
    '#14b8a6', // teal
    '#6366f1', // indigo
    '#d946ef', // fuchsia
    '#a855f7', // purple
    '#64748b', // slate
    '#94a3b8', // gray
    '#84cc16', // lime
    '#eab308', // yellow
];

// Labels pour les types
export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
    income: 'Revenu',
    outcome: 'Dépense',
    both: 'Les deux',
};
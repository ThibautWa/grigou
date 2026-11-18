'use client';

import { useState, useEffect } from 'react';
import { Category, CATEGORY_ICONS, CATEGORY_COLORS, CATEGORY_TYPE_LABELS } from '@/types/category';

interface CategoryManagerProps {
  onClose: () => void;
  onCategoriesChanged?: () => void;
  initialType?: 'income' | 'outcome';
}

interface CategoryFormProps {
  isEdit?: boolean;
  formData: {
    name: string;
    type: 'income' | 'outcome' | 'both';
    icon: string;
    color: string;
  };
  onFormDataChange: (data: {
    name: string;
    type: 'income' | 'outcome' | 'both';
    icon: string;
    color: string;
  }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

// Composant CategoryForm extrait pour éviter la recréation à chaque rendu
function CategoryForm({ isEdit = false, formData, onFormDataChange, onSubmit, onCancel }: CategoryFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Nom */}
      <div>
        <label className="field-label">
          Nom de la catégorie *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
          className="field"
          placeholder="Ex: Épargne, Courses bio..."
        />
      </div>

      {/* Type */}
      <div>
        <label className="field-label">
          Type de transaction
        </label>
        <div className="flex gap-2">
          {(['outcome', 'income', 'both'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onFormDataChange({ ...formData, type })}
              className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${formData.type === type
                  ? type === 'outcome'
                    ? 'border-negative bg-negative/10 text-negative'
                    : type === 'income'
                      ? 'border-positive bg-positive/10 text-positive'
                      : 'border-accent bg-accent/10 text-accent'
                  : 'border-line hover:border-line-strong'
                }`}
            >
              {CATEGORY_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Icône */}
      <div>
        <label className="field-label">
          Icône
        </label>
        <div className="flex flex-wrap gap-1 p-2 border border-line rounded-lg max-h-32 overflow-y-auto">
          {CATEGORY_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => onFormDataChange({ ...formData, icon })}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-surface-2 transition-colors ${formData.icon === icon ? 'bg-accent/15 ring-2 ring-accent' : ''
                }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Couleur */}
      <div>
        <label className="field-label">
          Couleur
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onFormDataChange({ ...formData, color })}
              className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${formData.color === color ? 'ring-2 ring-offset-2 ring-accent' : ''
                }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Aperçu */}
      <div className="p-3 bg-surface-2 rounded-lg">
        <p className="text-sm text-fg-muted mb-2">Aperçu :</p>
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 flex items-center justify-center rounded"
            style={{ backgroundColor: formData.color + '20' }}
          >
            {formData.icon}
          </span>
          <span className="font-medium">{formData.name || 'Nom de la catégorie'}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${formData.type === 'outcome' ? 'bg-negative/15 text-negative' :
              formData.type === 'income' ? 'bg-positive/15 text-positive' :
                'bg-accent/15 text-accent'
            }`}>
            {CATEGORY_TYPE_LABELS[formData.type]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
        >
          {isEdit ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  );
}

export default function CategoryManager({
  onClose,
  onCategoriesChanged,
  initialType = 'outcome',
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'income' | 'outcome'>(initialType);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulaire
  const [formData, setFormData] = useState({
    name: '',
    type: initialType as 'income' | 'outcome' | 'both',
    icon: '📌',
    color: '#94a3b8',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddForm || editingCategory) {
          setShowAddForm(false);
          setEditingCategory(null);
          resetForm();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddForm, editingCategory, onClose]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: activeTab,
      icon: '📌',
      color: '#94a3b8',
    });
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories([...categories, newCategory]);
        setShowAddForm(false);
        resetForm();
        setSuccess('Catégorie créée avec succès');
        setTimeout(() => setSuccess(''), 3000);
        onCategoriesChanged?.();

        // Rafraîchir le sélecteur de catégories
        // @ts-ignore
        if (window.refreshCategorySelector) {
          // @ts-ignore
          window.refreshCategorySelector();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la création');
      }
    } catch (err) {
      setError('Erreur lors de la création de la catégorie');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setError('');

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories(categories.map(c =>
          c.id === updatedCategory.id ? updatedCategory : c
        ));
        setEditingCategory(null);
        resetForm();
        setSuccess('Catégorie mise à jour');
        setTimeout(() => setSuccess(''), 3000);
        onCategoriesChanged?.();

        // @ts-ignore
        if (window.refreshCategorySelector) {
          // @ts-ignore
          window.refreshCategorySelector();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.is_system) {
      setError('Impossible de supprimer une catégorie système');
      return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer la catégorie "${category.name}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${category.id}?force=true`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== category.id));
        setSuccess('Catégorie supprimée');
        setTimeout(() => setSuccess(''), 3000);
        onCategoriesChanged?.();

        // @ts-ignore
        if (window.refreshCategorySelector) {
          // @ts-ignore
          window.refreshCategorySelector();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type as 'income' | 'outcome' | 'both',
      icon: category.icon || '📌',
      color: category.color || '#94a3b8',
    });
    setShowAddForm(false);
  };

  const filteredCategories = categories.filter(c =>
    c.type === activeTab || c.type === 'both'
  );

  const systemCategories = filteredCategories.filter(c => c.is_system);
  const userCategories = filteredCategories.filter(c => !c.is_system);

  const handleFormCancel = () => {
    if (editingCategory) {
      setEditingCategory(null);
    } else {
      setShowAddForm(false);
    }
    resetForm();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Gérer les catégories
          </h2>
          <button
            onClick={onClose}
            className="text-fg-subtle hover:text-fg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-line">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('outcome')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'outcome'
                  ? 'border-negative text-negative'
                  : 'border-transparent text-fg-muted hover:text-fg'
                }`}
            >
              Dépenses
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'income'
                  ? 'border-positive text-positive'
                  : 'border-transparent text-fg-muted hover:text-fg'
                }`}
            >
              Revenus
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-negative/10 border border-negative/30 text-negative px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-positive/10 border border-positive/30 text-positive px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Formulaire d'ajout/édition */}
          {(showAddForm || editingCategory) && (
            <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
              <h3 className="mb-4 text-sm font-semibold text-fg">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h3>
              <CategoryForm
                isEdit={!!editingCategory}
                formData={formData}
                onFormDataChange={setFormData}
                onSubmit={editingCategory ? handleUpdate : handleCreate}
                onCancel={handleFormCancel}
              />
            </div>
          )}

          {/* Bouton ajouter */}
          {!showAddForm && !editingCategory && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setFormData({ ...formData, type: activeTab });
              }}
              className="btn-primary mb-6 w-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer une catégorie personnalisée
            </button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-4 border-line-strong border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Catégories personnalisées */}
              {userCategories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider mb-3">
                    Mes catégories ({userCategories.length})
                  </h3>
                  <div className="space-y-2">
                    {userCategories.map((category) => (
                      <div
                        key={category.id}
                        className="p-3 bg-surface border border-line rounded-lg flex items-center justify-between hover:border-line-strong transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-10 h-10 flex items-center justify-center rounded-lg text-lg"
                            style={{ backgroundColor: category.color + '20' }}
                          >
                            {category.icon}
                          </span>
                          <div>
                            <p className="font-medium text-fg">{category.name}</p>
                            <p className="text-xs text-fg-muted">
                              {CATEGORY_TYPE_LABELS[category.type as keyof typeof CATEGORY_TYPE_LABELS]}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(category)}
                            className="p-2 text-fg-muted hover:text-accent-hover hover:bg-accent/10 rounded transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className="p-2 text-fg-muted hover:text-negative hover:bg-negative/10 rounded transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Catégories système */}
              <div>
                <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider mb-3">
                  Catégories standards ({systemCategories.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {systemCategories.map((category) => (
                    <div
                      key={category.id}
                      className="p-3 bg-surface-2 border border-line rounded-lg flex items-center gap-2"
                    >
                      <span
                        className="w-8 h-8 flex items-center justify-center rounded"
                        style={{ backgroundColor: category.color + '20' }}
                      >
                        {category.icon}
                      </span>
                      <span className="text-sm font-medium text-fg truncate">
                        {category.name}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-fg-muted">
                  Les catégories standards ne peuvent pas être modifiées.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-surface-2">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
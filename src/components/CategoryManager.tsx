'use client';

import { useState, useEffect } from 'react';
import { Category, CATEGORY_ICONS, CATEGORY_COLORS, CATEGORY_TYPE_LABELS } from '@/types/category';

interface CategoryManagerProps {
  onClose: () => void;
  onCategoriesChanged?: () => void;
  initialType?: 'income' | 'outcome';
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

  const CategoryForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={isEdit ? handleUpdate : handleCreate} className="space-y-4">
      {/* Nom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom de la catégorie *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ex: Épargne, Courses bio..."
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type de transaction
        </label>
        <div className="flex gap-2">
          {(['outcome', 'income', 'both'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData({ ...formData, type })}
              className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                formData.type === type
                  ? type === 'outcome'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : type === 'income'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {CATEGORY_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Icône */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Icône
        </label>
        <div className="flex flex-wrap gap-1 p-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
          {CATEGORY_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setFormData({ ...formData, icon })}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors ${
                formData.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : ''
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Couleur */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Couleur
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Aperçu */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Aperçu :</p>
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 flex items-center justify-center rounded"
            style={{ backgroundColor: formData.color + '20' }}
          >
            {formData.icon}
          </span>
          <span className="font-medium">{formData.name || 'Nom de la catégorie'}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            formData.type === 'outcome' ? 'bg-red-100 text-red-700' :
            formData.type === 'income' ? 'bg-green-100 text-green-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {CATEGORY_TYPE_LABELS[formData.type]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            isEdit ? setEditingCategory(null) : setShowAddForm(false);
            resetForm();
          }}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {isEdit ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Gérer les catégories
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('outcome')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'outcome'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dépenses
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'income'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Formulaire d'ajout/édition */}
          {(showAddForm || editingCategory) && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h3>
              <CategoryForm isEdit={!!editingCategory} />
            </div>
          )}

          {/* Bouton ajouter */}
          {!showAddForm && !editingCategory && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setFormData({ ...formData, type: activeTab });
              }}
              className="w-full mb-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer une catégorie personnalisée
            </button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Catégories personnalisées */}
              {userCategories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Mes catégories ({userCategories.length})
                  </h3>
                  <div className="space-y-2">
                    {userCategories.map((category) => (
                      <div
                        key={category.id}
                        className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-10 h-10 flex items-center justify-center rounded-lg text-lg"
                            style={{ backgroundColor: category.color + '20' }}
                          >
                            {category.icon}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{category.name}</p>
                            <p className="text-xs text-gray-500">
                              {CATEGORY_TYPE_LABELS[category.type as keyof typeof CATEGORY_TYPE_LABELS]}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(category)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Catégories standards ({systemCategories.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {systemCategories.map((category) => (
                    <div
                      key={category.id}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2"
                    >
                      <span
                        className="w-8 h-8 flex items-center justify-center rounded"
                        style={{ backgroundColor: category.color + '20' }}
                      >
                        {category.icon}
                      </span>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {category.name}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Les catégories standards ne peuvent pas être modifiées.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
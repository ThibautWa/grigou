'use client';

import { useState, useEffect, useRef } from 'react';
import { Category } from '@/types/category';

interface CategorySelectorProps {
    value: number | null;
    onChange: (categoryId: number | null) => void;
    type: 'income' | 'outcome';
    required?: boolean;
    onManageCategories?: () => void;
}

export default function CategorySelector({
    value,
    onChange,
    type,
    required = false,
    onManageCategories,
}: CategorySelectorProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Charger les catégories
    useEffect(() => {
        fetchCategories();
    }, [type]);

    // Fermer le dropdown quand on clique en dehors
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch(`/api/categories?type=${type}`);
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

    // Rafraîchir les catégories (appelé après ajout/modification)
    const refreshCategories = () => {
        fetchCategories();
    };

    // Exposer la fonction de rafraîchissement
    useEffect(() => {
        // @ts-ignore
        window.refreshCategorySelector = refreshCategories;
        return () => {
            // @ts-ignore
            delete window.refreshCategorySelector;
        };
    }, [type]);

    const selectedCategory = categories.find(c => c.id === value);

    // Séparer catégories système et personnalisées
    const systemCategories = categories.filter(c => c.is_system);
    const userCategories = categories.filter(c => !c.is_system);

    // Filtrer par recherche
    const filteredSystemCategories = systemCategories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredUserCategories = userCategories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (category: Category) => {
        onChange(category.id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = () => {
        onChange(null);
        setSearchTerm('');
    };

    if (loading) {
        return (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    Chargement...
                </div>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Champ de sélection */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between transition-colors ${isOpen
                        ? 'border-blue-500 ring-2 ring-blue-500'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${!selectedCategory && required ? 'border-gray-300' : ''}`}
            >
                {selectedCategory ? (
                    <span className="flex items-center gap-2">
                        <span>{selectedCategory.icon}</span>
                        <span className="font-medium">{selectedCategory.name}</span>
                        {!selectedCategory.is_system && (
                            <span className="text-xs text-gray-400">(perso)</span>
                        )}
                    </span>
                ) : (
                    <span className="text-gray-400">Sélectionner une catégorie{required ? ' *' : ''}</span>
                )}
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    {/* Recherche */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Liste des catégories */}
                    <div className="max-h-52 overflow-y-auto">
                        {/* Catégories système */}
                        {filteredSystemCategories.length > 0 && (
                            <div>
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                                    Catégories standards
                                </div>
                                {filteredSystemCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => handleSelect(category)}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50 transition-colors ${value === category.id ? 'bg-blue-50 text-blue-700' : ''
                                            }`}
                                    >
                                        <span
                                            className="w-6 h-6 flex items-center justify-center rounded"
                                            style={{ backgroundColor: category.color + '20' }}
                                        >
                                            {category.icon}
                                        </span>
                                        <span className="flex-1">{category.name}</span>
                                        {value === category.id && (
                                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Catégories personnalisées */}
                        {filteredUserCategories.length > 0 && (
                            <div>
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                                    Mes catégories
                                </div>
                                {filteredUserCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => handleSelect(category)}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50 transition-colors ${value === category.id ? 'bg-blue-50 text-blue-700' : ''
                                            }`}
                                    >
                                        <span
                                            className="w-6 h-6 flex items-center justify-center rounded"
                                            style={{ backgroundColor: category.color + '20' }}
                                        >
                                            {category.icon}
                                        </span>
                                        <span className="flex-1">{category.name}</span>
                                        {value === category.id && (
                                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Aucun résultat */}
                        {filteredSystemCategories.length === 0 && filteredUserCategories.length === 0 && (
                            <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                Aucune catégorie trouvée
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-2 border-t border-gray-100 flex gap-2">
                        {selectedCategory && !required && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            >
                                Effacer
                            </button>
                        )}
                        {onManageCategories && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    onManageCategories();
                                }}
                                className="flex-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Gérer les catégories
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
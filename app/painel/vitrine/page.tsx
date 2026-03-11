"use client";

import { useState, useEffect, useRef } from "react";
import {
    Store, Plus, Trash2, Pencil, X, Loader2, Eye, EyeOff, ImagePlus,
    Search, Package, DollarSign, Upload, Save, AlertTriangle, ExternalLink,
    ShoppingBag, Sparkles, Tag
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useAgenda } from "@/contexts/AgendaContext";

interface Product {
    id: string;
    name: string;
    description?: string | null;
    price?: number | null;
    imageUrl?: string | null;
    showInVitrine: boolean;
    unitValue?: number;
    showStock: boolean;
    deliveryDeadline?: string | null;
    shippingCost?: number | null;
    variations?: any;
    quantity?: number;
    createdAt: string;
    updatedAt: string;
}

export default function VitrinePage() {
    const { companyId } = useAgenda();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: "",
        description: "",
        price: "",
        unitValue: "1",
        imageUrl: "",
        showInVitrine: true,
        showStock: false,
        deliveryDeadline: "",
        shippingCost: "",
        variations: [] as { name: string, options: string[] }[],
        quantity: "0",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            const res = await fetch("/api/painel/vitrine");
            if (!res.ok) throw new Error("Erro ao carregar");
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            toast.error("Erro ao carregar produtos da vitrine.");
        } finally {
            setLoading(false);
        }
    }

    function openNew() {
        setEditingProduct(null);
        setForm({ 
            name: "", 
            description: "", 
            price: "", 
            unitValue: "1",
            imageUrl: "", 
            showInVitrine: true,
            showStock: false,
            deliveryDeadline: "Pronta entrega",
            shippingCost: "0",
            variations: [],
            quantity: "0",
        });
        setIsModalOpen(true);
    }

    function openEdit(product: Product) {
        setEditingProduct(product);
        setForm({
            name: product.name,
            description: product.description || "",
            price: product.price ? String(product.price) : "",
            unitValue: product.unitValue ? String(product.unitValue) : "1",
            imageUrl: product.imageUrl || "",
            showInVitrine: product.showInVitrine,
            showStock: product.showStock || false,
            deliveryDeadline: product.deliveryDeadline || "",
            shippingCost: product.shippingCost ? String(product.shippingCost) : "0",
            variations: Array.isArray(product.variations) ? product.variations : [],
            quantity: product.quantity ? String(product.quantity) : "0",
        });
        setIsModalOpen(true);
    }

    async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Imagem muito grande. Máximo: 10MB");
            return;
        }

        setUploading(true);
        try {
            const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
                method: "POST",
                body: file,
            });
            const data = await res.json();
            if (data.url) {
                setForm(prev => ({ ...prev, imageUrl: data.url }));
                toast.success("Imagem enviada!");
            } else {
                toast.error("Erro ao enviar imagem.");
            }
        } catch (err) {
            toast.error("Erro ao enviar imagem.");
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        if (!form.name.trim()) {
            toast.error("Informe o nome do produto.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...(editingProduct ? { id: editingProduct.id } : {}),
                name: form.name,
                description: form.description,
                price: form.price ? Number(form.price) : 0,
                unitValue: form.unitValue ? Number(form.unitValue) : 1,
                imageUrl: form.imageUrl,
                showInVitrine: form.showInVitrine,
                showStock: form.showStock,
                deliveryDeadline: form.deliveryDeadline,
                shippingCost: form.shippingCost ? Number(form.shippingCost) : 0,
                variations: form.variations,
                quantity: form.quantity ? Number(form.quantity) : 0,
            };

            const res = await fetch("/api/painel/vitrine", {
                method: editingProduct ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(editingProduct ? "Produto atualizado!" : "Produto cadastrado!");
                setIsModalOpen(false);
                loadProducts();
            } else {
                const err = await res.json();
                toast.error(err.error || "Erro ao salvar.");
            }
        } catch (err) {
            toast.error("Erro de conexão.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        try {
            const res = await fetch("/api/painel/vitrine", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                toast.success("Produto removido!");
                setProducts(prev => prev.filter(p => p.id !== id));
                setDeleteConfirm(null);
            } else {
                toast.error("Erro ao remover.");
            }
        } catch (err) {
            toast.error("Erro de conexão.");
        }
    }

    async function toggleVitrine(product: Product) {
        try {
            const res = await fetch("/api/painel/vitrine", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    showInVitrine: !product.showInVitrine,
                }),
            });
            if (res.ok) {
                setProducts(prev =>
                    prev.map(p => p.id === product.id ? { ...p, showInVitrine: !p.showInVitrine } : p)
                );
                toast.success(product.showInVitrine ? "Removido da vitrine" : "Adicionado à vitrine");
            }
        } catch (err) {
            toast.error("Erro ao atualizar.");
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const vitrineCount = products.filter(p => p.showInVitrine).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black dark:text-white flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <Store size={24} className="text-white" />
                        </div>
                        Vitrine de Produtos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">
                        Gerencie os produtos que aparecem na sua página de agendamento.
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-black py-3 px-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95"
                >
                    <Plus size={20} /> Novo Produto
                </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <Package size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black dark:text-white">{products.length}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase">Total de Produtos</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                            <Eye size={20} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black dark:text-white">{vitrineCount}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase">Na Vitrine</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                            <EyeOff size={20} className="text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black dark:text-white">{products.length - vitrineCount}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase">Ocultos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEARCH */}
            <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    className="w-full border dark:border-gray-700 pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-violet-500 font-bold text-sm"
                    placeholder="Buscar produto..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* PRODUCTS GRID */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border dark:border-gray-700">
                    <div className="w-20 h-20 bg-violet-100 dark:bg-violet-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag size={32} className="text-violet-500" />
                    </div>
                    <h3 className="text-xl font-black dark:text-white mb-2">
                        {search ? "Nenhum produto encontrado" : "Sua vitrine está vazia"}
                    </h3>
                    <p className="text-gray-500 text-sm font-medium mb-6">
                        {search ? "Tente pesquisar por outro termo." : "Adicione seus produtos para exibi-los aos seus clientes."}
                    </p>
                    {!search && (
                        <button
                            onClick={openNew}
                            className="bg-gradient-to-r from-violet-600 to-pink-600 text-white font-black py-3 px-8 rounded-2xl shadow-lg hover:shadow-xl transition active:scale-95"
                        >
                            <Plus size={18} className="inline mr-2" /> Cadastrar Primeiro Produto
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            className={`bg-white dark:bg-gray-800 rounded-3xl border overflow-hidden shadow-sm hover:shadow-lg transition-all group ${product.showInVitrine
                                    ? "dark:border-gray-700 border-gray-100"
                                    : "dark:border-gray-800 border-gray-200 opacity-70"
                                }`}
                        >
                            {/* IMAGE */}
                            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                                        <ImagePlus size={40} />
                                        <p className="text-xs font-bold mt-2 uppercase">Sem Imagem</p>
                                    </div>
                                )}

                                {/* BADGES */}
                                <div className="absolute top-3 left-3 flex gap-2">
                                    {product.showInVitrine ? (
                                        <span className="bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-lg">
                                            <Eye size={12} /> Visível
                                        </span>
                                    ) : (
                                        <span className="bg-gray-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-lg">
                                            <EyeOff size={12} /> Oculto
                                        </span>
                                    )}
                                </div>

                                {product.price && Number(product.price) > 0 && (
                                    <div className="absolute top-3 right-3">
                                        <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-green-600 text-sm font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                                            <Tag size={14} /> R$ {Number(product.price).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* INFO */}
                            <div className="p-5">
                                <h3 className="font-black text-gray-900 dark:text-white text-lg truncate">{product.name}</h3>
                                {product.description && (
                                    <p className="text-gray-500 text-sm mt-1 line-clamp-2 font-medium">{product.description}</p>
                                )}

                                <div className="mt-2 flex items-center gap-2">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase shadow-sm ${Number(product.quantity || 0) <= 5 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                                        Estoque: {product.quantity || 0}
                                    </span>
                                </div>

                                {/* ACTIONS */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t dark:border-gray-700">
                                    <button
                                        onClick={() => toggleVitrine(product)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase transition ${product.showInVitrine
                                                ? "bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200"
                                            }`}
                                    >
                                        {product.showInVitrine ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {product.showInVitrine ? "Visível" : "Oculto"}
                                    </button>
                                    <button
                                        onClick={() => openEdit(product)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black uppercase bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(product.id)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black uppercase bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL CRIAR/EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800 flex flex-col max-h-[95vh]">
                        <div className="p-6 pb-0 shrink-0">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-10"
                            >
                                <X size={24} />
                            </button>
                            <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                                <Sparkles size={20} className="text-violet-500" />
                                {editingProduct ? "Editar Produto" : "Novo Produto"}
                            </h3>
                            <p className="text-gray-500 text-sm mt-1 font-medium">
                                {editingProduct ? "Atualize as informações do produto." : "Adicione um produto à sua vitrine."}
                            </p>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                            {/* IMAGE UPLOAD */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Foto do Produto</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all overflow-hidden group"
                                >
                                    {uploading ? (
                                        <Loader2 size={32} className="animate-spin text-violet-500" />
                                    ) : form.imageUrl ? (
                                        <>
                                            <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white text-sm font-black flex items-center gap-2">
                                                    <Upload size={16} /> Trocar Imagem
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <ImagePlus size={32} className="text-gray-400" />
                                            <p className="text-xs font-bold text-gray-400 mt-2">Clique para enviar</p>
                                            <p className="text-[10px] text-gray-400 mt-1">JPG, PNG ou WebP (máx. 10MB)</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUploadImage}
                                />
                                {form.imageUrl && (
                                    <button
                                        onClick={() => setForm(prev => ({ ...prev, imageUrl: "" }))}
                                        className="text-xs text-red-500 font-bold mt-2 hover:underline"
                                    >
                                        Remover imagem
                                    </button>
                                )}
                            </div>

                            {/* NAME */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Nome do Produto *</label>
                                <input
                                    className="w-full border dark:border-gray-700 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-violet-500 font-bold text-sm"
                                    placeholder="Ex: Kit Hidratação Profunda"
                                    value={form.name}
                                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            {/* DESCRIPTION */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Descrição</label>
                                <textarea
                                    className="w-full border dark:border-gray-700 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-violet-500 font-bold text-sm resize-none"
                                    placeholder="Descreva o produto para seus clientes..."
                                    rows={3}
                                    value={form.description}
                                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Preço (R$)</label>
                                    <div className="relative">
                                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full border dark:border-gray-700 p-3.5 pl-11 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-violet-500 font-bold text-sm"
                                            placeholder="0.00"
                                            value={form.price}
                                            onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">R$ Unitário / Pacote</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full border dark:border-gray-700 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-violet-500 font-bold text-sm"
                                        placeholder="1"
                                        value={form.unitValue}
                                        onChange={e => setForm(prev => ({ ...prev, unitValue: e.target.value }))}
                                    />
                                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 ml-2">Ex: 10 p/ vender pacote</p>
                                </div>
                            </div>

                            {/* STOCK QUANTITY */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Estoque em Mãos (Qtd)</label>
                                <div className="relative">
                                    <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full border dark:border-gray-700 p-3.5 pl-11 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-violet-500 font-bold text-sm"
                                        placeholder="0"
                                        value={form.quantity}
                                        onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* SHOW IN VITRINE */}
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.showInVitrine ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-200 dark:bg-gray-700"}`}>
                                            {form.showInVitrine ? <Eye size={20} className="text-green-600" /> : <EyeOff size={20} className="text-gray-400" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black dark:text-white">Exibir na Vitrine</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Visível no site</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setForm(prev => ({ ...prev, showInVitrine: !prev.showInVitrine }))}
                                        className={`w-12 h-7 rounded-full transition-all ${form.showInVitrine ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showInVitrine ? "translate-x-6" : "translate-x-1"}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.showStock ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-200 dark:bg-gray-700"}`}>
                                            <Package size={20} className={form.showStock ? "text-blue-600" : "text-gray-400"} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black dark:text-white">Exibir Quantidade</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Mostra estoque disponível</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setForm(prev => ({ ...prev, showStock: !prev.showStock }))}
                                        className={`w-12 h-7 rounded-full transition-all ${form.showStock ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showStock ? "translate-x-6" : "translate-x-1"}`} />
                                    </button>
                                </div>
                            </div>

                            {/* DELIVERY & SHIPPING */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Prazo de Entrega</label>
                                    <input
                                        className="w-full border dark:border-gray-700 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-violet-500 font-bold text-sm"
                                        placeholder="Ex: Pronta entrega"
                                        value={form.deliveryDeadline}
                                        onChange={e => setForm(prev => ({ ...prev, deliveryDeadline: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Valor do Frete</label>
                                    <input
                                        type="number"
                                        className="w-full border dark:border-gray-700 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-violet-500 font-bold text-sm"
                                        placeholder="0.00"
                                        value={form.shippingCost}
                                        onChange={e => setForm(prev => ({ ...prev, shippingCost: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* VARIATIONS */}
                            <div className="pt-4 border-t dark:border-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-sm font-black dark:text-white flex items-center gap-2">
                                        <Tag size={18} className="text-violet-500" /> Variações
                                    </label>
                                    <button 
                                        onClick={() => setForm(prev => ({ ...prev, variations: [...prev.variations, { name: "", options: [] }] }))}
                                        className="text-xs font-black text-violet-600 uppercase hover:underline"
                                    >
                                        + Adicionar Tipo
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {form.variations.map((v, i) => (
                                        <div key={i} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 relative">
                                            <button 
                                                onClick={() => {
                                                    const newV = [...form.variations];
                                                    newV.splice(i, 1);
                                                    setForm(prev => ({ ...prev, variations: newV }));
                                                }}
                                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
                                            >
                                                <X size={14} />
                                            </button>
                                            <input 
                                                className="bg-transparent border-b border-gray-300 dark:border-gray-600 w-full mb-3 font-black text-sm outline-none focus:border-violet-500 dark:text-white"
                                                placeholder="Nome (ex: Tamanho, Cor...)"
                                                value={v.name}
                                                onChange={e => {
                                                    const newV = [...form.variations];
                                                    newV[i].name = e.target.value;
                                                    setForm(prev => ({ ...prev, variations: newV }));
                                                }}
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                {v.options.map((opt, optIndex) => (
                                                    <span key={optIndex} className="bg-white dark:bg-gray-700 px-3 py-1 rounded-lg text-xs font-bold border dark:border-gray-600 flex items-center gap-1 dark:text-gray-300">
                                                        {opt}
                                                        <button 
                                                            onClick={() => {
                                                                const newV = [...form.variations];
                                                                newV[i].options.splice(optIndex, 1);
                                                                setForm(prev => ({ ...prev, variations: newV }));
                                                            }}
                                                            className="text-gray-400 hover:text-red-500"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </span>
                                                ))}
                                                <input 
                                                    className="bg-white dark:bg-gray-700 px-3 py-1 rounded-lg text-xs font-bold border-2 border-dashed border-gray-200 dark:border-gray-600 w-24 outline-none focus:border-violet-400 dark:text-white"
                                                    placeholder="+ Opção"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            const val = e.currentTarget.value.trim();
                                                            if (val) {
                                                                const newV = [...form.variations];
                                                                newV[i].options.push(val);
                                                                setForm(prev => ({ ...prev, variations: newV }));
                                                                e.currentTarget.value = "";
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {form.variations.length === 0 && (
                                        <p className="text-center text-[10px] text-gray-400 font-bold uppercase py-2">Nenhuma variação cadastrada</p>
                                    )}
                                </div>
                            </div>

                            {/* SAVE BUTTON */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-black py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <><Loader2 size={20} className="animate-spin" /> Salvando...</>
                                ) : (
                                    <><Save size={20} /> {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMAR EXCLUSÃO */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[120] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl border dark:border-gray-800 text-center animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-black dark:text-white mb-2">Excluir Produto?</h3>
                        <p className="text-gray-500 text-sm font-medium mb-6">
                            Essa ação não pode ser desfeita. O produto será removido permanentemente.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-3 px-6 rounded-2xl font-black text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 py-3 px-6 rounded-2xl font-black text-sm bg-red-500 text-white hover:bg-red-600 transition shadow-lg"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

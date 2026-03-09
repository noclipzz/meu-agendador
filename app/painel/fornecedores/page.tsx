"use client";

import { useState, useEffect } from "react";
import {
    Truck, Plus, Search, Trash2, Pencil, X,
    Phone, Mail, FileText, MapPin, Loader2,
    Building2, Globe, Eye, Package, DollarSign,
    ExternalLink, Calendar, Receipt, ChevronRight, Box
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FornecedoresPage() {
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [salvando, setSalvando] = useState(false);

    // Profile States
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedSupplierProfile, setSelectedSupplierProfile] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Linked Products States
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [isVincularModalOpen, setIsVincularModalOpen] = useState(false);
    const [vinculoForm, setVinculoForm] = useState({
        productId: "",
        price: "",
        sku: "",
        notes: ""
    });

    const [form, setForm] = useState({
        name: "",
        corporateName: "",
        cnpj: "",
        phone: "",
        email: "",
        cep: "",
        address: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        notes: ""
    });

    const maskCPFCNPJ = (value: string) => {
        const raw = value.replace(/\D/g, "");
        if (raw.length <= 11) {
            return raw
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d{1,2})/, "$1-$2")
                .substring(0, 14);
        }
        return raw
            .replace(/(\d{2})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1/$2")
            .replace(/(\d{4})(\d{1,2})/, "$1-$2")
            .substring(0, 18);
    };

    const maskPhone = (value: string) => {
        const raw = value.replace(/\D/g, "");
        if (raw.length > 10) {
            return raw
                .replace(/(\d{2})(\d)/, "($1) $2")
                .replace(/(\d{5})(\d)/, "$1-$2")
                .substring(0, 15);
        }
        return raw
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .substring(0, 14);
    };

    const maskCEP = (value: string) => {
        return value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").substring(0, 9);
    };

    async function handleBuscarCEP(cep: string) {
        const rawCEP = cep.replace(/\D/g, "");
        if (rawCEP.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${rawCEP}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setForm(prev => ({
                        ...prev,
                        address: data.logradouro || prev.address,
                        neighborhood: data.bairro || prev.neighborhood,
                        city: data.localidade || prev.city,
                        state: data.uf || prev.state
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP", error);
            }
        }
    }

    async function handleBuscarCNPJ(cnpj: string) {
        const rawCNPJ = cnpj.replace(/\D/g, "");
        if (rawCNPJ.length === 14) {
            const loadingToast = toast.loading("Buscando dados do CNPJ...");
            try {
                const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawCNPJ}`);
                if (res.ok) {
                    const data = await res.json();
                    setForm(prev => ({
                        ...prev,
                        name: data.nome_fantasia || data.razao_social || prev.name,
                        corporateName: data.razao_social || prev.corporateName,
                        phone: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : prev.phone,
                        email: data.email || prev.email,
                        cep: data.cep ? maskCEP(data.cep) : prev.cep,
                        address: data.logradouro || prev.address,
                        number: data.numero || prev.number,
                        complement: data.complemento || prev.complement,
                        neighborhood: data.bairro || prev.neighborhood,
                        city: data.municipio || prev.city,
                        state: data.uf || prev.state
                    }));
                    toast.success("Dados importados com sucesso!", { id: loadingToast });
                } else {
                    toast.error("CNPJ não encontrado", { id: loadingToast });
                }
            } catch (error) {
                toast.error("Erro ao buscar CNPJ", { id: loadingToast });
            }
        }
    }

    useEffect(() => {
        loadSuppliers();
    }, []);

    async function loadSuppliers() {
        try {
            const res = await fetch('/api/painel/fornecedores');
            const data = await res.json();
            if (Array.isArray(data)) {
                setSuppliers(data);
            } else {
                setSuppliers([]);
            }

            // Load all products for the vincular dropdown
            const resProducts = await fetch('/api/painel/estoque');
            const productsData = await resProducts.json();
            if (Array.isArray(productsData)) setAllProducts(productsData);

        } catch (error) {
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    }

    async function openProfile(supplierId: string) {
        setLoadingProfile(true);
        setIsProfileOpen(true);
        try {
            const res = await fetch(`/api/painel/fornecedores?id=${supplierId}`);
            if (res.ok) {
                const fullData = await res.json();
                setSelectedSupplierProfile(fullData);
            } else {
                toast.error("Erro ao carregar ficha");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setLoadingProfile(false);
        }
    }

    async function handleVincularProduto() {
        if (!vinculoForm.productId) return toast.error("Selecione um produto");
        setSalvando(true);

        try {
            const res = await fetch('/api/painel/fornecedores/produtos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...vinculoForm,
                    supplierId: selectedSupplierProfile.id
                })
            });

            if (res.ok) {
                toast.success("Produto vinculado!");
                setIsVincularModalOpen(false);
                setVinculoForm({ productId: "", price: "", sku: "", notes: "" });
                openProfile(selectedSupplierProfile.id); // Refresh profile
            } else {
                toast.error("Erro ao vincular");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setSalvando(false);
        }
    }

    async function desvincularProduto(id: string) {
        if (!confirm("Remover este produto deste fornecedor?")) return;

        try {
            const res = await fetch(`/api/painel/fornecedores/produtos?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success("Vínculo removido");
                openProfile(selectedSupplierProfile.id);
            }
        } catch (error) {
            toast.error("Erro ao desvincular");
        }
    }

    async function handleSave() {
        if (!form.name) return toast.error("Nome é obrigatório");
        setSalvando(true);

        try {
            const method = editingSupplier ? 'PUT' : 'POST';
            const res = await fetch('/api/painel/fornecedores', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingSupplier ? { ...form, id: editingSupplier.id } : form)
            });

            if (res.ok) {
                toast.success(editingSupplier ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
                setIsModalOpen(false);
                setEditingSupplier(null);
                setForm({
                    name: "", corporateName: "", cnpj: "", phone: "", email: "",
                    cep: "", address: "", number: "", complement: "",
                    neighborhood: "", city: "", state: "", notes: ""
                });
                loadSuppliers();
            } else {
                toast.error("Erro ao salvar fornecedor");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setSalvando(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;

        try {
            const res = await fetch('/api/painel/fornecedores', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                toast.success("Fornecedor removido");
                loadSuppliers();
            } else {
                toast.error("Erro ao excluir");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        }
    }

    function openEdit(supplier: any) {
        setEditingSupplier(supplier);
        setForm({ ...supplier });
        setIsModalOpen(true);
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.corporateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cnpj?.includes(searchTerm)
    );

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Carregando Fornecedores...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <Truck size={32} className="text-blue-600" />
                        Fornecedores
                    </h1>
                    <p className="text-gray-500 font-bold text-sm">Gestão de parceiros e fornecedores de insumos.</p>
                </div>
                <button
                    onClick={() => { setEditingSupplier(null); setForm({ name: "", corporateName: "", cnpj: "", phone: "", email: "", cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "" }); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-lg active:scale-95"
                >
                    <Plus size={20} /> Novo Fornecedor
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nome, razão social ou CNPJ..."
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(supplier => (
                    <div key={supplier.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openProfile(supplier.id)} className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition" title="Ver Ficha"><Eye size={18} /></button>
                            <button onClick={() => openEdit(supplier)} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition"><Pencil size={18} /></button>
                            <button onClick={() => handleDelete(supplier.id)} className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition"><Trash2 size={18} /></button>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xl">
                                {supplier.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-lg dark:text-white leading-tight">{supplier.name}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{supplier.corporateName || "Pessoa Física"}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {supplier.cnpj && (
                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    <Building2 size={16} /> {supplier.cnpj}
                                </div>
                            )}
                            {supplier.phone && (
                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    <Phone size={16} /> {supplier.phone}
                                </div>
                            )}
                            {supplier.email && (
                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    <Mail size={16} /> {supplier.email}
                                </div>
                            )}
                            {(supplier.city || supplier.state) && (
                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    <MapPin size={16} /> {supplier.city}, {supplier.state}
                                </div>
                            )}
                        </div>

                        {supplier.notes && (
                            <div className="mt-4 pt-4 border-t dark:border-gray-700 italic text-xs text-gray-400">
                                "{supplier.notes}"
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredSuppliers.length === 0 && (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <Truck size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="font-bold text-gray-400">Nenhum fornecedor encontrado.</p>
                </div>
            )}

            {/* MODAL CADASTRO/EDIÇÃO */}
            {isModalOpen && (
                // ... (existing modal remains, I'll close it and then add physical ones below)
                // Actually I should keep it for the replacement to work
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h2 className="text-2xl font-black dark:text-white">{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</h2>
                                <p className="text-sm text-gray-500 font-bold">Preencha os dados abaixo.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-2xl transition"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">CNPJ / CPF</label>
                                    <input
                                        type="text"
                                        placeholder="00.000.000/0000-00"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.cnpj}
                                        onChange={(e) => {
                                            const masked = maskCPFCNPJ(e.target.value);
                                            setForm({ ...form, cnpj: masked });
                                            if (masked.replace(/\D/g, "").length === 14) {
                                                handleBuscarCNPJ(masked);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Nome Fantasia *</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Razão Social</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.corporateName}
                                        onChange={(e) => setForm({ ...form, corporateName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Telefone</label>
                                    <input
                                        type="tel"
                                        placeholder="(00) 00000-0000"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">E-mail</label>
                                    <input
                                        type="email"
                                        placeholder="exemplo@email.com"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">CEP</label>
                                    <input
                                        type="text"
                                        placeholder="00000-000"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.cep}
                                        onChange={(e) => {
                                            const masked = maskCEP(e.target.value);
                                            setForm({ ...form, cep: masked });
                                            if (masked.length === 9) handleBuscarCEP(masked);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Logradouro (Rua/Av)</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Número</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.number}
                                        onChange={(e) => setForm({ ...form, number: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Bairro</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.neighborhood}
                                        onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Complemento</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.complement}
                                        onChange={(e) => setForm({ ...form, complement: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Cidade</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.city}
                                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">UF (Estado)</label>
                                    <input
                                        type="text"
                                        maxLength={2}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold uppercase"
                                        value={form.state}
                                        onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase ml-2">Observações Internas</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold h-32 resize-none"
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                            <button
                                onClick={handleSave}
                                disabled={salvando}
                                className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-400"
                            >
                                {salvando ? <Loader2 className="animate-spin" /> : editingSupplier ? "Salvar Alterações" : "Cadastrar Fornecedor"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FICHA DO FORNECEDOR (PROFILE) */}
            {isProfileOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-end">
                    <div className="bg-gray-50 dark:bg-[#0a0a0a] w-full max-w-4xl h-full shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-500">
                        {loadingProfile ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                                <p className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Carregando Ficha...</p>
                            </div>
                        ) : selectedSupplierProfile && (
                            <>
                                <div className="p-8 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex justify-between items-start">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-500/20">
                                            {selectedSupplierProfile.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black dark:text-white leading-tight">{selectedSupplierProfile.name}</h2>
                                            <p className="text-sm font-bold text-gray-500 flex items-center gap-2 mt-1">
                                                <Building2 size={16} /> {selectedSupplierProfile.corporateName || "Pessoa Física"}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsProfileOpen(false)} className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition"><X size={24} /></button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                                    {/* Grid de Contato e Localização */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border dark:border-gray-800 space-y-4">
                                            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                                                <Phone size={14} className="text-blue-500" /> Informações de Contato
                                            </h3>
                                            <div className="space-y-3 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500 font-bold">Telefone:</span>
                                                    <span className="text-sm font-black dark:text-white">{selectedSupplierProfile.phone || "-"}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500 font-bold">E-mail:</span>
                                                    <span className="text-sm font-black dark:text-white">{selectedSupplierProfile.email || "-"}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-500 font-bold">CNPJ:</span>
                                                    <span className="text-sm font-black dark:text-white">{selectedSupplierProfile.cnpj || "-"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border dark:border-gray-800 space-y-4">
                                            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                                                <MapPin size={14} className="text-emerald-500" /> Localização
                                            </h3>
                                            <div className="space-y-3 pt-2">
                                                <p className="text-sm font-black dark:text-white">
                                                    {selectedSupplierProfile.address}, {selectedSupplierProfile.number}
                                                </p>
                                                <p className="text-sm text-gray-500 font-bold">
                                                    {selectedSupplierProfile.neighborhood} - {selectedSupplierProfile.city} / {selectedSupplierProfile.state}
                                                </p>
                                                <p className="text-xs font-mono text-gray-400">{selectedSupplierProfile.cep}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PRODUTOS VINCULADOS */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-4">
                                            <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
                                                <Package className="text-orange-500" size={24} />
                                                Produtos Fornecidos
                                                <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-md ml-2">{selectedSupplierProfile.products?.length || 0}</span>
                                            </h3>
                                            <button
                                                onClick={() => setIsVincularModalOpen(true)}
                                                className="bg-orange-500 text-white px-5 py-2 rounded-xl text-sm font-black hover:bg-orange-600 transition flex items-center gap-2 shadow-lg shadow-orange-500/20"
                                            >
                                                <Plus size={18} /> Vincular Produto
                                            </button>
                                        </div>

                                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 overflow-hidden shadow-sm">
                                            {selectedSupplierProfile.products?.length === 0 ? (
                                                <div className="p-12 text-center">
                                                    <Package size={40} className="mx-auto text-gray-200 mb-4" />
                                                    <p className="text-gray-400 font-bold">Nenhum produto vinculado ainda.</p>
                                                </div>
                                            ) : (
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Produto</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">SKU Fornecedor</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Preço de Custo</th>
                                                            <th className="px-6 py-4 text-center"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-gray-800">
                                                        {selectedSupplierProfile.products.map((sp: any) => (
                                                            <tr key={sp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition group">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                                                                            <Package size={16} />
                                                                        </div>
                                                                        <p className="font-black text-gray-800 dark:text-white text-sm">{sp.product.name}</p>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs text-gray-400">
                                                                    {sp.sku || "-"}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                                                                            {Number(sp.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </span>
                                                                        {sp.notes && <span className="text-[10px] text-gray-400">{sp.notes}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <button
                                                                        onClick={() => desvincularProduto(sp.id)}
                                                                        className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black dark:text-white flex items-center gap-2 px-4 pt-4">
                                        <Receipt className="text-purple-500" size={24} />
                                        Últimas Despesas Financeiras
                                    </h3>
                                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 overflow-hidden shadow-sm">
                                        {selectedSupplierProfile.expenses?.length === 0 ? (
                                            <div className="p-12 text-center">
                                                <Receipt size={40} className="mx-auto text-gray-200 mb-4" />
                                                <p className="text-gray-400 font-bold">Nenhuma despesa registrada para este fornecedor.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y dark:divide-gray-800">
                                                {selectedSupplierProfile.expenses.map((exp: any) => (
                                                    <div key={exp.id} className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center">
                                                                <Calendar size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-gray-800 dark:text-white text-sm">{exp.description}</p>
                                                                <p className="text-xs font-bold text-gray-400">{format(new Date(exp.dueDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-gray-900 dark:text-white">{Number(exp.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${exp.status === 'PAGO' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                                {exp.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* HISTORICO DE LOTES / COMPRAS */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-black dark:text-white flex items-center gap-2 px-4 pt-4">
                                        <Box className="text-blue-500" size={24} />
                                        Histórico de Entradas de Estoque
                                    </h3>
                                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 overflow-hidden shadow-sm mb-10">
                                        {selectedSupplierProfile.stockLogs?.length === 0 ? (
                                            <div className="p-12 text-center">
                                                <Box size={40} className="mx-auto text-gray-200 mb-4" />
                                                <p className="text-gray-400 font-bold">Nenhuma entrada de estoque registrada para este fornecedor.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y dark:divide-gray-800">
                                                {selectedSupplierProfile.stockLogs.map((log: any) => (
                                                    <div key={log.id} className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                                                                <Plus size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-gray-800 dark:text-white text-sm">{log.product.name}</p>
                                                                <p className="text-xs font-bold text-gray-400">Entrada em {format(new Date(log.createdAt), "dd/MM/yyyy")}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-emerald-600">+{Number(log.quantity)} {log.product.unit}</p>
                                                            {log.totalCost && (
                                                                <p className="text-xs font-bold text-gray-400">Total: {Number(log.totalCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                    </>
                        )}
                </div>
                </div>
    )
}

{/* MODAL VINCULAR PRODUTO */ }
{
    isVincularModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-black dark:text-white">Vincular Produto</h3>
                    <button onClick={() => setIsVincularModalOpen(false)} className="text-gray-400 font-bold"><X size={24} /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase">Selecione o Produto</label>
                        <select
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold dark:text-white"
                            value={vinculoForm.productId}
                            onChange={(e) => setVinculoForm({ ...vinculoForm, productId: e.target.value })}
                        >
                            <option value="">Escolha...</option>
                            {allProducts.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">Preço de Custo (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold dark:text-white"
                                value={vinculoForm.price}
                                onChange={(e) => setVinculoForm({ ...vinculoForm, price: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">SKU Fornecedor</label>
                            <input
                                type="text"
                                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold dark:text-white"
                                placeholder="Código"
                                value={vinculoForm.sku}
                                onChange={(e) => setVinculoForm({ ...vinculoForm, sku: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase">Observações</label>
                        <input
                            type="text"
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold dark:text-white"
                            value={vinculoForm.notes}
                            onChange={(e) => setVinculoForm({ ...vinculoForm, notes: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={handleVincularProduto}
                        disabled={salvando}
                        className="w-full bg-orange-500 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition disabled:bg-gray-400"
                    >
                        {salvando ? <Loader2 className="animate-spin mx-auto" strokeWidth={3} /> : "Confirmar Vínculo"}
                    </button>
                </div>
            </div>
        </div>
    )
}
        </div >
    );
}

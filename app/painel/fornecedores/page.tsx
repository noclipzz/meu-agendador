"use client";

import { useState, useEffect } from "react";
import {
    Truck, Plus, Search, Trash2, Pencil, X,
    Phone, Mail, FileText, MapPin, Loader2,
    Building2, Globe
} from "lucide-react";
import { toast } from "sonner";

export default function FornecedoresPage() {
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [salvando, setSalvando] = useState(false);

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

    useEffect(() => {
        loadSuppliers();
    }, []);

    async function loadSuppliers() {
        try {
            const res = await fetch('/api/painel/fornecedores');
            const data = await res.json();
            setSuppliers(data);
        } catch (error) {
            toast.error("Erro ao carregar fornecedores");
        } finally {
            setLoading(false);
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
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">CNPJ / CPF</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.cnpj}
                                        onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">Telefone</label>
                                    <input
                                        type="tel"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">E-mail</label>
                                    <input
                                        type="email"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-2">CEP</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold"
                                        value={form.cep}
                                        onChange={(e) => setForm({ ...form, cep: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase ml-2">Endereço Completo</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-2 ring-blue-500 font-bold h-24 resize-none"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
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
        </div>
    );
}

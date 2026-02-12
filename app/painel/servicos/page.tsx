"use client";

import { useState, useEffect } from "react";
// --- TROQUEI SCISSORS POR BRIEFCASE PARA FICAR GENÉRICO ---
import { Plus, Search, Briefcase, Trash2, Save, X, Pencil, Beaker } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export default function ServicosPage() {
    const [servicos, setServicos] = useState<any[]>([]);
    const [estoque, setEstoque] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState("");
    const [servicoParaExcluir, setServicoParaExcluir] = useState<string | null>(null);

    // --- CORREÇÃO: VALORES INICIAIS VAZIOS PARA NÃO ATRAPALHAR O USUÁRIO ---
    const [form, setForm] = useState({ id: "", name: "", price: "", duration: "", commission: "" });

    const [consumo, setConsumo] = useState<{ productId: string, amount: string, name?: string, unit?: string }[]>([]);
    const [prodSelecionado, setProdSelecionado] = useState("");
    const [qtdConsumo, setQtdConsumo] = useState("");

    useEffect(() => { carregarDados(); }, []);

    async function carregarDados() {
        try {
            const [resServ, resEstoque] = await Promise.all([
                fetch('/api/painel/servicos'),
                fetch('/api/painel/estoque')
            ]);

            const servData = await resServ.json();
            setServicos(Array.isArray(servData) ? servData : []);

            // Se o estoque falhar (plano sem acesso), usa array vazio
            if (resEstoque.ok) {
                const estData = await resEstoque.json();
                setEstoque(Array.isArray(estData) ? estData : []);
            } else {
                console.log('⚠️ Estoque não disponível neste plano');
                setEstoque([]);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setServicos([]);
            setEstoque([]);
        } finally {
            setLoading(false);
        }
    }

    function abrirModal(servico?: any) {
        if (servico) {
            setForm({
                id: servico.id,
                name: servico.name,
                price: servico.price,
                duration: servico.duration,
                commission: servico.commission
            });
            setConsumo(servico.products.map((p: any) => ({
                productId: p.productId,
                amount: p.amount,
                name: p.product.name,
                unit: p.product.unit
            })));
        } else {
            // --- CORREÇÃO: AO ABRIR PARA CRIAR, LIMPA TUDO ---
            setForm({ id: "", name: "", price: "", duration: "", commission: "" });
            setConsumo([]);
        }
        setProdSelecionado("");
        setQtdConsumo("");
        setModalOpen(true);
    }

    function adicionarProdutoNaReceita() {
        if (!prodSelecionado || !qtdConsumo) return toast.error("Selecione produto e quantidade");

        if (!Array.isArray(estoque) || estoque.length === 0) {
            return toast.error("Nenhum produto disponível no estoque");
        }

        const produtoOriginal = estoque.find(p => p.id === prodSelecionado);

        setConsumo(prev => [
            ...prev,
            {
                productId: prodSelecionado,
                amount: qtdConsumo,
                name: produtoOriginal.name,
                unit: produtoOriginal.unit
            }
        ]);

        setProdSelecionado("");
        setQtdConsumo("");
    }

    function removerProdutoDaReceita(index: number) {
        setConsumo(prev => prev.filter((_, i) => i !== index));
    }

    async function salvar() {
        if (!form.name || !form.price) return toast.error("Preencha nome e preço");

        const payload = {
            ...form,
            products: consumo
        };

        const res = await fetch('/api/painel/servicos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            toast.success("Serviço salvo!");
            setModalOpen(false);
            carregarDados();
        } else {
            toast.error("Erro ao salvar.");
        }
    }

    async function confirmarExclusao() {
        if (!servicoParaExcluir) return;
        await fetch('/api/painel/servicos', { method: 'DELETE', body: JSON.stringify({ id: servicoParaExcluir }) });
        carregarDados();
        toast.success("Excluído.");
        setServicoParaExcluir(null);
    }

    const filtrados = servicos.filter(s => s.name.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="p-6 space-y-6 pb-20 font-sans">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white">Meus Serviços</h1>
                <button onClick={() => abrirModal()} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"><Plus size={20} /> Novo Serviço</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 flex items-center gap-3 shadow-sm">
                <Search className="text-gray-400 ml-3" size={20} />
                <input className="bg-transparent outline-none flex-1 py-3 text-sm dark:text-white" placeholder="Buscar serviço..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtrados.map(s => (
                    <div key={s.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-200 transition-all shadow-sm group">
                        <div className="flex justify-between items-start mb-4">
                            {/* ÍCONE GENÉRICO (MALETA) */}
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center"><Briefcase size={24} /></div>
                            <div className="flex gap-2">
                                <button onClick={() => abrirModal(s)} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl hover:text-blue-600 transition"><Pencil size={16} /></button>
                                <button onClick={() => setServicoParaExcluir(s.id)} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl hover:text-red-600 transition"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <h3 className="font-black text-lg dark:text-white uppercase truncate">{s.name}</h3>
                        <p className="text-sm font-bold text-gray-400">{s.duration || 30} min • Comissão: {s.commission || 0}%</p>
                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-2xl font-black text-green-600">R$ {Number(s.price).toFixed(2)}</span>
                            {s.products.length > 0 && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1"><Beaker size={10} /> {s.products.length} Produtos</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-between items-center">
                            <h2 className="text-2xl font-black dark:text-white">{form.id ? "Editar Serviço" : "Novo Serviço"}</h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"><X /></button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                            {/* DADOS BÁSICOS */}
                            <div className="space-y-4">
                                <input className="w-full p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none dark:text-white" placeholder="Nome do Serviço" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                <div className="grid grid-cols-3 gap-4">
                                    <input type="number" className="p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none" placeholder="Preço (R$)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                                    {/* PLACEHOLDER EXPLICA O CAMPO */}
                                    <input type="number" className="p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none" placeholder="Duração (min)" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                                    <input type="number" className="p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none" placeholder="Comissão (%)" value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })} />
                                </div>
                            </div>

                            {/* ÁREA DE PRODUTOS (FICHA TÉCNICA) */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl border dark:border-gray-700">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Beaker size={14} /> Consumo de Produtos (Ficha Técnica)</h3>

                                <div className="flex gap-2 mb-4">
                                    <select
                                        className="flex-1 p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 font-bold text-sm outline-none dark:text-white"
                                        value={prodSelecionado}
                                        onChange={e => setProdSelecionado(e.target.value)}
                                        disabled={!Array.isArray(estoque) || estoque.length === 0}
                                    >
                                        <option value="">
                                            {!Array.isArray(estoque) || estoque.length === 0
                                                ? "Nenhum produto disponível (Plano MASTER necessário)"
                                                : "Selecione um produto..."}
                                        </option>
                                        {Array.isArray(estoque) && estoque.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                                    </select>
                                    <input type="number" className="w-24 p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 font-bold text-sm outline-none" placeholder="Qtd" value={qtdConsumo} onChange={e => setQtdConsumo(e.target.value)} />
                                    <button onClick={adicionarProdutoNaReceita} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition"><Plus size={20} /></button>
                                </div>

                                <div className="space-y-2">
                                    {consumo.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700">
                                            <p className="font-bold text-sm dark:text-white">{item.name}</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">- {item.amount} {item.unit}</span>
                                                <button onClick={() => removerProdutoDaReceita(index)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {consumo.length === 0 && <p className="text-center text-gray-400 text-xs italic">Nenhum produto vinculado.</p>}
                                </div>
                            </div>

                            <button onClick={salvar} className="w-full bg-black hover:bg-gray-800 text-white font-black py-4 rounded-2xl transition shadow-lg flex justify-center items-center gap-2">
                                <Save size={20} /> Salvar Serviço
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL DE CONFIRMAÇÃO */}
            <ConfirmationModal
                isOpen={!!servicoParaExcluir}
                onClose={() => setServicoParaExcluir(null)}
                onConfirm={confirmarExclusao}
                title="Excluir Serviço?"
                message="Tem certeza que deseja remover este serviço? Esta ação não pode ser desfeita."
                isDeleting={true}
            />
        </div>
    );
}
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatarMoeda, desformatarMoeda } from "@/lib/validators";
import { Wallet, Plus, Edit2, Trash2, ArrowLeft, Loader2, Save, X, Building } from "lucide-react";

export default function ContasBancariasPage() {
    const pathname = usePathname();
    const isConfig = pathname.startsWith("/painel/config");
    const [loading, setLoading] = useState(true);
    const [contas, setContas] = useState<any[]>([]);

    const [modalAberto, setModalAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const [form, setForm] = useState({
        id: "",
        name: "",
        balance: ""
    });

    useEffect(() => {
        carregarContas();
    }, []);

    async function carregarContas() {
        setLoading(true);
        try {
            const res = await fetch("/api/painel/financeiro/contas-bancarias");
            const data = await res.json();
            if (res.ok) setContas(data);
            else toast.error("Erro ao carregar contas.");
        } catch (error) {
            toast.error("Erro na conexão.");
        } finally {
            setLoading(false);
        }
    }

    function abrirNovaConta() {
        setForm({ id: "", name: "", balance: "" });
        setModalAberto(true);
    }

    function abrirEdicao(conta: any) {
        setForm({
            id: conta.id,
            name: conta.name,
            balance: conta.balance ? formatarMoeda(conta.balance.toString()) : ""
        });
        setModalAberto(true);
    }

    async function salvarConta() {
        if (!form.name) return toast.error("Preencha o nome da conta.");

        setSalvando(true);
        const method = form.id ? "PUT" : "POST";

        try {
            const res = await fetch("/api/painel/financeiro/contas-bancarias", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: form.id,
                    name: form.name,
                    balance: desformatarMoeda(form.balance)
                })
            });

            if (res.ok) {
                toast.success(form.id ? "Conta atualizada!" : "Conta criada!");
                setModalAberto(false);
                carregarContas();
            } else {
                toast.error("Erro ao salvar conta.");
            }
        } catch (error) {
            toast.error("Erro na comunicação com servidor.");
        } finally {
            setSalvando(false);
        }
    }

    async function deletarConta(id: string) {
        if (!confirm("Tem certeza que deseja remover esta conta bancária/fundo de caixa?")) return;

        try {
            const res = await fetch("/api/painel/financeiro/contas-bancarias", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                toast.success("Conta removida com sucesso!");
                carregarContas();
            } else {
                const data = await res.json();
                toast.error(data.error || "Erro ao remover.");
            }
        } catch (error) {
            toast.error("Erro na requisição.");
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header - Hidden in Config because parent layout provide it */}
            {!isConfig && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                                <ArrowLeft size={18} />
                            </Link>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início / Financeiro / Contas e Fundos</span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                            <Wallet size={32} className="text-blue-600" />
                            Fundo de Caixa e Bancos
                        </h1>
                        <p className="text-gray-500 font-bold text-sm mt-1">Gerencie suas contas correntes e gavetas de dinheiro.</p>
                    </div>

                    <button
                        onClick={abrirNovaConta}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition flex items-center gap-2 shadow-lg hover:scale-105"
                    >
                        <Plus size={18} /> Nova Conta / Fundo
                    </button>
                </div>
            )}

            {isConfig && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={abrirNovaConta}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition flex items-center gap-2 shadow-lg hover:scale-105"
                    >
                        <Plus size={18} /> Nova Conta / Fundo
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-blue-600" size={40} />
                </div>
            ) : contas.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl">
                    <Building size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-black dark:text-white mb-2">Nenhuma conta cadastrada</h3>
                    <p className="text-gray-400 mb-6 text-sm">Organize suas finanças separando os saldos bancários e o caixa físico.</p>
                    <button
                        onClick={abrirNovaConta}
                        className="bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 px-6 py-2 rounded-xl font-black text-sm hover:bg-blue-100 transition inline-flex items-center gap-2"
                    >
                        <Plus size={16} /> Adicionar a Primeira Conta
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contas.map(conta => (
                        <div key={conta.id} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                                    <Building size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => abrirEdicao(conta)} className="p-2 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => deletarConta(conta.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-lg font-black text-gray-800 dark:text-white mb-1">{conta.name}</h3>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Saldo Disponível</p>
                                <p className={`text-3xl font-black tracking-tighter ${Number(conta.balance) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {Number(conta.balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>

                            <div className="absolute -bottom-6 -right-6 text-gray-50 dark:text-gray-800/50 transform group-hover:scale-110 transition duration-500 pointer-events-none">
                                <Wallet size={120} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criação / Edição */}
            {modalAberto && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative border dark:border-gray-800 animate-in zoom-in-95 duration-200">
                        <button onClick={() => setModalAberto(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition"><X size={20} /></button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 flex items-center justify-center bg-blue-100 text-blue-600 rounded-xl"><Wallet size={20} /></div>
                            <h2 className="text-xl font-black dark:text-white">{form.id ? "Editar Conta" : "Nova Conta"}</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nome do Fundo/Banco</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-4 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-blue-500"
                                    placeholder="Ex: Caixa Físico, Banco Itaú..."
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Saldo Inicial (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-4 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-blue-500"
                                    placeholder="R$ 0,00"
                                    value={form.balance}
                                    onChange={e => setForm({ ...form, balance: formatarMoeda(e.target.value) })}
                                />
                            </div>

                            <button
                                onClick={salvarConta}
                                disabled={salvando}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition shadow-lg mt-4 flex items-center justify-center gap-2"
                            >
                                {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {salvando ? 'Salvando...' : 'Salvar Conta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

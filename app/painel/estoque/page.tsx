"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Package, AlertTriangle, Trash2, Save, X, ArrowUpCircle, ArrowDownCircle, Clock, Calendar as CalIcon, Box, Store, Eye, EyeOff, DollarSign, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarMoeda, desformatarMoeda } from "@/lib/validators";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ModalPortal } from "@/components/ui/ModalPortal";

export default function EstoquePage() {
    const [produtos, setProdutos] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState("");

    // Controle da Ficha
    const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
    const [abaAtiva, setAbaAtiva] = useState<"LOTES" | "HISTORICO" | "CONFIG">("LOTES");
    const [produtoParaExcluir, setProdutoParaExcluir] = useState<string | null>(null);

    // Form de Entrada/Saída e Validade
    const [qtdInput, setQtdInput] = useState("");
    const [validadeInput, setValidadeInput] = useState("");
    const [motivoInput, setMotivoInput] = useState("");
    const [costPriceInput, setCostPriceInput] = useState("");
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
    const [operacao, setOperacao] = useState<"ADD" | "REMOVE">("ADD");

    // Form de Criação/Edição Básica
    const [formBasico, setFormBasico] = useState({ 
        name: "", 
        unit: "UN", 
        minStock: "5", 
        costPrice: "", 
        price: "", 
        description: "", 
        imageUrl: "",
    });

    useEffect(() => {
        carregarEstoque();
        carregarFornecedores();
    }, []);

    async function carregarFornecedores() {
        const res = await fetch('/api/painel/fornecedores');
        if (res.ok) setAllSuppliers(await res.json());
    }

    async function carregarEstoque() {
        try {
            const res = await fetch('/api/painel/estoque');
            const data = await res.json();

            if (Array.isArray(data)) {
                setProdutos(data);
                if (produtoSelecionado) {
                    const atualizado = data.find((p: any) => p.id === produtoSelecionado.id);
                    if (atualizado) setProdutoSelecionado(atualizado);
                }
            } else {
                setProdutos([]);
                if (data.error) {
                    toast.error(data.error);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar estoque:", error);
            setProdutos([]);
        } finally {
            setLoading(false);
        }
    }

    async function carregarLogs(id: string) {
        const res = await fetch(`/api/painel/estoque?productId=${id}&logs=true`);
        if (res.ok) setLogs(await res.json());
    }

    function abrirFicha(produto: any) {
        setProdutoSelecionado(produto);
        setFormBasico({ 
            name: produto.name, 
            unit: produto.unit, 
            minStock: produto.minStock, 
            costPrice: produto.costPrice ? formatarMoeda(produto.costPrice) : "",
            price: produto.price ? formatarMoeda(produto.price) : "",
            description: produto.description || "",
            imageUrl: produto.imageUrl || "",
        });
        setAbaAtiva("LOTES");
        setOperacao("ADD");
        setQtdInput("");
        setValidadeInput("");
        setCostPriceInput("");
        setSelectedSupplierId("");
        carregarLogs(produto.id);
        setModalOpen(true);
    }

    function abrirNovoProduto() {
        setProdutoSelecionado(null);
        setFormBasico({ 
            name: "", 
            unit: "UN", 
            minStock: "5", 
            costPrice: "", 
            price: "", 
            description: "", 
            imageUrl: "",
        });
        setQtdInput("");
        setValidadeInput("");
        setCostPriceInput("");
        setSelectedSupplierId("");
        setModalOpen(true);
    }

    async function salvarMovimentacao() {
        if (!qtdInput) return toast.error("Informe a quantidade");

        try {
            // LÓGICA 1: CRIAR NOVO PRODUTO
            if (!produtoSelecionado) {
                if (!formBasico.name) return toast.error("Nome do produto é obrigatório");

                const totalCost = formBasico.costPrice ? desformatarMoeda(formBasico.costPrice) : 0;
                const unitCost = Number(qtdInput) > 0 ? totalCost / Number(qtdInput) : totalCost;

                const res = await fetch('/api/painel/estoque', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: formBasico.name,
                        unit: formBasico.unit,
                        minStock: formBasico.minStock,
                        costPrice: unitCost,
                        price: desformatarMoeda(formBasico.price),
                        description: formBasico.description,
                        imageUrl: formBasico.imageUrl,
                        quantity: qtdInput,
                        expiryDate: validadeInput,
                        supplierId: selectedSupplierId
                    })
                });
                if (res.ok) {
                    toast.success("Produto cadastrado com sucesso!");
                    setModalOpen(false);
                    carregarEstoque();
                } else {
                    toast.error("Erro ao criar produto.");
                }
                return;
            }

            // LÓGICA 2: MOVIMENTAÇÃO DE LOTE (EXISTENTE)
            const totalCostAdd = costPriceInput ? desformatarMoeda(costPriceInput) : 0;
            const unitCostAdd = Number(qtdInput) > 0 ? totalCostAdd / Number(qtdInput) : totalCostAdd;

            const res = await fetch('/api/painel/estoque', {
                method: 'PUT',
                body: JSON.stringify({
                    id: produtoSelecionado.id,
                    operation: operacao,
                    amountAdjustment: qtdInput,
                    expiryDate: validadeInput,
                    reason: motivoInput,
                    costPrice: operacao === 'ADD' ? unitCostAdd : undefined,
                    supplierId: operacao === 'ADD' ? selectedSupplierId : undefined
                })
            });

            if (res.ok) {
                toast.success(operacao === "ADD" ? "Lote adicionado!" : "Baixa realizada!");
                setQtdInput("");
                setValidadeInput("");
                setMotivoInput("");
                setCostPriceInput("");
                carregarEstoque();
                carregarLogs(produtoSelecionado.id);
            }
        } catch (e) { toast.error("Erro de conexão."); }
    }

    async function atualizarDadosBasicos() {
        const res = await fetch('/api/painel/estoque', {
            method: 'PUT',
            body: JSON.stringify({
                id: produtoSelecionado.id,
                name: formBasico.name,
                minStock: formBasico.minStock,
                costPrice: desformatarMoeda(formBasico.costPrice),
                price: desformatarMoeda(formBasico.price),
                description: formBasico.description,
                imageUrl: formBasico.imageUrl,
            })
        });
        if (res.ok) {
            toast.success("Dados atualizados.");
            carregarEstoque();
        }
    }

    async function confirmarExclusao() {
        if (!produtoParaExcluir) return;
        try {
            const res = await fetch('/api/painel/estoque', { method: 'DELETE', body: JSON.stringify({ id: produtoParaExcluir }) });
            if (res.ok) {
                setModalOpen(false);
                setProdutoSelecionado(null);
                carregarEstoque();
                toast.success("Produto excluído.");
            }
        } catch (e) { toast.error("Erro de conexão."); }
        setProdutoParaExcluir(null);
    }

    const filtrados = produtos.filter(p => p.name.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="p-6 space-y-6 pb-20 font-sans">
            {/* HEADER DA PÁGINA */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white">Estoque Inteligente</h1>
                <button onClick={abrirNovoProduto} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"><Plus size={20} /> Novo Item</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 flex items-center gap-3 shadow-sm">
                <Search className="text-gray-400 ml-3" size={20} />
                <input className="bg-transparent outline-none flex-1 py-3 text-sm dark:text-white" placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>

            {/* LISTA DE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filtrados.map(p => {
                    const isLow = Number(p.quantity) <= Number(p.minStock);
                    const temVencimentoProximo = p.batches?.some((b: any) => b.expiryDate && isBefore(new Date(b.expiryDate), addDays(new Date(), 30)));

                    return (
                        <div key={p.id} onClick={() => abrirFicha(p)} className={`bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 shadow-sm cursor-pointer hover:border-blue-300 transition-all group relative ${isLow ? 'border-red-100 dark:border-red-900/30' : 'border-transparent'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLow ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <Package size={24} />
                                </div>
                                <div className="flex gap-1">
                                    {p.showInVitrine && <span className="bg-violet-100 text-violet-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"><Store size={10} /> Vitrine</span>}
                                    {temVencimentoProximo && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Atenção Validade</span>}
                                </div>
                            </div>
                            <h3 className="font-black text-lg dark:text-white uppercase truncate">{p.name}</h3>
                            <div className="flex items-end gap-1 mt-2">
                                <span className={`text-4xl font-black ${isLow ? 'text-red-600' : 'text-gray-800 dark:text-white'}`}>{Number(p.quantity)}</span>
                                <span className="text-xs font-bold text-gray-400 mb-1.5">{p.unit}</span>
                            </div>
                            {isLow && <p className="text-[10px] font-black text-red-500 flex items-center gap-1 mt-2"><AlertTriangle size={12} /> REPOR ESTOQUE</p>}
                        </div>
                    )
                })}
            </div>

            {/* MODAL GLOBAL */}
            {modalOpen && (
                <ModalPortal><div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]">

                        {/* HEADER DO MODAL */}
                        <div className="p-8 pb-4 border-b dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
                            <div className="flex justify-between items-start">
                                <div>
                                    {produtoSelecionado ? (
                                        <>
                                            <h2 className="text-3xl font-black dark:text-white">{produtoSelecionado.name}</h2>
                                            <div className="flex gap-4 mt-2">
                                                <p className="text-sm font-bold text-gray-500">Total: <span className="text-blue-600 font-black">{Number(produtoSelecionado.quantity)} {produtoSelecionado.unit}</span></p>
                                                <p className="text-sm font-bold text-gray-500">Mínimo: {Number(produtoSelecionado.minStock)}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <h2 className="text-2xl font-black dark:text-white">Cadastrar Novo Produto</h2>
                                    )}
                                </div>
                                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"><X /></button>
                            </div>

                            {/* ABAS (Só aparecem se o produto já existir) */}
                            {produtoSelecionado && (
                                <div className="flex gap-6 mt-6">
                                    <button onClick={() => setAbaAtiva("LOTES")} className={`pb-2 text-xs font-black uppercase tracking-widest border-b-4 transition ${abaAtiva === "LOTES" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"}`}>Lotes & Movimento</button>
                                    <button onClick={() => setAbaAtiva("HISTORICO")} className={`pb-2 text-xs font-black uppercase tracking-widest border-b-4 transition ${abaAtiva === "HISTORICO" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-400"}`}>Histórico</button>
                                    <button onClick={() => setAbaAtiva("CONFIG")} className={`pb-2 text-xs font-black uppercase tracking-widest border-b-4 transition ${abaAtiva === "CONFIG" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-400"}`}>Configurar</button>
                                </div>
                            )}
                        </div>

                        {/* CONTEÚDO DINÂMICO */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">

                            {/* CENÁRIO 1: NOVO PRODUTO (FORMULÁRIO LIMPO) */}
                            {!produtoSelecionado && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nome do Produto</label>
                                        <input autoFocus className="w-full p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none dark:text-white focus:border-blue-500" placeholder="Nome do produto" value={formBasico.name} onChange={e => setFormBasico({ ...formBasico, name: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Quantidade Inicial</label>
                                            <input type="number" className="w-full p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none dark:text-white" placeholder="0" value={qtdInput} onChange={e => setQtdInput(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Unidade</label>
                                            <select className="w-full p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none dark:text-white" value={formBasico.unit} onChange={e => setFormBasico({ ...formBasico, unit: e.target.value })}>
                                                <option value="UN">Unidade (UN)</option><option value="ML">Mililitros (ML)</option><option value="L">Litros (L)</option><option value="KG">Quilos (KG)</option><option value="G">Gramas (G)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Estoque Mínimo (Alerta)</label>
                                            <input type="number" className="w-full p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none dark:text-white" value={formBasico.minStock} onChange={e => setFormBasico({ ...formBasico, minStock: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Preço de Custo Total do Lote (Opcional)</label>
                                            <input type="text" className="w-full p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none dark:text-white" placeholder="R$ 0,00" value={formBasico.costPrice} onChange={e => setFormBasico({ ...formBasico, costPrice: formatarMoeda(e.target.value) })} />
                                            {formBasico.costPrice && Number(desformatarMoeda(formBasico.costPrice)) > 0 && Number(qtdInput) > 0 && (
                                                <p className="text-[10px] text-gray-500 font-bold ml-2 mt-1">Custo Unitário: {(Number(desformatarMoeda(formBasico.costPrice)) / Number(qtdInput)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {formBasico.unit}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Validade (Opcional)</label>
                                            <input type="date" className="w-full p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none dark:text-white" value={validadeInput} onChange={e => setValidadeInput(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Fornecedor (Opcional)</label>
                                            <select className="w-full p-4 rounded-2xl border-2 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none dark:text-white" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}>
                                                <option value="">Nenhum fornecedor</option>
                                                {allSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <button onClick={salvarMovimentacao} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition shadow-lg flex justify-center items-center gap-2 mt-4">
                                        <Save size={20} /> Cadastrar Produto
                                    </button>
                                </div>
                            )}

                            {/* CENÁRIO 2: PRODUTO EXISTENTE (ABAS) */}
                            {produtoSelecionado && abaAtiva === "LOTES" && (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl border dark:border-gray-700">
                                        <div className="flex gap-2 mb-4 bg-white dark:bg-gray-900 p-1 rounded-xl w-fit border dark:border-gray-700">
                                            <button onClick={() => setOperacao("ADD")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition ${operacao === "ADD" ? "bg-green-100 text-green-700" : "text-gray-400"}`}><ArrowUpCircle size={16} /> Adicionar Lote</button>
                                            <button onClick={() => setOperacao("REMOVE")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition ${operacao === "REMOVE" ? "bg-red-100 text-red-700" : "text-gray-400"}`}><ArrowDownCircle size={16} /> Baixa/Correção</button>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block md:hidden">Quantidade</label>
                                                <input type="number" autoFocus className="w-full p-4 rounded-2xl border-2 border-blue-100 dark:border-blue-900 bg-white dark:bg-gray-900 font-black text-lg outline-none focus:border-blue-500" placeholder="Quantidade" value={qtdInput} onChange={e => setQtdInput(e.target.value)} />
                                            </div>
                                            {operacao === "ADD" && (
                                                <>
                                                    <div className="md:w-40 flex flex-col">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block md:hidden">Custo do Lote</label>
                                                        <input type="text" className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none" placeholder="R$ Custo Total" value={costPriceInput} onChange={e => setCostPriceInput(formatarMoeda(e.target.value))} title="Custo total correspondente à quantidade informada" />
                                                        {costPriceInput && Number(desformatarMoeda(costPriceInput)) > 0 && Number(qtdInput) > 0 && (
                                                            <p className="text-[10px] text-gray-500 font-bold ml-1 mt-1">Unidade: {(Number(desformatarMoeda(costPriceInput)) / Number(qtdInput)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {produtoSelecionado.unit}</p>
                                                        )}
                                                    </div>
                                                    <div className="md:w-48">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block md:hidden">Validade do Lote</label>
                                                        <input type="date" className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none" value={validadeInput} onChange={e => setValidadeInput(e.target.value)} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block md:hidden">Fornecedor</label>
                                                        <select className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold outline-none" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}>
                                                            <option value="">Sem Fornecedor</option>
                                                            {allSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {operacao === "REMOVE" && (
                                            <input className="w-full mt-3 p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" placeholder="Motivo (ex: Uso interno, Quebra, Vencido)" value={motivoInput} onChange={e => setMotivoInput(e.target.value)} />
                                        )}

                                        <button onClick={salvarMovimentacao} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition shadow-lg flex justify-center items-center gap-2">
                                            <Save size={18} /> {operacao === "ADD" ? "Confirmar Entrada" : "Confirmar Saída"}
                                        </button>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Box size={14} /> Lotes Disponíveis</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {produtoSelecionado.batches?.map((batch: any) => {
                                                const validade = batch.expiryDate ? new Date(batch.expiryDate) : null;
                                                const vencido = validade && isBefore(validade, new Date());
                                                const proximo = validade && isBefore(validade, addDays(new Date(), 30));

                                                return (
                                                    <div key={batch.id} className={`p-4 rounded-2xl border-2 bg-white dark:bg-gray-900 relative overflow-hidden ${vencido ? 'border-red-200 bg-red-50' : proximo ? 'border-orange-200' : 'border-gray-100 dark:border-gray-700'}`}>
                                                        <div className="relative z-10">
                                                            <p className="text-2xl font-black dark:text-white">{Number(batch.quantity)} <span className="text-xs text-gray-400">{produtoSelecionado.unit}</span></p>
                                                            <div className="flex gap-2 mt-1">
                                                                <p className={`text-[10px] font-bold uppercase flex items-center gap-1 ${vencido ? 'text-red-600' : 'text-gray-500'}`}>
                                                                    <CalIcon size={10} /> {validade ? format(validade, "dd/MM/yyyy", { locale: ptBR }) : "Sem Validade"}
                                                                </p>
                                                                {batch.costPrice && Number(batch.costPrice) > 0 && (
                                                                    <p className="text-[10px] font-bold uppercase flex items-center gap-1 text-green-500">
                                                                        Custo: {Number(batch.costPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{produtoSelecionado.unit}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {(!produtoSelecionado.batches || produtoSelecionado.batches.length === 0) && <p className="text-gray-400 text-sm italic col-span-2">Estoque zerado.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {produtoSelecionado && abaAtiva === "HISTORICO" && (
                                <div className="space-y-3 animate-in fade-in">
                                    {logs.map((log) => (
                                        <div key={log.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${log.type === 'ENTRADA' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {log.type === 'ENTRADA' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm dark:text-white uppercase">{log.reason || log.type}</p>
                                                    <p className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {format(new Date(log.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                                                    {log.costPrice && Number(log.costPrice) > 0 && (
                                                        <p className="text-[10px] text-green-500 font-bold mt-1">Custo Unid: {Number(log.costPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black text-lg ${log.type === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'ENTRADA' ? '+' : ''}{Number(log.quantity)}</p>
                                                <p className="text-[10px] font-bold text-gray-400">Saldo: {Number(log.newStock)}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {logs.length === 0 && <p className="text-center text-gray-400 italic py-10">Nenhum histórico.</p>}
                                </div>
                            )}

                            {produtoSelecionado && abaAtiva === "CONFIG" && (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="space-y-4">
                                        <div><label className="text-xs font-bold text-gray-400 uppercase">Nome</label><input className="w-full p-3 rounded-xl border font-bold dark:bg-gray-800 dark:text-white" value={formBasico.name} onChange={e => setFormBasico({ ...formBasico, name: e.target.value })} /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-xs font-bold text-gray-400 uppercase">Estoque Mínimo (Alerta)</label><input type="number" className="w-full p-3 rounded-xl border font-bold dark:bg-gray-800 dark:text-white" value={formBasico.minStock} onChange={e => setFormBasico({ ...formBasico, minStock: e.target.value })} /></div>
                                            <div><label className="text-xs font-bold text-gray-400 uppercase">Preço de Custo (Unidade)</label><input type="text" className="w-full p-3 rounded-xl border font-bold dark:bg-gray-800 dark:text-white" placeholder="R$ 0,00" value={formBasico.costPrice} onChange={e => setFormBasico({ ...formBasico, costPrice: formatarMoeda(e.target.value) })} /></div>
                                        </div>

                                        <div className="pt-4 border-t dark:border-gray-800">
                                            <h4 className="text-sm font-black dark:text-white flex items-center gap-2 mb-4"><ImageIcon size={18} className="text-blue-500" /> Foto do Produto</h4>
                                            
                                            <div className="flex items-center gap-4">
                                                <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center relative group">
                                                    {formBasico.imageUrl ? (
                                                        <>
                                                            <img src={formBasico.imageUrl} className="w-full h-full object-cover" alt="Produto" />
                                                            <button 
                                                                onClick={() => setFormBasico({ ...formBasico, imageUrl: "" })}
                                                                className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <ImageIcon className="text-gray-300" size={32} />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 mb-2 font-medium">Formatos aceitos: JPG, PNG, WebP. Máximo 10MB.</p>
                                                    <input 
                                                        type="file" 
                                                        id="product-image-upload" 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            
                                                            const toastId = toast.loading("Enviando imagem...");
                                                            try {
                                                                const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
                                                                    method: "POST",
                                                                    body: file
                                                                });
                                                                const data = await res.json();
                                                                if (data.url) {
                                                                    setFormBasico(prev => ({ ...prev, imageUrl: data.url }));
                                                                    toast.success("Imagem enviada!", { id: toastId });
                                                                } else {
                                                                    toast.error("Erro no upload", { id: toastId });
                                                                }
                                                            } catch (err) {
                                                                toast.error("Erro de conexão", { id: toastId });
                                                            }
                                                        }}
                                                    />
                                                    <label 
                                                        htmlFor="product-image-upload"
                                                        className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer transition dark:text-white"
                                                    >
                                                         Escolher Foto
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t dark:border-gray-800">
                                            <h4 className="text-sm font-black dark:text-white flex items-center gap-2 mb-4"><DollarSign size={18} className="text-green-500" /> Preço de Venda</h4>
                                            
                                            <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase">Preço para Venda Manual (R$)</label>
                                                    <div className="relative">
                                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input type="text" className="w-full p-3 pl-10 rounded-xl border font-bold dark:bg-gray-800 dark:text-white" placeholder="R$ 0,00" value={formBasico.price} onChange={e => setFormBasico({ ...formBasico, price: formatarMoeda(e.target.value) })} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <label className="text-xs font-bold text-gray-400 uppercase">Observações Internas</label>
                                                <textarea 
                                                    className="w-full p-3 rounded-xl border font-medium dark:bg-gray-800 dark:text-white resize-none h-20" 
                                                    placeholder="Notas sobre o produto..."
                                                    value={formBasico.description}
                                                    onChange={e => setFormBasico({ ...formBasico, description: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <button onClick={atualizarDadosBasicos} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                                            <Save size={20} /> Salvar Alterações
                                        </button>
                                    </div>

                                    <div className="pt-6 border-t dark:border-gray-800 mt-6">
                                        <h4 className="text-xs font-black text-red-500 uppercase mb-2">Zona de Perigo</h4>
                                        <button onClick={() => setProdutoParaExcluir(produtoSelecionado.id)} className="w-full border-2 border-red-100 text-red-500 hover:bg-red-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                                            <Trash2 size={18} /> Excluir Produto e Histórico
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div></ModalPortal>
            )}
            {/* MODAL DE CONFIRMAÇÃO */}
            <ConfirmationModal
                isOpen={!!produtoParaExcluir}
                onClose={() => setProdutoParaExcluir(null)}
                onConfirm={confirmarExclusao}
                title="Excluir Produto?"
                description="Tem certeza que deseja apagar este produto e todo seu histórico de movimentações? Esta ação não pode ser desfeita."
                variant="danger"
            />
        </div>
    );
}
"use client";

import { useState, useEffect, useMemo } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import {
    TrendingUp, ArrowDownCircle, ArrowUpCircle, Repeat, Trash2, Pencil, CheckCircle2,
    AlertTriangle, Calendar, MessageCircle, Printer, FileText, DollarSign, Receipt,
    Loader2, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FinanceiroPage() {
    const [loading, setLoading] = useState(true);
    const [dadosResumo, setDadosResumo] = useState<any>(null); // Dados do Cabeçalho e Gráfico
    const [dadosDespesas, setDadosDespesas] = useState<any>(null); // Dados da Lista de Despesas

    const [dataResumo, setDataResumo] = useState(new Date()); // Data Selecionada para o Resumo
    const [dataDespesas, setDataDespesas] = useState(new Date()); // Data Selecionada para as Despesas

    const [abaAtiva, setAbaAtiva] = useState("GERAL");

    const [modalDespesa, setModalDespesa] = useState(false);
    const [modalEntrada, setModalEntrada] = useState(false);
    const [modalExcluir, setModalExcluir] = useState(false);
    const [despesaParaExcluir, setDespesaParaExcluir] = useState<any>(null);
    const [salvando, setSalvando] = useState(false);
    const [clientes, setClientes] = useState<any[]>([]);
    const [buscaCliente, setBuscaCliente] = useState("");
    const [mostrarDropdownBusca, setMostrarDropdownBusca] = useState(false);

    // Estado do formulário de despesa
    const [novaDespesa, setNovaDespesa] = useState({
        id: null,
        description: "",
        value: "",
        frequency: "ONCE",
        category: "Outros",
        date: new Date().toISOString().split('T')[0]
    });

    const [novaEntrada, setNovaEntrada] = useState({
        clientId: "",
        description: "",
        value: "",
        method: "PIX",
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => { carregarResumo(dataResumo); }, [dataResumo]);
    useEffect(() => { carregarDespesas(dataDespesas); }, [dataDespesas]);
    useEffect(() => { carregarClientes(); }, []);

    async function carregarClientes() {
        try {
            const res = await fetch("/api/clientes");
            const data = await res.json();
            setClientes(data);
        } catch (e) { console.error("Erro ao carregar clientes", e); }
    }

    // Função para carregar DADOS DO RESUMO (Gráfico, Cards, Totais)
    async function carregarResumo(dataBase = new Date()) {
        try {
            const mes = dataBase.getMonth() + 1;
            const ano = dataBase.getFullYear();
            const res = await fetch(`/api/painel/financeiro?month=${mes}&year=${ano}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setDadosResumo(data);
        } catch (error: any) { toast.error(error.message || "Erro ao carregar resumo."); }
        finally {
            // Only set loading to false if both initial loads are done, or handle separately
            // For simplicity, we'll assume initial load is done after both are called once.
            // A more robust solution would use a counter or Promise.all
            setLoading(false);
        }
    }

    // Função para carregar DADOS DAS DESPESAS (Lista)
    async function carregarDespesas(dataBase = new Date()) {
        try {
            const mes = dataBase.getMonth() + 1;
            const ano = dataBase.getFullYear();
            const res = await fetch(`/api/painel/financeiro?month=${mes}&year=${ano}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setDadosDespesas(data);
        } catch (error: any) { toast.error(error.message || "Erro ao carregar despesas."); }
        finally {
            setLoading(false);
        }
    }

    // --- AGRUPAMENTO DE DESPESAS (VISUAL) ---
    const despesasAgrupadas = useMemo(() => {
        if (!dadosDespesas?.allExpenses) return [];
        const grupos: any = {};
        dadosDespesas.allExpenses.forEach((exp: any) => {
            // Chave única baseada nas propriedades visuais
            const chave = `${exp.description?.trim().toLowerCase()}-${exp.value}-${exp.category}-${exp.frequency}`;
            if (!grupos[chave]) {
                grupos[chave] = { ...exp, quantidade: 0, ids: [] };
            }
            grupos[chave].quantidade += 1;
            grupos[chave].ids.push(exp.id);
        });
        return Object.values(grupos);
    }, [dadosDespesas]);

    function prepararEdicao(exp: any) {
        setNovaDespesa({
            id: exp.id,
            description: exp.description,
            value: exp.value.toString(),
            category: exp.category,
            frequency: exp.frequency || "ONCE",
            date: (exp.date && !isNaN(new Date(exp.date).getTime()))
                ? new Date(exp.date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
        });
        setModalDespesa(true);
    }

    async function salvarDespesa() {
        if (!novaDespesa.description || !novaDespesa.value) return toast.error("Preencha a descrição e o valor.");
        setSalvando(true);
        const metodo = novaDespesa.id ? 'PUT' : 'POST';
        try {
            const res = await fetch('/api/painel/financeiro/despesas', {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaDespesa)
            });
            if (res.ok) {
                toast.success(novaDespesa.id ? "Alteração salva!" : "Gasto registrado!");
                fecharModalDespesa();
                carregarResumo(dataResumo); // Atualiza os totais e gráfico
                carregarDespesas(dataDespesas); // Atualiza a lista
            } else {
                toast.error("Erro ao processar operação.");
            }
        } catch (error) { toast.error("Erro de conexão."); }
        finally { setSalvando(false); }
    }

    async function salvarEntrada() {
        if (!novaEntrada.value) return toast.error("Preencha pelo menos o valor.");
        setSalvando(true);
        try {
            const res = await fetch('/api/painel/financeiro/entradas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaEntrada)
            });
            if (res.ok) {
                toast.success("Entrada registrada com sucesso!");
                fecharModalEntrada();
                carregarResumo(dataResumo);
            } else {
                toast.error("Erro ao salvar entrada.");
            }
        } catch (error) { toast.error("Erro de conexão."); }
        finally { setSalvando(false); }
    }

    function abrirModalExclusao(exp: any) {
        setDespesaParaExcluir(exp);
        setModalExcluir(true);
    }

    async function confirmarExclusao(deleteSeries: boolean) {
        if (!despesaParaExcluir) return;
        setSalvando(true);
        try {
            const res = await fetch('/api/painel/financeiro/despesas', {
                method: 'DELETE',
                body: JSON.stringify({ id: despesaParaExcluir.id, deleteSeries })
            });

            if (res.ok) {
                toast.success(deleteSeries ? "Série de despesas removida." : "Despesa removida.");
                carregarResumo(dataResumo);
                carregarDespesas(dataDespesas);
                setModalExcluir(false);
                setDespesaParaExcluir(null);
            } else {
                toast.error("Erro ao excluir.");
            }
        } catch (error) { toast.error("Erro ao excluir."); }
        finally { setSalvando(false); }
    }


    async function baixarBoleto(id: string) {
        if (!confirm("Confirmar recebimento deste valor?")) return;
        try {
            const res = await fetch('/api/financeiro/faturas/baixar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                toast.success("Recebimento confirmado!");
                carregarResumo(dataResumo); // Atualiza os cards de recebimento e totais
            } else {
                toast.error("Erro ao baixar.");
            }
        } catch (e) { toast.error("Erro de conexão."); }
    }

    function handleCobrar(fatura: any, tipo: 'ATRASADO' | 'LEMBRETE') {
        const telefone = fatura.client.phone?.replace(/\D/g, "");
        if (!telefone) return toast.error("Cliente sem telefone cadastrado.");

        const valor = Number(fatura.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataVenc = format(new Date(fatura.dueDate), 'dd/MM/yyyy');
        let mensagem = "";

        if (tipo === 'ATRASADO') {
            mensagem = `Olá *${fatura.client.name}*, tudo bem? \n\nConsta em nosso sistema um valor em aberto de *${valor}* referente a *${fatura.description}*, com vencimento em *${dataVenc}*. \n\nPoderia verificar? Caso já tenha pago, desconsidere.`;
        } else {
            mensagem = `Olá *${fatura.client.name}*! \n\nLembrete do pagamento de *${valor}* referente a *${fatura.description}* para o dia *${dataVenc}*. \n\nQualquer dúvida estamos à disposição!`;
        }

        const link = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
        window.open(link, '_blank');
    }

    function fecharModalDespesa() {
        setModalDespesa(false);
        setNovaDespesa({ id: null, description: "", value: "", category: "Outros", frequency: "ONCE", date: new Date().toISOString().split('T')[0] });
    }

    function fecharModalEntrada() {
        setModalEntrada(false);
        setNovaEntrada({ clientId: "", description: "", value: "", method: "PIX", date: new Date().toISOString().split('T')[0] });
        setBuscaCliente("");
        setMostrarDropdownBusca(false);
    }

    const clientesFiltrados = useMemo(() => {
        if (!buscaCliente) return [];
        return clientes.filter(c =>
            c.name.toLowerCase().includes(buscaCliente.toLowerCase()) ||
            c.phone?.includes(buscaCliente)
        ).slice(0, 10); // Limita a 10 resultados para performance
    }, [clientes, buscaCliente]);

    // --- FUNÇÃO DE IMPRESSÃO ---
    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Sincronizando caixa...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 p-2 font-sans">

            {/* CABEÇALHO (Oculto na Impressão) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-800 dark:text-white">Financeiro Profissional</h1>
                    <p className="text-gray-500 font-bold text-sm">Visão geral de caixa e pendências.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-50 transition shadow-sm active:scale-95 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                        <Printer size={20} /> Relatório
                    </button>
                    <button
                        onClick={() => setModalEntrada(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <ArrowUpCircle size={20} /> Lançar Entrada
                    </button>
                    <button
                        onClick={() => setModalDespesa(true)}
                        className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-red-600 transition shadow-lg shadow-red-500/20 active:scale-95"
                    >
                        <ArrowDownCircle size={20} /> Lançar Despesa
                    </button>
                </div>
            </div>



            {/* --- SELETOR DE MÊS (RESUMO FINANCEIRO) --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 mb-8 mt-4 print:hidden">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border dark:border-gray-700 shadow-sm">
                    <button onClick={() => setDataResumo(prev => subMonths(prev, 1))} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition text-gray-500 hover:text-blue-600"><ChevronLeft size={20} /></button>
                    <span className="font-black text-sm uppercase w-40 text-center text-gray-700 dark:text-white select-none">{format(dataResumo, "MMMM 'de' yyyy", { locale: ptBR })}</span>
                    <button onClick={() => setDataResumo(prev => addMonths(prev, 1))} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition text-gray-500 hover:text-blue-600"><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* --- CONTEÚDO PRINCIPAL (Oculto na Impressão) --- */}
            <div className="print:hidden space-y-8">
                {/* CARDS RESUMO */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white">R$ {dadosResumo?.resumo?.bruto?.toLocaleString() || "0"}</h2>
                        <div className="flex items-center gap-1 text-green-500 mt-2"><ArrowUpCircle size={12} /><span className="text-[10px] font-black">+{dadosResumo?.resumo?.crescimento || "0"}% vs mês anterior</span></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-red-50 dark:border-red-900/20 shadow-sm">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Gastos (Saídas)</p>
                        <h2 className="text-2xl font-black text-red-600">R$ {dadosResumo?.resumo?.despesas?.toLocaleString() || "0"}</h2>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-orange-50 dark:border-orange-900/20 shadow-sm">
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">A Receber (Boletos)</p>
                        <h2 className="text-2xl font-black text-orange-600">R$ {dadosResumo?.boletosAbertos?.reduce((acc: any, b: any) => acc + Number(b.value), 0).toLocaleString() || "0"}</h2>
                    </div>
                    <div className="bg-blue-600 p-6 rounded-[2rem] shadow-xl shadow-blue-500/30 transform hover:scale-105 transition-transform">
                        <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Lucro Líquido (Real)</p>
                        <h2 className="text-3xl font-black text-white font-mono tracking-tighter">R$ {dadosResumo?.resumo?.liquido?.toLocaleString() || "0"}</h2>
                    </div>
                </div>

                {/* GRÁFICO */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700 mx-2">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-500" /> Fluxo de Caixa (Últimos 6 meses)
                        </h3>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosResumo?.fluxoCaixa || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#9ca3af' }} />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar name="Entradas" dataKey="receita" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={40} />
                                <Bar name="Saídas" dataKey="despesa" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SEÇÃO: CONTAS A RECEBER */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">

                    {/* LISTA DE VENCIDOS */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-xs uppercase tracking-widest text-red-500 flex items-center gap-2"><AlertTriangle size={18} /> Vencidos / Atrasados</h3>
                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black">{dadosResumo?.boletosVencidos?.length || 0}</span>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {dadosResumo?.boletosVencidos?.map((fat: any) => (
                                <div key={fat.id} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-sm text-red-700 dark:text-red-300">{fat.client.name}</p>
                                        <p className="text-[10px] font-black text-red-400 uppercase">Venceu: {format(new Date(fat.dueDate), 'dd/MM/yyyy')}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <p className="font-black text-red-600">R$ {Number(fat.value).toLocaleString()}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCobrar(fat, 'ATRASADO')} className="text-[10px] font-bold bg-white text-blue-600 px-3 py-1.5 rounded shadow-sm hover:bg-blue-50 transition flex items-center gap-1">
                                                <MessageCircle size={12} /> Cobrar
                                            </button>
                                            <button onClick={() => baixarBoleto(fat.id)} className="text-[10px] font-bold bg-white text-green-600 px-3 py-1.5 rounded shadow-sm hover:bg-green-50 transition flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Baixar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!dadosResumo?.boletosVencidos || dadosResumo?.boletosVencidos.length === 0) && <p className="text-center text-gray-400 text-xs italic py-10">Tudo em dia!</p>}
                        </div>
                    </div>

                    {/* LISTA DE A VENCER */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><Calendar size={18} className="text-blue-500" /> Próximos Recebimentos</h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {dadosResumo?.boletosAbertos?.map((fat: any) => (
                                <div key={fat.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border dark:border-gray-800 flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-sm dark:text-white">{fat.client.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Vence: {format(new Date(fat.dueDate), 'dd/MM/yyyy')}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <p className="font-black dark:text-white">R$ {Number(fat.value).toLocaleString()}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCobrar(fat, 'LEMBRETE')} className="text-[10px] font-bold text-gray-400 hover:text-blue-500 transition flex items-center gap-1">
                                                <MessageCircle size={12} /> Lembrar
                                            </button>
                                            <button onClick={() => baixarBoleto(fat.id)} className="text-[10px] font-bold text-green-600 hover:text-green-700 transition flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Receber
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!dadosResumo?.boletosAbertos || dadosResumo?.boletosAbertos.length === 0) && <p className="text-center text-gray-400 text-xs italic py-10">Nenhum lançamento futuro.</p>}
                        </div>
                    </div>
                </div>

                {/* HISTÓRICO DE DESPESAS */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700 mx-2">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <Receipt size={18} className="text-red-500" /> Histórico de Despesas
                        </h3>
                        {/* --- SELETOR DE MÊS --- */}
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-2xl border dark:border-gray-700 shadow-sm">
                            <button onClick={() => setDataDespesas(prev => subMonths(prev, 1))} className="p-3 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition text-gray-500 hover:text-blue-600"><ChevronLeft size={16} /></button>
                            <span className="font-black text-xs uppercase w-32 text-center text-gray-700 dark:text-white select-none">{format(dataDespesas, "MMM 'de' yyyy", { locale: ptBR })}</span>
                            <button onClick={() => setDataDespesas(prev => addMonths(prev, 1))} className="p-3 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition text-gray-500 hover:text-blue-600"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {despesasAgrupadas.map((exp: any) => (
                            <div key={exp.id} className="flex justify-between items-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-l-8 border-red-500 shadow-sm group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-sm uppercase dark:text-white">{exp.description}</p>
                                        {exp.quantidade > 1 && (
                                            <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                {exp.quantidade}x
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-lg uppercase">
                                            {exp.frequency === 'MONTHLY' ? 'Mensal' : exp.frequency === 'WEEKLY' ? 'Semanal' : exp.frequency === 'YEARLY' ? 'Anual' : 'Único'}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">{exp.category}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-black text-red-600 text-lg">R$ {Number(exp.value).toLocaleString()}</p>
                                        {exp.quantidade > 1 && (
                                            <p className="text-[9px] font-bold text-gray-400">Total: R$ {(Number(exp.value) * exp.quantidade).toLocaleString()}</p>
                                        )}
                                    </div>
                                    <button onClick={() => prepararEdicao(exp)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-blue-500 transition"><Pencil size={18} /></button>
                                    <button onClick={() => abrirModalExclusao(exp)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-red-500 transition"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HISTÓRICO DE ENTRADAS (REVISÃO DE LANÇAMENTOS) */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700 mx-2">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <ArrowUpCircle size={18} className="text-blue-500" /> Histórico de Entradas
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dadosResumo?.allInvoices?.map((inv: any) => (
                            <div key={inv.id} className="flex justify-between items-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-l-8 border-blue-500 shadow-sm group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-sm uppercase dark:text-white line-clamp-1">{inv.description}</p>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg uppercase">
                                            {inv.method || 'PIX'}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                                            {inv.client?.name || 'Cliente Avulso'}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-300 uppercase">
                                            {format(new Date(inv.paidAt || inv.dueDate), 'dd/MM')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-black text-blue-600 text-lg">R$ {Number(inv.value).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!dadosResumo?.allInvoices || dadosResumo?.allInvoices.length === 0) && (
                            <div className="col-span-full py-10 text-center text-gray-400 italic text-sm">Nenhuma entrada registrada neste período.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- LAYOUT DE IMPRESSÃO (MODO PAISAGEM COMPLETO) --- */}
            <div className="hidden print:flex flex-col bg-white p-10 w-full min-h-screen text-black">
                <style jsx global>{`
                    @media print {
                        @page { size: landscape; margin: 10mm; }
                        body { padding: 0 !important; margin: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        aside, header, .print-hidden { display: none !important; }
                        main { padding: 0 !important; margin: 0 !important; width: 100% !important; height: auto !important; overflow: visible !important; }
                        .print-only { display: block !important; }
                        .page-break-before { page-break-before: always; margin-top: 20mm; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                    }
                `}</style>

                {/* CABEÇALHO */}
                <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-black text-white flex items-center justify-center font-bold text-2xl rounded-lg">N</div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">NOHUD</h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Relatório Financeiro Detalhado</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-gray-400">Emissão em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
                        <p className="text-lg font-mono font-bold uppercase">{format(dataResumo, "MMMM 'de' yyyy", { locale: ptBR })}</p>
                    </div>
                </div>

                {/* RESUMO EM LINHA */}
                <div className="flex gap-4 mb-8">
                    <div className="flex-1 border-2 border-gray-100 bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Receita Total (Mês)</p>
                        <p className="text-3xl font-black text-blue-600">R$ {dadosResumo?.resumo?.bruto?.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 border-2 border-gray-100 bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Despesas (Mês)</p>
                        <p className="text-3xl font-black text-red-600">R$ {dadosResumo?.resumo?.despesas?.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 border-2 border-black bg-black text-white p-3 rounded-xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Lucro Líquido</p>
                        <p className="text-3xl font-black">R$ {dadosResumo?.resumo?.liquido?.toLocaleString()}</p>
                    </div>
                </div>

                {/* SEÇÃO: DETALHAMENTO DE ENTRADAS */}
                <div className="mb-8">
                    <h3 className="font-bold text-sm uppercase mb-3 flex items-center gap-2 border-b-2 border-blue-500 pb-1 text-blue-700">
                        <ArrowUpCircle size={16} /> Detalhamento de Entradas (Receitas)
                    </h3>
                    <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-blue-50 font-black uppercase">
                            <tr>
                                <th className="p-2 border-b">Data</th>
                                <th className="p-2 border-b">Descrição</th>
                                <th className="p-2 border-b">Cliente</th>
                                <th className="p-2 border-b">Método</th>
                                <th className="p-2 border-b text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dadosResumo?.allInvoices?.map((inv: any, i: number) => (
                                <tr key={i} className="border-b border-gray-100">
                                    <td className="p-2 font-mono">{format(new Date(inv.paidAt || inv.dueDate), 'dd/MM/yyyy')}</td>
                                    <td className="p-2 font-bold uppercase">{inv.description}</td>
                                    <td className="p-2 uppercase">{inv.client?.name || 'Cliente Avulso'}</td>
                                    <td className="p-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black">{inv.method || 'PIX'}</span></td>
                                    <td className="p-2 text-right font-bold text-blue-600">R$ {Number(inv.value).toLocaleString()}</td>
                                </tr>
                            ))}
                            {(!dadosResumo?.allInvoices || dadosResumo?.allInvoices.length === 0) && (
                                <tr><td colSpan={5} className="p-4 text-center italic text-gray-400">Nenhuma entrada registrada.</td></tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-black">
                            <tr>
                                <td colSpan={4} className="p-2 text-right uppercase">Subtotal Entradas:</td>
                                <td className="p-2 text-right text-blue-700">R$ {dadosResumo?.resumo?.bruto?.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* SEÇÃO: DETALHAMENTO DE SAÍDAS */}
                <div className="mb-8">
                    <h3 className="font-bold text-sm uppercase mb-3 flex items-center gap-2 border-b-2 border-red-500 pb-1 text-red-700">
                        <ArrowDownCircle size={16} /> Detalhamento de Saídas (Despesas)
                    </h3>
                    <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-red-50 font-black uppercase">
                            <tr>
                                <th className="p-2 border-b">Data</th>
                                <th className="p-2 border-b">Descrição</th>
                                <th className="p-2 border-b">Categoria</th>
                                <th className="p-2 border-b">Frequência</th>
                                <th className="p-2 border-b text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dadosResumo?.allExpenses?.map((exp: any, i: number) => (
                                <tr key={i} className="border-b border-gray-100">
                                    <td className="p-2 font-mono">{format(new Date(exp.date), 'dd/MM/yyyy')}</td>
                                    <td className="p-2 font-bold uppercase">{exp.description}</td>
                                    <td className="p-2 uppercase text-gray-500">{exp.category}</td>
                                    <td className="p-2 uppercase text-gray-400">{exp.frequency === 'MONTHLY' ? 'Mensal' : exp.frequency === 'WEEKLY' ? 'Semanal' : exp.frequency === 'YEARLY' ? 'Anual' : 'Único'}</td>
                                    <td className="p-2 text-right font-bold text-red-600">R$ {Number(exp.value).toLocaleString()}</td>
                                </tr>
                            ))}
                            {(!dadosResumo?.allExpenses || dadosResumo?.allExpenses.length === 0) && (
                                <tr><td colSpan={5} className="p-4 text-center italic text-gray-400">Nenhuma despesa registrada.</td></tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-black">
                            <tr>
                                <td colSpan={4} className="p-2 text-right uppercase">Subtotal Saídas:</td>
                                <td className="p-2 text-right text-red-700">R$ {dadosResumo?.resumo?.despesas?.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* SEÇÃO: PENDÊNCIAS E ATRASADOS */}
                <div className="mb-8 page-break-before">
                    <h3 className="font-bold text-sm uppercase mb-3 flex items-center gap-2 border-b-2 border-orange-500 pb-1 text-orange-700">
                        <AlertTriangle size={16} /> Pendências e Inadimplência (Atrasados)
                    </h3>
                    <p className="text-[9px] text-gray-500 mb-2 uppercase font-bold italic">* Valores que deveriam ter entrado, mas permanecem em aberto.</p>
                    <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-orange-50 font-black uppercase">
                            <tr>
                                <th className="p-2 border-b">Vencimento</th>
                                <th className="p-2 border-b">Cliente</th>
                                <th className="p-2 border-b">Descrição</th>
                                <th className="p-2 border-b text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dadosResumo?.boletosVencidos?.map((fat: any, i: number) => (
                                <tr key={i} className="border-b border-orange-100 bg-orange-50/30">
                                    <td className="p-2 font-mono text-red-600 font-bold">{format(new Date(fat.dueDate), 'dd/MM/yyyy')}</td>
                                    <td className="p-2 font-bold uppercase">{fat.client.name}</td>
                                    <td className="p-2 uppercase text-gray-500">{fat.description || 'Cobrança Avulsa'}</td>
                                    <td className="p-2 text-right font-black text-orange-700">R$ {Number(fat.value).toLocaleString()}</td>
                                </tr>
                            ))}
                            {(!dadosResumo?.boletosVencidos || dadosResumo?.boletosVencidos.length === 0) && (
                                <tr><td colSpan={4} className="p-4 text-center italic text-gray-400">Excelente! Nenhuma fatura atrasada no momento.</td></tr>
                            )}
                        </tbody>
                        <tfoot className="bg-orange-100 font-black">
                            <tr>
                                <td colSpan={3} className="p-2 text-right uppercase font-black">Total Inadimplência:</td>
                                <td className="p-2 text-right text-orange-800">R$ {dadosResumo?.boletosVencidos?.reduce((acc: any, b: any) => acc + Number(b.value), 0).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* TABELA DE FLUXO (6 MESES) - RESUMO FINAL */}
                <div className="flex-1 mt-10">
                    <h3 className="font-bold text-sm uppercase mb-3 flex items-center gap-2 border-b pb-1">
                        <FileText size={16} /> Fluxo de Caixa Comparativo (Últimos 6 Meses)
                    </h3>
                    <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-gray-100 font-black uppercase">
                            <tr>
                                <th className="p-2 border-b border-gray-300">Mês de Referência</th>
                                <th className="p-2 border-b border-gray-300 text-right text-green-700">Entradas (+)</th>
                                <th className="p-2 border-b border-gray-300 text-right text-red-600">Saídas (-)</th>
                                <th className="p-2 border-b border-gray-300 text-right">Resultado (=)</th>
                                <th className="p-2 border-b border-gray-300 text-right text-gray-400">% Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dadosResumo?.fluxoCaixa?.map((item: any, i: number) => {
                                const saldo = item.receita - item.despesa;
                                const margem = item.receita > 0 ? ((saldo / item.receita) * 100).toFixed(1) : "0.0";
                                return (
                                    <tr key={i} className="border-b border-gray-100">
                                        <td className="p-2 font-bold uppercase">{item.mes}</td>
                                        <td className="p-2 text-right font-mono font-medium">R$ {item.receita.toLocaleString()}</td>
                                        <td className="p-2 text-right font-mono font-medium">R$ {item.despesa.toLocaleString()}</td>
                                        <td className={`p-2 text-right font-mono font-black ${saldo >= 0 ? 'text-black' : 'text-red-600'}`}>
                                            R$ {saldo.toLocaleString()}
                                        </td>
                                        <td className="p-2 text-right font-bold text-gray-400">{margem}%</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 font-black text-[11px] border-t-2 border-black">
                            <tr>
                                <td className="p-2 uppercase">Performance Acumulada (Período)</td>
                                <td className="p-2 text-right text-green-700">R$ {dadosResumo?.fluxoCaixa?.reduce((acc: any, i: any) => acc + i.receita, 0).toLocaleString()}</td>
                                <td className="p-2 text-right text-red-600">R$ {dadosResumo?.fluxoCaixa?.reduce((acc: any, i: any) => acc + i.despesa, 0).toLocaleString()}</td>
                                <td className="p-2 text-right bg-yellow-50">R$ {(dadosResumo?.fluxoCaixa?.reduce((acc: any, i: any) => acc + i.receita, 0) - dadosResumo?.fluxoCaixa?.reduce((acc: any, i: any) => acc + i.despesa, 0)).toLocaleString()}</td>
                                <td className="p-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center mt-auto pt-4 border-t">
                    Sistema de Gestão NOHUD • Documento Confidencial
                </div>
            </div>

            {/* MODAL LANÇAR ENTRADA (NOVO) */}
            {modalEntrada && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4 print:hidden">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800">
                        <button onClick={fecharModalEntrada} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24} /></button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><ArrowUpCircle size={24} /></div>
                            <h2 className="text-2xl font-black dark:text-white tracking-tighter">Lançar Entrada</h2>
                        </div>
                        <div className="space-y-5">
                            <div className="relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block tracking-wider">Buscar Cliente</label>
                                <div className="relative">
                                    <input
                                        className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white transition-all pr-12"
                                        placeholder="Nome ou telefone..."
                                        value={novaEntrada.clientId ? (clientes.find(c => c.id === novaEntrada.clientId)?.name || buscaCliente) : buscaCliente}
                                        onChange={e => {
                                            setBuscaCliente(e.target.value);
                                            setNovaEntrada({ ...novaEntrada, clientId: "" });
                                            setMostrarDropdownBusca(true);
                                        }}
                                        onFocus={() => setMostrarDropdownBusca(true)}
                                        onBlur={() => setTimeout(() => setMostrarDropdownBusca(false), 200)}
                                    />
                                    {novaEntrada.clientId && (
                                        <button
                                            onClick={() => { setNovaEntrada({ ...novaEntrada, clientId: "" }); setBuscaCliente(""); }}
                                            className="absolute right-4 top-4 text-gray-400 hover:text-red-500"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>

                                {mostrarDropdownBusca && buscaCliente && !novaEntrada.clientId && (
                                    <div className="absolute z-[110] left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        {clientesFiltrados.length > 0 ? (
                                            clientesFiltrados.map((c: any) => (
                                                <button
                                                    key={c.id}
                                                    className="w-full p-4 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-between group transition-colors border-b last:border-0 dark:border-gray-700"
                                                    onClick={() => {
                                                        setNovaEntrada({ ...novaEntrada, clientId: c.id });
                                                        setBuscaCliente(c.name);
                                                        setMostrarDropdownBusca(false);
                                                    }}
                                                >
                                                    <div>
                                                        <p className="font-black text-sm dark:text-white uppercase">{c.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400">{c.phone || "Sem telefone"}</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-xs text-gray-400 italic">Nenhum cliente encontrado.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block tracking-wider">Descrição / Motivo</label>
                                <input
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white transition-all"
                                    placeholder="Ex: Venda de Produto"
                                    value={novaEntrada.description}
                                    onChange={e => setNovaEntrada({ ...novaEntrada, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Valor (R$)</label>
                                    <input
                                        type="number"
                                        className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white transition-all"
                                        placeholder="0.00"
                                        value={novaEntrada.value}
                                        onChange={e => setNovaEntrada({ ...novaEntrada, value: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Data</label>
                                    <input
                                        type="date"
                                        className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white transition-all"
                                        value={novaEntrada.date}
                                        onChange={e => setNovaEntrada({ ...novaEntrada, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Forma de Pagamento</label>
                                <select
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white transition-all"
                                    value={novaEntrada.method}
                                    onChange={e => setNovaEntrada({ ...novaEntrada, method: e.target.value })}
                                >
                                    <option value="PIX">PIX</option>
                                    <option value="DINHEIRO">Dinheiro</option>
                                    <option value="CARTAO">Cartão</option>
                                    <option value="TRANSFERENCIA">Transferência</option>
                                    <option value="OUTRO">Outros</option>
                                </select>
                            </div>

                            <button onClick={salvarEntrada} disabled={salvando} className="w-full mt-4 bg-blue-600 text-white p-5 rounded-[1.8rem] font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                                {salvando ? <Loader2 className="animate-spin" /> : <DollarSign size={20} />}
                                {salvando ? 'Salvando...' : 'Confirmar Recebimento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL LANÇAR/EDITAR DESPESA (MANTIDO) */}
            {modalDespesa && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4 print:hidden">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800">
                        <button onClick={fecharModalDespesa} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24} /></button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-red-100 text-red-600 rounded-2xl"><ArrowDownCircle size={24} /></div>
                            <h2 className="text-2xl font-black dark:text-white tracking-tighter">
                                {novaDespesa.id ? "Editar Registro" : "Lançar Despesa"}
                            </h2>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block tracking-wider">Descrição</label>
                                <input
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-500 font-bold dark:text-white transition-all"
                                    placeholder="Ex: Aluguel da Sala"
                                    value={novaDespesa.description}
                                    onChange={e => setNovaDespesa({ ...novaDespesa, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Valor (R$)</label>
                                    <input
                                        type="number"
                                        className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-500 font-bold dark:text-white transition-all"
                                        placeholder="0.00"
                                        value={novaDespesa.value}
                                        onChange={e => setNovaDespesa({ ...novaDespesa, value: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Data</label>
                                    <input
                                        type="date"
                                        className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-500 font-bold dark:text-white transition-all"
                                        value={novaDespesa.date}
                                        onChange={e => setNovaDespesa({ ...novaDespesa, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block flex items-center gap-1 font-bold"><Repeat size={10} /> Repetição (Recorrência)</label>
                                <select
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-500 font-bold dark:text-white"
                                    value={novaDespesa.frequency}
                                    onChange={e => setNovaDespesa({ ...novaDespesa, frequency: e.target.value })}
                                >
                                    <option value="ONCE">Somente uma vez</option>
                                    <option value="WEEKLY">Toda semana</option>
                                    <option value="MONTHLY">Todo mês (Recorrente)</option>
                                    <option value="YEARLY">Todo ano</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Categoria</label>
                                <select
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-500 font-bold dark:text-white transition-all"
                                    value={novaDespesa.category}
                                    onChange={e => setNovaDespesa({ ...novaDespesa, category: e.target.value })}
                                >
                                    <option value="ALUGUEL">Aluguel</option>
                                    <option value="LUZ/AGUA">Luz e Água</option>
                                    <option value="PRODUTOS">Produtos/Estoque</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="SALAO">Limpeza e Manutenção</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>

                            <button onClick={salvarDespesa} disabled={salvando} className="w-full mt-4 bg-red-500 text-white p-5 rounded-[1.8rem] font-black text-lg shadow-xl shadow-red-500/20 hover:bg-red-600 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                                {salvando ? <Loader2 className="animate-spin" /> : novaDespesa.id ? "Salvar Alterações" : "Confirmar Gasto"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL CONFIRMAR EXCLUSÃO --- */}
            {
                modalExcluir && despesaParaExcluir && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in duration-200">
                            <button onClick={() => setModalExcluir(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20} /></button>

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center mb-3">
                                    <Trash2 size={24} />
                                </div>
                                <h3 className="text-xl font-black text-gray-800 dark:text-white">Excluir Despesa</h3>
                                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                                    O que você deseja fazer com <strong>"{despesaParaExcluir.description}"</strong>?
                                </p>
                            </div>

                            <div className="space-y-3">
                                {despesaParaExcluir.quantidade > 1 || despesaParaExcluir.frequency !== 'ONCE' ? (
                                    <>
                                        <button
                                            onClick={() => confirmarExclusao(true)}
                                            disabled={salvando}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                                        >
                                            {salvando ? <Loader2 className="animate-spin" /> : <Repeat size={18} />}
                                            {despesaParaExcluir.quantidade > 1
                                                ? `Excluir Toda a Série (${despesaParaExcluir.quantidade}x)`
                                                : "Excluir Toda a Série (Recorrente)"}
                                        </button>
                                        <button
                                            onClick={() => confirmarExclusao(false)}
                                            disabled={salvando}
                                            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                                        >
                                            {salvando ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                                            Excluir Apenas Esta
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => confirmarExclusao(false)}
                                        disabled={salvando}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                                    >
                                        {salvando ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                                        Confirmar Exclusão
                                    </button>
                                )}

                                <button
                                    onClick={() => setModalExcluir(false)}
                                    disabled={salvando}
                                    className="w-full text-gray-400 hover:text-gray-600 font-bold py-2 text-sm transition"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
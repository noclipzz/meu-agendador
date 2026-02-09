"use client";

import { useState, useEffect } from "react";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Legend 
} from "recharts";
import { 
    TrendingUp, ArrowDownCircle, ArrowUpCircle, Repeat, Trash2, Pencil, CheckCircle2, 
    AlertTriangle, Calendar, MessageCircle, Printer, FileText, DollarSign, Receipt,
    Loader2 // <--- ADICIONADO AQUI
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FinanceiroPage() {
    const [dados, setDados] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [modalDespesa, setModalDespesa] = useState(false);
    const [salvando, setSalvando] = useState(false);

    // Estado do formulário de despesa
    const [novaDespesa, setNovaDespesa] = useState({
        id: "", 
        description: "",
        value: "",
        category: "OUTROS",
        frequency: "ONCE",
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => { carregarDados(); }, []);

    async function carregarDados() {
        try {
            const res = await fetch('/api/painel/financeiro');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setDados(data);
        } catch (error: any) {
            toast.error(error.message || "Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    }

    function prepararEdicao(exp: any) {
        setNovaDespesa({
            id: exp.id,
            description: exp.description,
            value: exp.value.toString(),
            category: exp.category,
            frequency: exp.frequency || "ONCE",
            date: new Date(exp.date).toISOString().split('T')[0]
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
                fecharModal();
                carregarDados(); 
            } else {
                toast.error("Erro ao processar operação.");
            }
        } catch (error) { toast.error("Erro de conexão."); } 
        finally { setSalvando(false); }
    }

    async function excluirDespesa(id: string) {
        if(!confirm("Deseja remover este gasto?")) return;
        try {
            const res = await fetch('/api/painel/financeiro/despesas', { method: 'DELETE', body: JSON.stringify({ id }) });
            if (res.ok) { toast.success("Despesa removida."); carregarDados(); }
        } catch (error) { toast.error("Erro ao excluir."); }
    }

    async function baixarBoleto(id: string) {
        if(!confirm("Confirmar recebimento deste valor?")) return;
        try {
            const res = await fetch('/api/financeiro/faturas/baixar', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id })
            });
            if(res.ok) {
                toast.success("Recebimento confirmado!");
                carregarDados();
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

    function fecharModal() {
        setModalDespesa(false);
        setNovaDespesa({ id: "", description: "", value: "", category: "OUTROS", frequency: "ONCE", date: new Date().toISOString().split('T')[0] });
    }

    // --- FUNÇÃO DE IMPRESSÃO ---
    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40}/>
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Sincronizando caixa...</p>
        </div>
    );

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
                        <Printer size={20}/> Relatório
                    </button>
                    <button 
                        onClick={() => setModalDespesa(true)}
                        className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-red-600 transition shadow-lg shadow-red-500/20 active:scale-95"
                    >
                        <ArrowDownCircle size={20}/> Lançar Despesa
                    </button>
                </div>
            </div>

            {/* --- CONTEÚDO PRINCIPAL (Oculto na Impressão) --- */}
            <div className="print:hidden space-y-8">
                {/* CARDS RESUMO */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white">R$ {dados?.resumo?.bruto?.toLocaleString() || "0"}</h2>
                        <div className="flex items-center gap-1 text-green-500 mt-2"><ArrowUpCircle size={12}/><span className="text-[10px] font-black">+{dados?.resumo?.crescimento || "0"}% vs mês anterior</span></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-red-50 dark:border-red-900/20 shadow-sm">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Gastos (Saídas)</p>
                        <h2 className="text-2xl font-black text-red-600">R$ {dados?.resumo?.despesas?.toLocaleString() || "0"}</h2>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-orange-50 dark:border-orange-900/20 shadow-sm">
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">A Receber (Boletos)</p>
                        <h2 className="text-2xl font-black text-orange-600">R$ {dados?.boletosAbertos?.reduce((acc:any, b:any) => acc + Number(b.value), 0).toLocaleString() || "0"}</h2>
                    </div>
                    <div className="bg-blue-600 p-6 rounded-[2rem] shadow-xl shadow-blue-500/30 transform hover:scale-105 transition-transform">
                        <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Lucro Líquido (Real)</p>
                        <h2 className="text-3xl font-black text-white font-mono tracking-tighter">R$ {dados?.resumo?.liquido?.toLocaleString() || "0"}</h2>
                    </div>
                </div>

                {/* GRÁFICO */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700 mx-2">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-500"/> Fluxo de Caixa (Últimos 6 meses)
                        </h3>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dados?.fluxoCaixa || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#9ca3af'}} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                                <Legend wrapperStyle={{paddingTop: '20px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold'}} />
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
                            <h3 className="font-black text-xs uppercase tracking-widest text-red-500 flex items-center gap-2"><AlertTriangle size={18}/> Vencidos / Atrasados</h3>
                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black">{dados?.boletosVencidos?.length || 0}</span>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {dados?.boletosVencidos?.map((fat: any) => (
                                <div key={fat.id} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-sm text-red-700 dark:text-red-300">{fat.client.name}</p>
                                        <p className="text-[10px] font-black text-red-400 uppercase">Venceu: {format(new Date(fat.dueDate), 'dd/MM/yyyy')}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <p className="font-black text-red-600">R$ {Number(fat.value).toLocaleString()}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCobrar(fat, 'ATRASADO')} className="text-[10px] font-bold bg-white text-blue-600 px-3 py-1.5 rounded shadow-sm hover:bg-blue-50 transition flex items-center gap-1">
                                                <MessageCircle size={12}/> Cobrar
                                            </button>
                                            <button onClick={() => baixarBoleto(fat.id)} className="text-[10px] font-bold bg-white text-green-600 px-3 py-1.5 rounded shadow-sm hover:bg-green-50 transition flex items-center gap-1">
                                                <CheckCircle2 size={12}/> Baixar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!dados?.boletosVencidos || dados?.boletosVencidos.length === 0) && <p className="text-center text-gray-400 text-xs italic py-10">Tudo em dia!</p>}
                        </div>
                    </div>

                    {/* LISTA DE A VENCER */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Próximos Recebimentos</h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {dados?.boletosAbertos?.map((fat: any) => (
                                <div key={fat.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border dark:border-gray-800 flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-sm dark:text-white">{fat.client.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Vence: {format(new Date(fat.dueDate), 'dd/MM/yyyy')}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <p className="font-black dark:text-white">R$ {Number(fat.value).toLocaleString()}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCobrar(fat, 'LEMBRETE')} className="text-[10px] font-bold text-gray-400 hover:text-blue-500 transition flex items-center gap-1">
                                                <MessageCircle size={12}/> Lembrar
                                            </button>
                                            <button onClick={() => baixarBoleto(fat.id)} className="text-[10px] font-bold text-green-600 hover:text-green-700 transition flex items-center gap-1">
                                                <CheckCircle2 size={12}/> Receber
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!dados?.boletosAbertos || dados?.boletosAbertos.length === 0) && <p className="text-center text-gray-400 text-xs italic py-10">Nenhum lançamento futuro.</p>}
                        </div>
                    </div>
                </div>

                {/* HISTÓRICO DE DESPESAS */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700 mx-2">
                    <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                        <Receipt size={18} className="text-red-500"/> Histórico de Despesas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dados?.allExpenses?.map((exp: any) => (
                            <div key={exp.id} className="flex justify-between items-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-l-8 border-red-500 shadow-sm group">
                                <div>
                                    <p className="font-black text-sm uppercase dark:text-white">{exp.description}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-lg uppercase">
                                            {exp.frequency === 'MONTHLY' ? 'Mensal' : 'Único'}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">{exp.category}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-red-600 text-lg mr-2">R$ {Number(exp.value).toLocaleString()}</p>
                                    <button onClick={() => prepararEdicao(exp)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-blue-500 transition"><Pencil size={18}/></button>
                                    <button onClick={() => excluirDespesa(exp.id)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-red-500 transition"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- LAYOUT DE IMPRESSÃO (MODO PAISAGEM COMPLETO) --- */}
            <div className="hidden print:flex flex-col fixed inset-0 bg-white z-[9999] p-6 w-[297mm] h-[210mm] overflow-hidden text-black">
                <style jsx global>{`
                    @media print {
                        @page { size: landscape; margin: 5mm; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        aside { display: none !important; }
                    }
                `}</style>
                
                {/* CABEÇALHO */}
                <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-black text-white flex items-center justify-center font-bold text-2xl rounded-lg">N</div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">NOHUD</h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Relatório Financeiro Semestral</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-gray-400">Data de Emissão</p>
                        <p className="text-lg font-mono font-bold">{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    </div>
                </div>

                {/* RESUMO EM LINHA */}
                <div className="flex gap-4 mb-8">
                    <div className="flex-1 border-2 border-gray-100 bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Receita Total (Mês)</p>
                        <p className="text-3xl font-black text-blue-600">R$ {dados?.resumo?.bruto?.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 border-2 border-gray-100 bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Despesas (Mês)</p>
                        <p className="text-3xl font-black text-red-600">R$ {dados?.resumo?.despesas?.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 border-2 border-black bg-black text-white p-3 rounded-xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Lucro Líquido</p>
                        <p className="text-3xl font-black">R$ {dados?.resumo?.liquido?.toLocaleString()}</p>
                    </div>
                </div>

                {/* TABELA */}
                <div className="flex-1">
                    <h3 className="font-bold text-sm uppercase mb-3 flex items-center gap-2 border-b pb-1">
                        <FileText size={16}/> Demonstrativo de Resultados (6 Meses)
                    </h3>
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-gray-100 font-black uppercase text-[10px]">
                            <tr>
                                <th className="p-2 border-b border-gray-300">Mês de Referência</th>
                                <th className="p-2 border-b border-gray-300 text-right text-green-700">Entradas (+)</th>
                                <th className="p-2 border-b border-gray-300 text-right text-red-600">Saídas (-)</th>
                                <th className="p-2 border-b border-gray-300 text-right">Resultado (=)</th>
                                <th className="p-2 border-b border-gray-300 text-right text-gray-400">% Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dados?.fluxoCaixa?.map((item: any, i: number) => {
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
                        <tfoot className="bg-gray-50 font-black text-xs border-t-2 border-black">
                            <tr>
                                <td className="p-2 uppercase">Total Acumulado</td>
                                <td className="p-2 text-right text-green-700">R$ {dados?.fluxoCaixa?.reduce((acc:any, i:any) => acc + i.receita, 0).toLocaleString()}</td>
                                <td className="p-2 text-right text-red-600">R$ {dados?.fluxoCaixa?.reduce((acc:any, i:any) => acc + i.despesa, 0).toLocaleString()}</td>
                                <td className="p-2 text-right">R$ {(dados?.fluxoCaixa?.reduce((acc:any, i:any) => acc + i.receita, 0) - dados?.fluxoCaixa?.reduce((acc:any, i:any) => acc + i.despesa, 0)).toLocaleString()}</td>
                                <td className="p-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center mt-auto pt-4 border-t">
                    Sistema de Gestão NOHUD • Documento Confidencial
                </div>
            </div>

            {/* MODAL LANÇAR/EDITAR DESPESA (MANTIDO) */}
            {modalDespesa && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4 print:hidden">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800">
                        <button onClick={fecharModal} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24}/></button>
                        
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-red-100 text-red-600 rounded-2xl"><ArrowDownCircle size={24}/></div>
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
                                    onChange={e => setNovaDespesa({...novaDespesa, description: e.target.value})}
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
                                        onChange={e => setNovaDespesa({...novaDespesa, value: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Data</label>
                                    <input 
                                        type="date"
                                        className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-500 font-bold dark:text-white transition-all" 
                                        value={novaDespesa.date}
                                        onChange={e => setNovaDespesa({...novaDespesa, date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block flex items-center gap-1 font-bold"><Repeat size={10}/> Repetição (Recorrência)</label>
                                <select 
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-500 font-bold dark:text-white"
                                    value={novaDespesa.frequency}
                                    onChange={e => setNovaDespesa({...novaDespesa, frequency: e.target.value})}
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
                                    onChange={e => setNovaDespesa({...novaDespesa, category: e.target.value})}
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
        </div>
    );
}
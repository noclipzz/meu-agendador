"use client";

import { useState, useEffect } from "react";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Cell, Legend 
} from "recharts";
import { 
    DollarSign, TrendingUp, Users, Award, PieChart, 
    Briefcase, Plus, X, Save, Loader2, Receipt, ArrowDownCircle, ArrowUpCircle, Repeat, Trash2, Pencil
} from "lucide-react";
import { toast } from "sonner";

export default function FinanceiroPage() {
    const [dados, setDados] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [modalDespesa, setModalDespesa] = useState(false);
    const [salvando, setSalvando] = useState(false);

    // Estado do formulário atualizado para suportar Edição
    const [novaDespesa, setNovaDespesa] = useState({
        id: "", // Importante para saber se estamos editando
        description: "",
        value: "",
        category: "OUTROS",
        frequency: "ONCE",
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        carregarDados();
    }, []);

    async function carregarDados() {
        try {
            const res = await fetch('/api/painel/financeiro');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setDados(data);
        } catch (error: any) {
            toast.error(error.message || "Erro ao carregar dados financeiros.");
        } finally {
            setLoading(false);
        }
    }

    // FUNÇÃO PARA CARREGAR DADOS NO MODAL
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
        if (!novaDespesa.description || !novaDespesa.value) {
            return toast.error("Preencha a descrição e o valor.");
        }
        
        setSalvando(true);
        // Se houver ID, usamos o método PUT para atualizar, senão POST para criar
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
        } catch (error) {
            toast.error("Erro de conexão com o servidor.");
        } finally {
            setSalvando(false);
        }
    }

    async function excluirDespesa(id: string) {
        if(!confirm("Deseja remover este gasto?")) return;
        try {
            const res = await fetch('/api/painel/financeiro/despesas', {
                method: 'DELETE',
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                toast.success("Despesa removida.");
                carregarDados();
            }
        } catch (error) {
            toast.error("Erro ao excluir.");
        }
    }

    function fecharModal() {
        setModalDespesa(false);
        setNovaDespesa({ 
            id: "",
            description: "", 
            value: "", 
            category: "OUTROS", 
            frequency: "ONCE", 
            date: new Date().toISOString().split('T')[0] 
        });
    }

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40}/>
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Sincronizando caixa...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 p-2 font-sans">
            
            {/* CABEÇALHO COM AÇÃO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-800 dark:text-white">Financeiro Profissional</h1>
                    <p className="text-gray-500 font-bold text-sm">Controle de entradas, saídas e lucros recorrentes.</p>
                </div>
                <button 
                    onClick={() => setModalDespesa(true)}
                    className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-red-600 transition shadow-lg shadow-red-500/20 active:scale-95"
                >
                    <ArrowDownCircle size={20}/> Lançar Despesa
                </button>
            </div>

            {/* CARDS DE LUCRO LÍQUIDO E RESUMO (PROTEGIDOS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white">R$ {dados?.resumo?.bruto?.toLocaleString() || "0"}</h2>
                    <div className="flex items-center gap-1 text-green-500 mt-2">
                        <ArrowUpCircle size={12}/>
                        <span className="text-[10px] font-black">+{dados?.resumo?.crescimento || "0"}% vs mês anterior</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-red-50 dark:border-red-900/20 shadow-sm">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Gastos (Saídas)</p>
                    <h2 className="text-2xl font-black text-red-600">R$ {dados?.resumo?.despesas?.toLocaleString() || "0"}</h2>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-orange-50 dark:border-orange-900/20 shadow-sm">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Comissões (Equipe)</p>
                    <h2 className="text-2xl font-black text-orange-600">R$ {dados?.resumo?.comissoes?.toLocaleString() || "0"}</h2>
                </div>

                <div className="bg-blue-600 p-6 rounded-[2rem] shadow-xl shadow-blue-500/30 transform hover:scale-105 transition-transform">
                    <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Lucro Líquido (Real)</p>
                    <h2 className="text-3xl font-black text-white font-mono tracking-tighter">R$ {dados?.resumo?.liquido?.toLocaleString() || "0"}</h2>
                </div>
            </div>

            {/* GRÁFICO DE BARRAS COMPARATIVO */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-500"/> Fluxo de Caixa (Entradas vs Saídas)
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
                            <Bar name="Receita Bruta" dataKey="receita" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={30} />
                            <Bar name="Despesas" dataKey="despesa" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* RANKINGS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700">
                    <h3 className="font-black mb-8 flex items-center gap-2 uppercase text-[10px] tracking-widest text-gray-400">
                        <Users size={18} className="text-purple-500"/> Performance Financeira Equipe
                    </h3>
                    <div className="space-y-6">
                        {dados?.rankingProfissionais?.map((pro: any, index: number) => (
                            <div key={pro.name} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-black text-gray-200">0{index + 1}</span>
                                        <span className="font-black text-sm dark:text-white uppercase tracking-tight">{pro.name}</span>
                                    </div>
                                    <span className="font-black text-sm text-blue-600">R$ {pro.receita.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-900 h-3 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${(pro.receita / (dados.resumo.bruto || 1)) * 100}%`, backgroundColor: pro.color || '#3b82f6' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700">
                    <h3 className="font-black mb-8 flex items-center gap-2 uppercase text-[10px] tracking-widest text-gray-400">
                        <Briefcase size={18} className="text-green-500"/> Serviços mais Lucrativos
                    </h3>
                    <div className="space-y-3">
                        {dados?.rankingServicos?.map((ser: any) => (
                            <div key={ser.name} className="flex justify-between items-center p-5 bg-gray-50 dark:bg-gray-950 rounded-[1.8rem] border-2 border-transparent hover:border-green-500 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 font-black text-lg group-hover:scale-110 transition-transform">
                                        {ser.count}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm dark:text-white uppercase tracking-tighter">{ser.name}</p>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{ser.count} agendamentos</p>
                                    </div>
                                </div>
                                <span className="font-black text-green-600 text-lg">R$ {ser.receita.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* LISTAGEM DE GESTÃO DE GASTOS */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border dark:border-gray-700 mx-2">
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                    <Receipt size={18} className="text-red-500"/> Gestão de Gastos (Fixos e Variáveis)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dados?.allExpenses?.map((exp: any) => (
                        <div key={exp.id} className="flex justify-between items-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-l-8 border-red-500 shadow-sm group">
                            <div>
                                <p className="font-black text-sm uppercase dark:text-white">{exp.description}</p>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-lg uppercase">
                                        {exp.frequency === 'MONTHLY' ? 'Todo Mês' : exp.frequency === 'WEEKLY' ? 'Toda Semana' : exp.frequency === 'YEARLY' ? 'Anual' : 'Único'}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Cat: {exp.category}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="font-black text-red-600 text-lg mr-2">R$ {Number(exp.value).toLocaleString()}</p>
                                {/* BOTÃO DE EDIÇÃO ADICIONADO */}
                                <button onClick={() => prepararEdicao(exp)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-blue-500 transition">
                                    <Pencil size={18}/>
                                </button>
                                <button onClick={() => excluirDespesa(exp.id)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-red-500 transition">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {(!dados?.allExpenses || dados?.allExpenses.length === 0) && (
                        <p className="col-span-full text-center text-gray-400 font-black uppercase text-[10px] py-10 tracking-widest">Nenhum gasto registrado.</p>
                    )}
                </div>
            </div>

            {/* MODAL LANÇAR/EDITAR DESPESA */}
            {modalDespesa && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
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

                            <button 
                                onClick={salvarDespesa}
                                disabled={salvando}
                                className="w-full mt-4 bg-red-500 text-white p-5 rounded-[1.8rem] font-black text-lg shadow-xl shadow-red-500/20 hover:bg-red-600 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {salvando ? <Loader2 className="animate-spin" /> : novaDespesa.id ? "Salvar Alterações" : "Confirmar Gasto"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
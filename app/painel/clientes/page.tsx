"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Phone, Mail, History, X, Save, UserPlus, Pencil, Calendar, Clock, MapPin, FileText, CheckCircle2, UserCircle } from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(true);
    
    // Modais e Seleção
    const [modalAberto, setModalAberto] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Estado para nova observação rápida
    const [novaObs, setNovaObs] = useState("");
    const [mostrarInputObs, setMostrarInputObs] = useState(false);

    const [form, setForm] = useState({ 
        id: "", name: "", phone: "", email: "", cpf: "", rg: "", 
        birthDate: "", cep: "", address: "", city: "", notes: "", status: "ATIVO" 
    });

    useEffect(() => { carregarClientes(); }, []);

    async function carregarClientes() {
        const res = await fetch('/api/clientes');
        const data = await res.json();
        setClientes(data);
        setLoading(false);
    }

    // ATUALIZAÇÃO INSTANTÂNEA: Atualiza o estado local após salvar
    async function salvarCliente() {
        if(!form.name) return toast.error("Nome obrigatório");
        const method = form.id ? 'PUT' : 'POST';
        const res = await fetch('/api/clientes', {
            method, body: JSON.stringify(form)
        });
        
        if(res.ok) {
            const clienteSalvo = await res.json();
            
            // Lógica para atualizar a lista e a ficha aberta na hora
            if (form.id) {
                setClientes(prev => prev.map(c => c.id === form.id ? clienteSalvo : c));
                if (clienteSelecionado?.id === form.id) setClienteSelecionado(clienteSalvo);
            } else {
                setClientes(prev => [...prev, clienteSalvo]);
            }

            toast.success(form.id ? "Dados atualizados!" : "Cliente cadastrado!");
            fecharModal();
        }
    }

    // ADICIONAR OBSERVAÇÃO COM DATA E HORA EM TEMPO REAL
    async function adicionarNotaRapida() {
        if (!novaObs.trim()) return;
        const dataNota = format(new Date(), "dd/MM/yy 'às' HH:mm");
        const notaFormatada = `[${dataNota}]: ${novaObs}`;
        
        // Junta a nota nova com as antigas
        const novaStringNotas = clienteSelecionado.notes 
            ? `${clienteSelecionado.notes}\n${notaFormatada}`
            : notaFormatada;

        const res = await fetch('/api/clientes', {
            method: 'PUT',
            body: JSON.stringify({ ...clienteSelecionado, notes: novaStringNotas })
        });

        if (res.ok) {
            const atualizado = await res.json();
            setClienteSelecionado(atualizado);
            setClientes(prev => prev.map(c => c.id === atualizado.id ? atualizado : c));
            setNovaObs("");
            setMostrarInputObs(false);
            toast.success("Observação adicionada!");
        }
    }

    function abrirEdicao(cliente: any) {
        setForm({ ...cliente });
        setIsEditing(true);
        setModalAberto(true);
    }

    function fecharModal() {
        setModalAberto(false);
        setIsEditing(false);
        setForm({ id: "", name: "", phone: "", email: "", cpf: "", rg: "", birthDate: "", cep: "", address: "", city: "", notes: "", status: "ATIVO" });
    }

    const filtrados = clientes.filter(c => c.name.toLowerCase().includes(busca.toLowerCase()) || c.phone?.includes(busca));

    if (loading) return <div className="p-10 text-center font-bold text-gray-400">Carregando CRM...</div>;

    return (
        <div className="space-y-6 pb-20">
            {/* TOPO */}
            <div className="flex justify-between items-center px-2">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Gestão de Clientes</h1>
                <button onClick={() => setModalAberto(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg">
                    <UserPlus size={20}/> Adicionar Cliente
                </button>
            </div>

            {/* BUSCA */}
            <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 flex items-center gap-3 shadow-sm mx-2">
                <Search className="text-gray-400 ml-3" size={20}/>
                <input className="bg-transparent outline-none flex-1 py-3 text-sm" placeholder="Pesquisar por nome, CPF ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)}/>
            </div>

            {/* LISTA DE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                {filtrados.map(c => (
                    <div key={c.id} onClick={() => setClienteSelecionado(c)} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-500 shadow-sm transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${c.status === 'ATIVO' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {c.name.charAt(0)}
                            </div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${c.status === 'ATIVO' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                {c.status}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-blue-600 transition">{c.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1"><Phone size={14}/> {c.phone || 'N/A'}</p>
                    </div>
                ))}
            </div>

            {/* FICHA DO CLIENTE (HORIZONTAL) */}
            {clienteSelecionado && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white dark:bg-gray-950 w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl">
                                    {clienteSelecionado.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black dark:text-white">{clienteSelecionado.name}</h2>
                                    <div className="flex gap-4 mt-1">
                                        <span className="text-blue-600 font-bold flex items-center gap-1 text-sm"><Phone size={14}/> {clienteSelecionado.phone}</span>
                                        <span className="text-gray-400 font-bold flex items-center gap-1 text-sm"><CheckCircle2 size={14} className="text-green-500"/> Cliente {clienteSelecionado.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => abrirEdicao(clienteSelecionado)} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-50 transition text-blue-600 shadow-sm"><Pencil size={20}/></button>
                                <button onClick={() => setClienteSelecionado(null)} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-red-50 hover:text-red-500 transition shadow-sm"><X size={20}/></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-12 gap-8">
                                <div className="col-span-12 lg:col-span-8 space-y-8">
                                    <section>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><FileText size={14}/> Documentação</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
                                                <label className="text-[9px] font-black text-gray-400 uppercase">CPF</label>
                                                <p className="font-bold dark:text-gray-200">{clienteSelecionado.cpf || "---"}</p>
                                            </div>
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
                                                <label className="text-[9px] font-black text-gray-400 uppercase">RG</label>
                                                <p className="font-bold dark:text-gray-200">{clienteSelecionado.rg || "---"}</p>
                                            </div>
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
                                                <label className="text-[9px] font-black text-gray-400 uppercase">Nascimento</label>
                                                <p className="font-bold dark:text-gray-200">{clienteSelecionado.birthDate ? format(new Date(clienteSelecionado.birthDate), "dd/MM/yyyy") : "---"}</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><MapPin size={14}/> Localização</h4>
                                        <div className="grid grid-cols-12 gap-4">
                                            <div className="col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
                                                <label className="text-[9px] font-black text-gray-400 uppercase">CEP</label>
                                                <p className="font-bold dark:text-gray-200">{clienteSelecionado.cep || "---"}</p>
                                            </div>
                                            <div className="col-span-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
                                                <label className="text-[9px] font-black text-gray-400 uppercase">Endereço</label>
                                                <p className="font-bold dark:text-gray-200 truncate">{clienteSelecionado.address || "---"}</p>
                                            </div>
                                            <div className="col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
                                                <label className="text-[9px] font-black text-gray-400 uppercase">Cidade</label>
                                                <p className="font-bold dark:text-gray-200">{clienteSelecionado.city || "---"}</p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* SEÇÃO DE OBSERVAÇÕES INTERATIVA */}
                                    <section>
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Plus size={14}/> Observações Internas</h4>
                                            <button onClick={() => setMostrarInputObs(!mostrarInputObs)} className="p-1 bg-blue-600 text-white rounded-lg hover:scale-110 transition"><Plus size={16}/></button>
                                        </div>
                                        
                                        {mostrarInputObs && (
                                            <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2">
                                                <input className="flex-1 border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-900 text-sm outline-none" placeholder="Escreva uma nota rápida..." value={novaObs} onChange={e => setNovaObs(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarNotaRapida()}/>
                                                <button onClick={adicionarNotaRapida} className="bg-green-600 text-white px-4 rounded-xl font-bold text-sm">Salvar Nota</button>
                                            </div>
                                        )}

                                        <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                            {clienteSelecionado.notes?.split('\n').reverse().map((nota: string, i: number) => (
                                                <div key={i} className="p-4 bg-yellow-50/50 dark:bg-yellow-500/5 rounded-2xl border border-yellow-100 dark:border-yellow-900/30 text-sm text-yellow-800 dark:text-yellow-200 italic shadow-sm">
                                                    {nota}
                                                </div>
                                            )) || <p className="text-gray-400 text-sm italic">Nenhuma observação registrada.</p>}
                                        </div>
                                    </section>
                                </div>

                                {/* HISTÓRICO COM PROFISSIONAL E HORA */}
                                <div className="col-span-12 lg:col-span-4 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] p-6 border dark:border-gray-800">
                                    <h4 className="text-sm font-black mb-6 flex items-center gap-2 text-blue-600"><History size={18}/> Últimas Visitas</h4>
                                    <div className="space-y-4">
                                        {clienteSelecionado.bookings?.length > 0 ? (
                                            clienteSelecionado.bookings.map((b: any) => (
                                                <div key={b.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border dark:border-gray-800 flex justify-between items-center group hover:border-blue-500 transition-all">
                                                    <div className="space-y-1">
                                                        <p className="font-black text-sm">{b.service.name}</p>
                                                        <div className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                                                            <span className="flex items-center gap-1"><Calendar size={12} className="text-blue-500"/> {format(new Date(b.date), "dd/MM/yyyy")} | {format(new Date(b.date), "HH:mm")}h</span>
                                                            <span className="flex items-center gap-1"><UserCircle size={12} className="text-purple-500"/> Prof: {b.professional?.name || '---'}</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-black text-green-600 text-sm whitespace-nowrap">R$ {b.service.price}</span>
                                                </div>
                                            ))
                                        ) : ( <p className="text-center text-gray-400 py-10 text-xs font-bold uppercase tracking-widest">Sem registros</p> )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center">
                            <div className="flex gap-6">
                                <div className="text-center"><p className="text-[10px] font-black text-gray-400 uppercase">Total Gasto</p><p className="font-black text-2xl text-green-600">R$ {clienteSelecionado.bookings?.reduce((acc: any, b: any) => acc + Number(b.service.price), 0)}</p></div>
                                <div className="text-center border-l dark:border-gray-800 pl-6"><p className="text-[10px] font-black text-gray-400 uppercase">Frequência</p><p className="font-black text-2xl text-blue-600">{clienteSelecionado.bookings?.length || 0}x</p></div>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ficha atualizada em tempo real</p>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CADASTRO/EDIÇÃO (COM TODOS OS CAMPOS) */}
            {modalAberto && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[80] p-4">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-4xl relative shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button onClick={fecharModal} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24}/></button>
                        <h2 className="text-3xl font-black mb-8">{isEditing ? "Editar Ficha" : "Nova Ficha"}</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nome Completo</label><input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Telefone</label><input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Email</label><input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">RG</label><input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.rg} onChange={e => setForm({...form, rg: e.target.value})}/></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nascimento</label><input type="date" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})}/></div>
                                </div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">CPF</label><input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})}/></div>
                            </div>

                            <div className="space-y-5">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Endereço Residencial</label><input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})}/></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Cidade</label><input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.city} onChange={e => setForm({...form, city: e.target.value})}/></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">CEP</label><input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.cep} onChange={e => setForm({...form, cep: e.target.value})}/></div>
                                </div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Status</label><select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold outline-none" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Observações Iniciais</label><textarea rows={2} className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}/></div>
                            </div>
                        </div>

                        <button onClick={salvarCliente} className="w-full mt-8 bg-blue-600 text-white p-6 rounded-[2rem] font-black text-xl shadow-xl hover:bg-blue-700 transition flex items-center justify-center gap-3">
                            <Save size={24}/> Salvar Registro
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
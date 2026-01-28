"use client";

import { useState, useEffect, useRef } from "react";
import { 
    Plus, Search, Phone, Mail, History, X, Save, UserPlus, Pencil, 
    Calendar, Clock, MapPin, FileText, CheckCircle2, UserCircle,
    DollarSign, Receipt, Trash2, Download, Image as ImageIcon, 
    FileIcon, Loader2, UploadCloud, CreditCard, QrCode, Banknote, AlertTriangle
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(true);
    const [salvandoAnexo, setSalvandoAnexo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Modais e Seleção
    const [modalAberto, setModalAberto] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
    const [abaAtiva, setAbaAtiva] = useState<"DADOS" | "FINANCEIRO" | "ANEXOS">("DADOS");
    const [isEditing, setIsEditing] = useState(false);
    const [confirmarExclusao, setConfirmarExclusao] = useState<{id: string, tipo: 'CLIENTE' | 'ANEXO'} | null>(null);

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

    async function salvarCliente() {
        if(!form.name) return toast.error("Nome obrigatório");
        const method = form.id ? 'PUT' : 'POST';
        const res = await fetch('/api/clientes', {
            method, body: JSON.stringify(form)
        });
        
        if(res.ok) {
            const clienteSalvo = await res.json();
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

    async function adicionarNotaRapida() {
        if (!novaObs.trim()) return;
        const dataNota = format(new Date(), "dd/MM/yy 'às' HH:mm");
        const notaFormatada = `[${dataNota}]: ${novaObs}`;
        const novaStringNotas = clienteSelecionado.notes ? `${clienteSelecionado.notes}\n${notaFormatada}` : notaFormatada;

        const res = await fetch('/api/clientes', {
            method: 'PUT',
            body: JSON.stringify({ ...clienteSelecionado, notes: novaStringNotas })
        });

        if (res.ok) {
            const atualizado = await res.json();
            setClienteSelecionado(atualizado);
            setClientes(prev => prev.map(c => c.id === atualizado.id ? atualizado : c));
            setNovaObs(""); setMostrarInputObs(false);
            toast.success("Observação adicionada!");
        }
    }

    async function handleUploadAnexo(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setSalvandoAnexo(true);
        try {
            const resUpload = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
            const blob = await resUpload.json();
            const resBanco = await fetch('/api/clientes/anexos', {
                method: 'POST',
                body: JSON.stringify({ name: file.name, url: blob.url, type: file.type, clientId: clienteSelecionado.id })
            });
            if (resBanco.ok) {
                const novoAnexo = await resBanco.json();
                setClienteSelecionado({...clienteSelecionado, attachments: [...(clienteSelecionado.attachments || []), novoAnexo]});
                toast.success("Arquivo anexado!");
            }
        } catch (error) { toast.error("Erro no upload."); }
        finally { setSalvandoAnexo(false); }
    }

    async function executarExclusao() {
        if (!confirmarExclusao) return;
        const { id, tipo } = confirmarExclusao;
        const url = tipo === 'CLIENTE' ? '/api/clientes' : '/api/clientes/anexos';
        const res = await fetch(url, { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.ok) {
            if (tipo === 'CLIENTE') {
                setClientes(prev => prev.filter(c => c.id !== id));
                setClienteSelecionado(null);
            } else {
                setClienteSelecionado({...clienteSelecionado, attachments: clienteSelecionado.attachments.filter((a:any) => a.id !== id)});
            }
            toast.success("Excluído com sucesso.");
        }
        setConfirmarExclusao(null);
    }

    function abrirEdicao(cliente: any) { setForm({ ...cliente }); setIsEditing(true); setModalAberto(true); }
    function fecharModal() { setModalAberto(false); setIsEditing(false); setForm({ id: "", name: "", phone: "", email: "", cpf: "", rg: "", birthDate: "", cep: "", address: "", city: "", notes: "", status: "ATIVO" }); }

    const filtrados = clientes.filter(c => c.name.toLowerCase().includes(busca.toLowerCase()) || c.phone?.includes(busca));

    if (loading) return <div className="p-10 text-center font-black text-gray-400 animate-pulse uppercase text-xs">Sincronizando CRM...</div>;

    return (
        <div className="space-y-6 pb-20 p-2 font-sans">
            <div className="flex justify-between items-center px-2">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Gestão de Clientes</h1>
                <button onClick={() => setModalAberto(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"><UserPlus size={20}/> Adicionar Cliente</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 flex items-center gap-3 shadow-sm mx-2">
                <Search className="text-gray-400 ml-3" size={20}/>
                <input className="bg-transparent outline-none flex-1 py-3 text-sm dark:text-white" placeholder="Pesquisar por nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)}/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                {filtrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteSelecionado(c); setAbaAtiva("DADOS"); }} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-500 shadow-sm transition-all cursor-pointer group">
                        <div className="flex justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-xl text-blue-600">{c.name.charAt(0)}</div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${c.status === 'ATIVO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{c.status}</span>
                        </div>
                        <h3 className="font-black text-lg group-hover:text-blue-600 transition dark:text-white">{c.name}</h3>
                        <p className="text-sm text-gray-500">{c.phone || 'Sem telefone'}</p>
                    </div>
                ))}
            </div>

            {/* FICHA DO CLIENTE (HORIZONTAL COM ABAS) */}
            {clienteSelecionado && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white dark:bg-gray-950 w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        
                        {/* HEADER DA FICHA */}
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl">{clienteSelecionado.name.charAt(0)}</div>
                                <div><h2 className="text-3xl font-black dark:text-white">{clienteSelecionado.name}</h2>
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

                        {/* SELETOR DE ABAS */}
                        <div className="flex px-8 pt-6 gap-8 border-b dark:border-gray-800 bg-white dark:bg-gray-950">
                            <button onClick={() => setAbaAtiva("DADOS")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${abaAtiva === "DADOS" ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-400"}`}>Geral</button>
                            <button onClick={() => setAbaAtiva("FINANCEIRO")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${abaAtiva === "FINANCEIRO" ? "border-b-4 border-green-600 text-green-600" : "text-gray-400"}`}>Financeiro</button>
                            <button onClick={() => setAbaAtiva("ANEXOS")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${abaAtiva === "ANEXOS" ? "border-b-4 border-purple-600 text-purple-600" : "text-gray-400"}`}>Documentos</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            
                            {abaAtiva === "DADOS" && (
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-12 lg:col-span-8 space-y-8">
                                        <section><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><FileText size={14}/> Documentação</h4>
                                            {/* GRID AJUSTADO PARA O E-MAIL NÃO CORTAR (grid-cols-12) */}
                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-6 lg:col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CPF</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.cpf || "---"}</p></div>
                                                <div className="col-span-6 lg:col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">RG</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.rg || "---"}</p></div>
                                                <div className="col-span-6 lg:col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Telefone</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.phone || "---"}</p></div>
                                                <div className="col-span-12 lg:col-span-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800 min-w-0"><label className="text-[9px] font-black text-gray-400 uppercase">E-mail</label><p className="font-bold dark:text-white text-xs truncate" title={clienteSelecionado.email}>{clienteSelecionado.email || "---"}</p></div>
                                                <div className="col-span-6 lg:col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Nasc.</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.birthDate ? format(new Date(clienteSelecionado.birthDate), "dd/MM/yyyy") : "---"}</p></div>
                                            </div>
                                        </section>
                                        <section><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><MapPin size={14}/> Localização</h4>
                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CEP</label><p className="font-bold dark:text-white text-sm">{clienteSelecionado.cep || "---"}</p></div>
                                                <div className="col-span-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Endereço</label><p className="font-bold dark:text-white text-sm truncate">{clienteSelecionado.address || "---"}</p></div>
                                                <div className="col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Cidade</label><p className="font-bold dark:text-white text-sm">{clienteSelecionado.city || "---"}</p></div>
                                            </div>
                                        </section>
                                        <section><div className="flex justify-between items-center mb-4"><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Plus size={14}/> Notas</h4><button onClick={() => setMostrarInputObs(!mostrarInputObs)} className="p-1 bg-blue-600 text-white rounded-lg"><Plus size={14}/></button></div>
                                            {mostrarInputObs && <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2"><input className="flex-1 border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-900 text-sm outline-none dark:text-white" placeholder="Escreva..." value={novaObs} onChange={e => setNovaObs(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarNotaRapida()}/><button onClick={adicionarNotaRapida} className="bg-green-600 text-white px-4 rounded-xl font-bold text-sm">Salvar</button></div>}
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">{clienteSelecionado.notes?.split('\n').reverse().map((n: string, i: number) => (<div key={i} className="p-3 bg-yellow-50/50 dark:bg-yellow-500/5 rounded-xl border border-yellow-100 dark:border-yellow-900/30 text-sm italic dark:text-gray-200">{n}</div>)) || <p className="text-gray-400 text-sm italic">Nenhuma observação.</p>}</div>
                                        </section>
                                    </div>
                                    <div className="col-span-12 lg:col-span-4 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] p-6 border dark:border-gray-800">
                                        <h4 className="text-sm font-black mb-6 uppercase text-blue-600 flex items-center gap-2"><History size={18}/> Últimas Visitas</h4>
                                        <div className="space-y-4">
                                            {clienteSelecionado.bookings?.map((b: any) => (
                                                <div key={b.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border dark:border-gray-800 flex justify-between items-center group hover:border-blue-500 transition-all">
                                                    <div>
                                                        <p className="font-black text-sm dark:text-white uppercase leading-none mb-1">{b.service?.name}</p>
                                                        {/* ADICIONADO NOME DO PROFISSIONAL NO HISTÓRICO */}
                                                        <p className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1 mb-1">
                                                            <UserCircle size={10}/> Prof: {b.professional?.name || 'Não informado'}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-gray-400">{format(new Date(b.date), "dd/MM/yy 'às' HH:mm")}</p>
                                                    </div>
                                                    <span className="font-black text-green-600 text-sm">R$ {b.service?.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {abaAtiva === "FINANCEIRO" && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="p-8 bg-green-50 dark:bg-green-900/10 rounded-[2.5rem] border border-green-100 dark:border-green-900/30 text-center"><p className="text-[10px] font-black text-green-600 uppercase mb-1">Total Já Pago</p><p className="text-3xl font-black text-green-600">R$ {clienteSelecionado.invoices?.filter((i:any) => i.status === "PAGO").reduce((acc:any, cur:any) => acc + Number(cur.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                                        <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] border border-red-100 dark:border-red-900/30 text-center"><p className="text-[10px] font-black text-red-600 uppercase mb-1">Em Aberto</p><p className="text-3xl font-black text-red-600">R$ {clienteSelecionado.invoices?.filter((i:any) => i.status === "PENDENTE").reduce((acc:any, cur:any) => acc + Number(cur.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                                        <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 text-center"><p className="text-[10px] font-black text-blue-400 uppercase mb-1">Acumulado</p><p className="text-3xl font-black dark:text-white">R$ {(clienteSelecionado.invoices?.reduce((acc:any, cur:any) => acc + Number(cur.value), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2 ml-2"><Receipt size={18}/> Detalhamento Financeiro</h4>
                                        {clienteSelecionado.invoices?.map((inv: any) => (
                                            <div key={inv.id} className="p-6 bg-white dark:bg-gray-900 border-2 dark:border-gray-800 rounded-[2rem] flex justify-between items-center hover:border-green-500 transition-all shadow-sm">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${inv.status === 'PAGO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        {inv.method === 'PIX' ? <QrCode size={24}/> : inv.method === 'CARTAO' ? <CreditCard size={24}/> : <Banknote size={24}/>}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-base dark:text-white uppercase tracking-tight">{inv.description}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Venc: {format(new Date(inv.dueDate), "dd/MM/yyyy")}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-black text-xl ${inv.status === 'PAGO' ? 'text-green-600' : 'text-red-600'}`}>R$ {Number(inv.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{inv.status} • {inv.method || 'A DEFINIR'}</span>
                                                </div>
                                            </div>
                                        )) || <p className="text-center py-20 opacity-30 italic">Sem faturamentos registrados.</p>}
                                    </div>
                                </div>
                            )}

                            {abaAtiva === "ANEXOS" && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center px-2"><h4 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2"><Plus size={18}/> Documentos e Fotos</h4>
                                        <label className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase cursor-pointer hover:bg-purple-700 transition flex items-center gap-2 shadow-lg">
                                            {salvandoAnexo ? <Loader2 className="animate-spin" size={16}/> : <UploadCloud size={16}/>}{salvandoAnexo ? "Subindo..." : "Novo Arquivo"}
                                            <input type="file" className="hidden" onChange={handleUploadAnexo} accept=".pdf,image/*" disabled={salvandoAnexo}/>
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {clienteSelecionado.attachments?.map((file: any) => (
                                            <div key={file.id} className="p-6 bg-white dark:bg-gray-900 border-2 dark:border-gray-800 rounded-[2.5rem] flex justify-between items-center group hover:border-purple-500 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center">{file.type.includes('image') ? <ImageIcon size={24}/> : <FileText size={24}/>}</div>
                                                    <div><p className="font-black text-sm uppercase dark:text-white truncate max-w-[150px]">{file.name}</p><p className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(file.createdAt), "dd MMM yyyy")}</p></div>
                                                </div>
                                                <div className="flex gap-2"><a href={file.url} target="_blank" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-blue-600 transition"><Download size={18}/></a><button onClick={() => setConfirmarExclusao({id: file.id, tipo: 'ANEXO'})} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-red-500 transition"><Trash2 size={18}/></button></div>
                                            </div>
                                        )) || <div className="col-span-full py-20 text-center opacity-30 italic">Sem anexos.</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RODAPÉ ESTILIZADO */}
                        <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center">
                            <div className="flex gap-8">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Gasto</p><p className="font-black text-2xl text-green-600">R$ {clienteSelecionado.bookings?.reduce((acc: any, b: any) => acc + Number(b.service?.price || 0), 0)}</p></div>
                                <div className="border-l dark:border-gray-800 pl-8"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Frequência</p><p className="font-black text-2xl text-blue-600">{clienteSelecionado.bookings?.length || 0}x</p></div>
                            </div>
                            <div className="text-right"><p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Ficha atualizada em tempo real</p><p className="text-[9px] text-gray-500 mt-1 uppercase font-bold">Registro: {format(new Date(clienteSelecionado.createdAt), "dd/MM/yyyy")}</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CADASTRO/EDIÇÃO (MANTIDO) */}
            {modalAberto && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[80] p-4">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-4xl relative shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button onClick={fecharModal} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24}/></button>
                        <h2 className="text-3xl font-black mb-8 dark:text-white">{isEditing ? "Editar Ficha" : "Novo Cliente"}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nome Completo</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Telefone</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Email para Alertas</label><input type="email" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">RG</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.rg} onChange={e => setForm({...form, rg: e.target.value})}/></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nascimento</label><input type="date" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})}/></div>
                                </div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">CPF</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})}/></div>
                            </div>
                            <div className="space-y-5">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Endereço Residencial</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.address} onChange={e => setForm({...form, address: e.target.value})}/></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Cidade</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.city} onChange={e => setForm({...form, city: e.target.value})}/></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">CEP</label><input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={form.cep} onChange={e => setForm({...form, cep: e.target.value})}/></div>
                                </div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Status</label><select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold dark:text-white outline-none" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Notas Iniciais</label><textarea rows={2} className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none dark:text-white font-bold" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}/></div>
                            </div>
                        </div>
                        <button onClick={salvarCliente} className="w-full mt-8 bg-blue-600 text-white p-6 rounded-[2rem] font-black text-xl shadow-xl hover:bg-blue-700 transition flex items-center justify-center gap-3"><Save size={24}/> Salvar Registro</button>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO ESTILIZADO */}
            {confirmarExclusao && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-sm text-center shadow-2xl border dark:border-gray-800 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40}/></div>
                        <h2 className="text-2xl font-black mb-2 dark:text-white tracking-tighter uppercase">Excluir?</h2>
                        <p className="text-gray-500 text-sm mb-8 font-medium">Os dados serão removidos permanentemente. Confirmar?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConfirmarExclusao(null)} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase text-gray-600 dark:text-gray-300">Não</button>
                            <button onClick={executarExclusao} className="p-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20">Sim, excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
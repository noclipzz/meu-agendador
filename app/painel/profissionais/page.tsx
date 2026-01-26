"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Save, Loader2, Pencil, X, UserCircle, Palette, Phone, ShieldCheck, Copy, Check } from "lucide-react"; 
import { toast } from "sonner";
import { useAgenda } from "../../../contexts/AgendaContext";

export default function GestaoEquipe() {
  const { setRefreshKey } = useAgenda();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  // FORMULÁRIO
  const [form, setForm] = useState({ 
    id: "", 
    name: "", 
    phone: "", 
    color: "#3b82f6", 
    userId: "" // ID do Clerk do funcionário para vincular login
  });

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    try {
        const res = await fetch('/api/painel/profissionais');
        const data = await res.json();
        if (Array.isArray(data)) setProfissionais(data);
    } catch(e) { 
        console.error(e);
        toast.error("Erro ao carregar lista de profissionais.");
    } finally { 
        setLoading(false); 
    }
  }

  async function salvarProfissional() {
    if(!form.name) return toast.error("O nome é obrigatório.");
    
    setSalvando(true);
    const method = form.id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch('/api/painel/profissionais', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });

        const data = await res.json();

        if (res.ok) {
            toast.success(form.id ? "Dados atualizados!" : "Profissional adicionado!");
            fecharModal();
            carregarDados();
            // Avisa a agenda para atualizar as cores e nomes
            if (setRefreshKey) setRefreshKey((prev: number) => prev + 1);
        } else {
            // EXIBE O ERRO DE LIMITE DO PLANO (1, 5 ou 15) vindo da API
            toast.error(data.error || "Erro ao salvar profissional.");
        }
    } catch (error) {
        toast.error("Erro de conexão com o servidor.");
    } finally {
        setSalvando(false);
    }
  }

  async function deletar(id: string, nome: string) {
    toast(`Remover ${nome} da equipe?`, {
        action: {
            label: "Confirmar",
            onClick: async () => {
                const res = await fetch('/api/painel/profissionais', { 
                    method: 'DELETE', 
                    body: JSON.stringify({ id }) 
                });
                if (res.ok) {
                    setProfissionais(prev => prev.filter(p => p.id !== id));
                    toast.success("Removido com sucesso.");
                    if (setRefreshKey) setRefreshKey((prev: number) => prev + 1);
                }
            }
        }
    });
  }

  function prepararEdicao(p: any) {
      setForm({
          id: p.id,
          name: p.name,
          phone: p.phone || "",
          color: p.color || "#3b82f6",
          userId: p.userId || ""
      });
      setModalAberto(true);
  }

  function fecharModal() {
      setModalAberto(false);
      setForm({ id: "", name: "", phone: "", color: "#3b82f6", userId: "" });
  }

  if (loading) return (
    <div className="h-96 w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32}/>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER TIPO SaaS PRO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="text-blue-600" size={32}/> Gestão de Equipe
            </h1>
            <p className="text-gray-500 text-sm font-medium">Cadastre profissionais e vincule contas de acesso.</p>
        </div>
        <button 
            onClick={() => setModalAberto(true)} 
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
        >
            <Plus size={20}/> Novo Profissional
        </button>
      </div>

      {/* LISTA DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
        {profissionais.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-blue-500 transition-all shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                    <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg"
                        style={{ backgroundColor: p.color }}
                    >
                        {p.name.charAt(0)}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => prepararEdicao(p)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition">
                            <Pencil size={18}/>
                        </button>
                        <button onClick={() => deletar(p.id, p.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                            <Trash2 size={18}/>
                        </button>
                    </div>
                </div>
                
                <h3 className="text-xl font-bold dark:text-white">{p.name}</h3>
                <div className="mt-4 space-y-3">
                    <p className="text-sm text-gray-500 flex items-center gap-2 font-bold">
                        <Phone size={14} className="text-blue-500"/> {p.phone || "Sem telefone"}
                    </p>
                    
                    {/* INDICADOR DE VÍNCULO DE CONTA */}
                    <div className={`text-[10px] p-2.5 rounded-xl font-black flex items-center justify-between gap-2 ${p.userId ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-gray-100 text-gray-400 dark:bg-gray-900'}`}>
                        <span className="flex items-center gap-1.5 uppercase tracking-tighter">
                            <UserCircle size={14}/> {p.userId ? "Conta Vinculada" : "Sem acesso ao painel"}
                        </span>
                        {p.userId && <Check size={12} />}
                    </div>
                </div>
            </div>
        ))}

        {profissionais.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[3rem]">
                <Users size={48} className="mx-auto text-gray-300 mb-4"/>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Nenhum profissional cadastrado</p>
            </div>
        )}
      </div>

      {/* MODAL ADICIONAR/EDITAR */}
      {modalAberto && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
              <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800 animate-in zoom-in-95 duration-200">
                  <button onClick={fecharModal} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition"><X size={24}/></button>
                  <h2 className="text-3xl font-black mb-8 dark:text-white tracking-tighter">{form.id ? "Editar Profissional" : "Novo Membro"}</h2>
                  
                  <div className="space-y-5">
                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block tracking-widest">Nome Completo</label>
                          <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white transition-all" placeholder="Ex: Anna Silva" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
                      </div>

                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block tracking-widest">Telefone de Contato</label>
                          <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white transition-all" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/50">
                          <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase ml-2 mb-1 block tracking-widest">Vincular Conta (ID do Clerk)</label>
                          <input className="w-full border-2 border-blue-200 dark:border-gray-700 p-4 rounded-xl bg-white dark:bg-gray-950 outline-none focus:border-blue-500 font-mono text-[11px] font-bold dark:text-white" placeholder="user_2pX..." value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}/>
                          <p className="text-[9px] text-blue-400 mt-2 px-2 font-medium">O funcionário deve te passar este ID no perfil dele para ver a própria agenda.</p>
                      </div>

                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-3 block tracking-widest">Cor de Identificação</label>
                          <div className="flex justify-between px-2">
                              {["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#111827"].map(c => (
                                  <button 
                                    key={c} 
                                    type="button"
                                    onClick={() => setForm({...form, color: c})}
                                    className={`w-9 h-9 rounded-full border-4 transition-all ${form.color === c ? 'border-white ring-2 ring-blue-500 scale-125 z-10' : 'border-transparent opacity-60'}`}
                                    style={{ backgroundColor: c }}
                                  />
                              ))}
                          </div>
                      </div>

                      <button 
                        onClick={salvarProfissional} 
                        disabled={salvando}
                        className="w-full mt-4 bg-blue-600 text-white p-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                          {salvando ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Salvar Dados</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
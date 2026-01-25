"use client";

import { useState, useEffect } from "react";
import { Trash2, UserPlus, Phone, User, X, Save, Pencil } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

// Paleta de cores para escolher
const PALETA_CORES = [
  "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#14b8a6", "#ef4444", "#eab308",
];

export default function Equipe() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", phone: "", photoUrl: "", color: PALETA_CORES[0] });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
        const res = await fetch('/api/painel/profissionais');
        const data = await res.json();
        if (Array.isArray(data)) setProfissionais(data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }

  function abrirCriar() {
      const coresUsadas = profissionais.map(p => p.color);
      const primeiraCorLivre = PALETA_CORES.find(c => !coresUsadas.includes(c)) || PALETA_CORES[0];
      setForm({ id: "", name: "", phone: "", photoUrl: "", color: primeiraCorLivre });
      setIsModalOpen(true);
  }

  function abrirEditar(pro: any) {
      setForm({ id: pro.id, name: pro.name, phone: pro.phone || "", photoUrl: pro.photoUrl || "", color: pro.color || PALETA_CORES[0] });
      setIsModalOpen(true);
  }

  async function salvar() {
    if(!form.name) return alert("Nome é obrigatório");
    setSaving(true);
    try {
        const method = form.id ? 'PUT' : 'POST';
        const res = await fetch('/api/painel/profissionais', { 
            method: method, body: JSON.stringify(form) 
        });
        if (res.ok) { setIsModalOpen(false); carregar(); } 
        else { alert("Erro ao salvar."); }
    } catch (error) { alert("Erro de conexão."); }
    finally { setSaving(false); }
  }

  async function deletar(id: string) {
    if(!confirm("Remover?")) return;
    await fetch('/api/painel/profissionais', { method: 'DELETE', body: JSON.stringify({ id }) });
    setProfissionais(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className={`max-w-6xl mx-auto p-6 ${theme}`}>
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><User size={28} className="text-blue-600" /> Gestão de Equipe</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie quem atende no seu negócio.</p>
        </div>
        <button onClick={abrirCriar} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
            <UserPlus size={20} /> Novo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {profissionais.map(pro => (
            <div key={pro.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 flex flex-col items-center text-center relative group" style={{ borderTop: `4px solid ${pro.color}` }}>
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => abrirEditar(pro)} className="p-1 bg-white dark:bg-gray-700 rounded shadow-sm border dark:border-gray-600"><Pencil size={16} className="text-blue-500"/></button>
                    <button onClick={() => deletar(pro.id)} className="p-1 bg-white dark:bg-gray-700 rounded shadow-sm border dark:border-gray-600"><Trash2 size={16} className="text-red-500"/></button>
                </div>
                <div className="w-20 h-20 mb-3 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-700">
                    {pro.photoUrl ? <img src={pro.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><User className="text-gray-400 dark:text-gray-500"/></div>}
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg" style={{ color: pro.color }}>{pro.name}</h3>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center gap-2"><Phone size={12} /> {pro.phone || "N/A"}</div>
            </div>
        ))}
        {profissionais.length === 0 && !loading && <div className="col-span-3 text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400">Nenhum profissional cadastrado.</div>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl relative text-gray-800 dark:text-white">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4"><X size={24} /></button>
                <h3 className="text-xl font-bold mb-4">{form.id ? "Editar" : "Novo"} Profissional</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase">Nome</label>
                        <input className="w-full border dark:border-gray-600 p-3 rounded-lg mt-1 bg-transparent" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase">Telefone</label>
                        <input className="w-full border dark:border-gray-600 p-3 rounded-lg mt-1 bg-transparent" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase">Foto (URL)</label>
                        <input className="w-full border dark:border-gray-600 p-3 rounded-lg mt-1 bg-transparent" value={form.photoUrl} onChange={e => setForm({...form, photoUrl: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase">Cor da Agenda</label>
                      <div className="flex gap-2 mt-2">
                          {PALETA_CORES.map(cor => {
                              const usada = profissionais.some(p => p.color === cor && p.id !== form.id);
                              return (
                                <button key={cor} disabled={usada} onClick={() => setForm({...form, color: cor})}
                                    className={`w-8 h-8 rounded-full transition-transform border-2 dark:border-gray-700 ${usada ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110'} ${form.color === cor ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800' : ''}`}
                                    style={{ backgroundColor: cor, ringColor: cor }}
                                />
                              )
                          })}
                      </div>
                  </div>
                    <button onClick={salvar} disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2">
                        {saving ? "Salvando..." : <><Save size={18} /> {form.id ? "Atualizar" : "Salvar"}</>}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
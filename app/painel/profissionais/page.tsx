"use client";

import { useState, useEffect } from "react";
import { Trash2, UserPlus, Phone, User, X, Save, Pencil } from "lucide-react";

export default function Equipe() {
  const [loading, setLoading] = useState(true);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  
  // Controle da Janela
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estado do Formulário (agora tem ID para saber se é edição)
  const [form, setForm] = useState({ id: "", name: "", phone: "", photoUrl: "" });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
        const res = await fetch('/api/painel/profissionais');
        const data = await res.json();
        if (Array.isArray(data)) setProfissionais(data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }

  // Abre janela VAZIA para criar
  function abrirCriar() {
      setForm({ id: "", name: "", phone: "", photoUrl: "" });
      setIsModalOpen(true);
  }

  // Abre janela PREENCHIDA para editar
  function abrirEditar(pro: any) {
      setForm({ id: pro.id, name: pro.name, phone: pro.phone || "", photoUrl: pro.photoUrl || "" });
      setIsModalOpen(true);
  }

  async function salvar() {
    if(!form.name) return alert("Nome obrigatório");
    setSaving(true);

    try {
        // Se tem ID, é Edição (PUT). Se não, é Criação (POST).
        const method = form.id ? 'PUT' : 'POST';
        
        const res = await fetch('/api/painel/profissionais', { 
            method: method, 
            body: JSON.stringify(form) 
        });
        
        if (res.ok) {
            setIsModalOpen(false);
            carregar();
            alert(form.id ? "Atualizado!" : "Criado!");
        } else {
            alert("Erro ao salvar.");
        }
    } catch (error) { alert("Erro de conexão."); }
    finally { setSaving(false); }
  }

  async function deletar(id: string) {
    if(!confirm("Remover este profissional?")) return;
    await fetch('/api/painel/profissionais', { method: 'DELETE', body: JSON.stringify({ id }) });
    setProfissionais(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <User size={28} className="text-blue-600" /> Gestão de Equipe
            </h2>
            <p className="text-gray-500 text-sm">Gerencie quem atende no seu negócio.</p>
        </div>
        
        <button onClick={abrirCriar} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition">
            <UserPlus size={20} /> Novo Profissional
        </button>
      </div>

      {loading ? (
          <p className="text-center text-gray-400 py-10">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profissionais.map(pro => (
                <div key={pro.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative group hover:shadow-md transition">
                    
                    {/* Botões de Ação (Aparecem no Hover) */}
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => abrirEditar(pro)} className="text-gray-400 hover:text-blue-600 p-1 bg-white rounded shadow-sm border">
                            <Pencil size={16} />
                        </button>
                        <button onClick={() => deletar(pro.id)} className="text-gray-400 hover:text-red-500 p-1 bg-white rounded shadow-sm border">
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <div className="w-20 h-20 mb-3 rounded-full overflow-hidden border-2 border-gray-100">
                        {pro.photoUrl ? <img src={pro.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><User className="text-gray-400"/></div>}
                    </div>

                    <h3 className="font-bold text-gray-800 text-lg">{pro.name}</h3>
                    <div className="mt-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full flex items-center gap-2">
                        <Phone size={12} /> {pro.phone || "Sem contato"}
                    </div>
                </div>
            ))}
            
            {profissionais.length === 0 && <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">Nenhum profissional cadastrado.</div>}
        </div>
      )}

      {/* JANELA FLUTUANTE (MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in">
            <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl relative animate-in zoom-in-95">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={24} /></button>
                
                <h3 className="text-xl font-bold mb-4">
                    {form.id ? "Editar Profissional" : "Novo Profissional"}
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome</label>
                        <input className="w-full border p-3 rounded-lg mt-1" placeholder="Nome Completo" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Telefone</label>
                        <input className="w-full border p-3 rounded-lg mt-1" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Foto</label>
                        <input className="w-full border p-3 rounded-lg mt-1" placeholder="URL da Imagem" value={form.photoUrl} onChange={e => setForm({...form, photoUrl: e.target.value})} />
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
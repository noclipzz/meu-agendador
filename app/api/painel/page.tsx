"use client";

import { useState, useEffect } from "react";
import { Trash2, UserPlus, Phone, User, X, Save } from "lucide-react";

export default function Equipe() {
  const [loading, setLoading] = useState(true);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // Janela fechada por padrão
  const [saving, setSaving] = useState(false);
  
  const [novo, setNovo] = useState({ name: "", phone: "", photoUrl: "" });

  // Carrega a lista ao abrir
  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
        // ATENÇÃO: Rota corrigida para /api/painel
        const res = await fetch('/api/painel/profissionais');
        const data = await res.json();
        if (Array.isArray(data)) setProfissionais(data);
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  }

  async function adicionar() {
    if(!novo.name) return alert("Nome é obrigatório");
    setSaving(true);

    try {
        const res = await fetch('/api/painel/profissionais', { 
            method: 'POST', 
            body: JSON.stringify(novo) 
        });
        
        if (res.ok) {
            setNovo({ name: "", phone: "", photoUrl: "" }); // Limpa
            setIsModalOpen(false); // Fecha janela
            carregar(); // Atualiza lista
            alert("Profissional adicionado!");
        } else {
            alert("Erro ao salvar no servidor.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    } finally {
        setSaving(false);
    }
  }

  async function deletar(id: string) {
    if(!confirm("Remover este profissional?")) return;
    await fetch('/api/painel/profissionais', { method: 'DELETE', body: JSON.stringify({ id }) });
    setProfissionais(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <User size={28} className="text-blue-600" /> Gestão de Equipe
            </h2>
            <p className="text-gray-500 text-sm">Quem trabalha com você?</p>
        </div>
        
        {/* BOTÃO QUE ABRE A JANELA */}
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition"
        >
            <UserPlus size={20} />
            Novo Profissional
        </button>
      </div>

      {/* LISTA DE CARDS */}
      {loading ? (
          <p className="text-center text-gray-400 py-10">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profissionais.map(pro => (
                <div key={pro.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative group">
                    <button onClick={() => deletar(pro.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button>

                    <div className="w-20 h-20 mb-3 rounded-full overflow-hidden border-2 border-gray-100">
                        {pro.photoUrl ? <img src={pro.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><User className="text-gray-400"/></div>}
                    </div>

                    <h3 className="font-bold text-gray-800">{pro.name}</h3>
                    <p className="text-sm text-gray-500">{pro.phone || "Sem telefone"}</p>
                </div>
            ))}
            {profissionais.length === 0 && <p className="col-span-3 text-center text-gray-400 py-10 border-2 border-dashed rounded-xl">Nenhum profissional ainda.</p>}
        </div>
      )}

      {/* --- JANELA FLUTUANTE (MODAL) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in">
            <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl relative animate-in zoom-in-95">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={24} /></button>
                <h3 className="text-xl font-bold mb-4">Novo Profissional</h3>
                
                <div className="space-y-4">
                    <input className="w-full border p-3 rounded-lg" placeholder="Nome Completo" value={novo.name} onChange={e => setNovo({...novo, name: e.target.value})} />
                    <input className="w-full border p-3 rounded-lg" placeholder="Telefone" value={novo.phone} onChange={e => setNovo({...novo, phone: e.target.value})} />
                    <input className="w-full border p-3 rounded-lg" placeholder="URL da Foto (Opicional)" value={novo.photoUrl} onChange={e => setNovo({...novo, photoUrl: e.target.value})} />
                    
                    <button onClick={adicionar} disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                        {saving ? "Salvando..." : "Salvar"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
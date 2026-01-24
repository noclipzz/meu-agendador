"use client";

import { useState, useEffect } from "react";
import { Trash2, UserPlus, Phone, User, X, Save } from "lucide-react";

export default function Equipe() {
  const [loading, setLoading] = useState(true);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // Controla a janela
  const [saving, setSaving] = useState(false);
  
  const [novo, setNovo] = useState({ name: "", phone: "", photoUrl: "" });

  // Carrega a lista ao abrir
  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
        // ATENÇÃO: Agora aponta para /api/painel
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
            setNovo({ name: "", phone: "", photoUrl: "" }); // Limpa formulário
            setIsModalOpen(false); // Fecha janela
            carregar(); // Atualiza lista
        } else {
            alert("Erro ao salvar.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    } finally {
        setSaving(false);
    }
  }

  async function deletar(id: string) {
    if(!confirm("Tem certeza que deseja remover este profissional?")) return;
    await fetch('/api/painel/profissionais', { method: 'DELETE', body: JSON.stringify({ id }) });
    setProfissionais(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <User size={28} className="text-blue-600" /> Gestão de Equipe
            </h2>
            <p className="text-gray-500 text-sm">Gerencie quem atende no seu negócio.</p>
        </div>
        
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg hover:scale-105"
        >
            <UserPlus size={20} />
            Novo Profissional
        </button>
      </div>

      {/* LISTA DE PROFISSIONAIS (GRID) */}
      {loading ? (
          <p className="text-center text-gray-400 py-10">Carregando equipe...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profissionais.map(pro => (
                <div key={pro.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative group hover:shadow-md transition">
                    
                    {/* Botão de Excluir (Só aparece ao passar o mouse) */}
                    <button 
                        onClick={() => deletar(pro.id)}
                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    >
                        <Trash2 size={18} />
                    </button>

                    {/* Foto */}
                    <div className="w-20 h-20 mb-4 rounded-full overflow-hidden border-4 border-gray-50 shadow-sm">
                        {pro.photoUrl ? (
                            <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-300">
                                <User size={32} />
                            </div>
                        )}
                    </div>

                    {/* Dados */}
                    <h3 className="font-bold text-gray-800 text-lg">{pro.name}</h3>
                    <div className="mt-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full flex items-center gap-2">
                        <Phone size={12} />
                        {pro.phone || "Sem contato"}
                    </div>
                </div>
            ))}

            {!loading && profissionais.length === 0 && (
                <div className="col-span-3 text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-400 mb-4">Nenhum profissional cadastrado.</p>
                    <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-bold hover:underline">
                        Adicionar o primeiro
                    </button>
                </div>
            )}
        </div>
      )}

      {/* --- JANELA FLUTUANTE (MODAL) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200">
                
                {/* Botão Fechar */}
                <button 
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={24} />
                </button>

                <h3 className="text-xl font-bold text-gray-800 mb-6">Adicionar Profissional</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                        <input 
                            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="Ex: Dra. Ana Silva"
                            value={novo.name} 
                            onChange={e => setNovo({...novo, name: e.target.value})} 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Telefone (Privado)</label>
                        <input 
                            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="(00) 00000-0000"
                            value={novo.phone} 
                            onChange={e => setNovo({...novo, phone: e.target.value})} 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Foto (URL da Imagem)</label>
                        <input 
                            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="https://..."
                            value={novo.photoUrl} 
                            onChange={e => setNovo({...novo, photoUrl: e.target.value})} 
                        />
                        <p className="text-xs text-gray-400 mt-1">Dica: Use um link do Google Drive ou LinkedIn.</p>
                    </div>

                    <button 
                        onClick={adicionar}
                        disabled={saving}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 mt-4"
                    >
                        {saving ? "Salvando..." : <><Save size={18} /> Salvar Equipe</>}
                    </button>
                </div>

            </div>
        </div>
      )}

    </div>
  );
}
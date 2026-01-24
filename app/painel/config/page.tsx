"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Save } from "lucide-react";

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  
  // Configs Gerais
  const [logoUrl, setLogoUrl] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState("5000");
  const [idEmpresa, setIdEmpresa] = useState(""); // Novo: Mostra o ID para suporte

  // Serviços
  const [services, setServices] = useState<any[]>([]);
  const [newService, setNewService] = useState({ name: "", price: "", duration: "30" });

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
        const resConfig = await fetch('/api/painel/config');
        const dataConfig = await resConfig.json();
        
        if (dataConfig && dataConfig.id) {
            setIdEmpresa(dataConfig.id);
            setLogoUrl(dataConfig.logoUrl || "");
            setOpenTime(dataConfig.openTime || "09:00");
            setCloseTime(dataConfig.closeTime || "18:00");
            setLunchStart(dataConfig.lunchStart || "12:00");
            setLunchEnd(dataConfig.lunchEnd || "13:00");
            setMonthlyGoal(dataConfig.monthlyGoal || "5000");
            if (dataConfig.workDays) setWorkDays(dataConfig.workDays.split(','));
        }

        const resServ = await fetch('/api/painel/servicos');
        const dataServ = await resServ.json();
        if(Array.isArray(dataServ)) setServices(dataServ);
        
    } catch(e) { console.error(e) } 
    finally { setLoading(false); }
  }

  async function salvarConfig() {
    try {
        const res = await fetch('/api/painel/config', {
            method: 'POST',
            body: JSON.stringify({
                openTime, closeTime, lunchStart, lunchEnd, logoUrl,
                monthlyGoal: parseFloat(monthlyGoal),
                workDays: workDays.join(','),
                interval: 30
            })
        });
        if (res.ok) alert("Configurações salvas com sucesso!");
        else alert("Erro ao salvar.");
    } catch (error) { alert("Erro de conexão."); }
  }

  async function adicionarServico() {
    if(!newService.name || !newService.price) return alert("Preencha o serviço");
    
    try {
        const res = await fetch('/api/painel/servicos', {
            method: 'POST',
            body: JSON.stringify(newService)
        });
        
        if(res.ok) {
            setNewService({ name: "", price: "", duration: "30" });
            carregarTudo();
        } else { alert("Erro ao adicionar serviço."); }
    } catch (error) { alert("Erro de conexão."); }
  }

  async function deletarServico(id: string) {
    if(!confirm("Apagar serviço?")) return;
    await fetch('/api/painel/servicos', { method: 'DELETE', body: JSON.stringify({ id }) });
    carregarTudo();
  }

  const toggleDay = (day: string) => {
    if (workDays.includes(day)) setWorkDays(workDays.filter(d => d !== day));
    else setWorkDays([...workDays, day]);
  }

  const diasSemana = [ { id: "0", label: "Dom" }, { id: "1", label: "Seg" }, { id: "2", label: "Ter" }, { id: "3", label: "Qua" }, { id: "4", label: "Qui" }, { id: "5", label: "Sex" }, { id: "6", label: "Sáb" } ];

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando configurações...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* ID DE SUPORTE */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center text-sm">
        <span className="text-blue-800 font-bold">ID para Suporte Técnico:</span>
        <code className="bg-white px-2 py-1 rounded border text-gray-600 font-mono select-all">{idEmpresa}</code>
      </div>

      {/* BLOCO 1: DADOS DO NEGÓCIO */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">⚙️ Dados do Negócio</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Logo URL</label>
                <input type="text" className="border p-2 rounded w-full text-sm" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Meta Mensal (R$)</label>
                <input type="number" className="border p-2 rounded w-full text-sm" value={monthlyGoal} onChange={e => setMonthlyGoal(e.target.value)} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Abre às</label>
                <input type="time" className="border p-2 rounded w-full text-sm" value={openTime} onChange={e => setOpenTime(e.target.value)} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha às</label>
                <input type="time" className="border p-2 rounded w-full text-sm" value={closeTime} onChange={e => setCloseTime(e.target.value)} />
            </div>
            
            {/* Bloco de Almoço */}
            <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Horário de Almoço (Bloqueio)</p>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">Início</label>
                        <input type="time" className="border p-2 rounded w-full text-sm bg-white" value={lunchStart} onChange={e => setLunchStart(e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">Fim</label>
                        <input type="time" className="border p-2 rounded w-full text-sm bg-white" value={lunchEnd} onChange={e => setLunchEnd(e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
        
        <div className="mt-6">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Dias de Funcionamento</label>
            <div className="flex gap-2 flex-wrap">
                {diasSemana.map(dia => (
                    <button key={dia.id} onClick={() => toggleDay(dia.id)} 
                        className={`w-10 h-10 rounded-full font-bold text-xs border transition ${workDays.includes(dia.id) ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                        {dia.label}
                    </button>
                ))}
            </div>
        </div>
        
        <button onClick={salvarConfig} className="mt-8 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-bold flex items-center gap-2 shadow-lg transition transform hover:scale-[1.02]">
            <Save size={18} /> Salvar Alterações
        </button>
      </div>

      {/* BLOCO 2: SERVIÇOS */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">✂️ Meus Serviços</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Nome do Serviço</label>
                <input placeholder="Ex: Clareamento" className="border p-2 rounded w-full text-sm" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
            </div>
            <div className="w-24">
                <label className="text-xs text-gray-400 mb-1 block">Preço (R$)</label>
                <input type="number" placeholder="0.00" className="border p-2 rounded w-full text-sm" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} />
            </div>
            <div className="w-32">
                <label className="text-xs text-gray-400 mb-1 block">Duração</label>
                <select className="border p-2 rounded w-full text-sm bg-white" value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})}>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30m</option>
                </select>
            </div>
            <div className="flex items-end">
                <button onClick={adicionarServico} className="bg-green-600 text-white px-4 py-2 rounded h-[38px] flex items-center gap-2 hover:bg-green-700 font-bold shadow-sm transition">
                    <Plus size={18} /> Adicionar
                </button>
            </div>
        </div>

        <div className="space-y-3">
            {services.map(serv => (
                <div key={serv.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition bg-white shadow-sm">
                    <div>
                        <h3 className="font-bold text-gray-800">{serv.name}</h3>
                        <p className="text-xs text-gray-500 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">⏱ {serv.duration} min</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">R$ {serv.price}</span>
                        <button onClick={() => deletarServico(serv.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
            {services.length === 0 && <p className="text-center text-gray-400 py-4 italic">Nenhum serviço cadastrado.</p>}
        </div>
      </div>
    </div>
  );
}
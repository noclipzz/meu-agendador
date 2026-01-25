"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Save, Loader2, UploadCloud, Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme"; // Importa o cérebro do tema

export default function Configuracoes() {
  const { theme, toggleTheme } = useTheme(); // Pega o tema e a função de troca
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);
  
  // Estados do Formulário
  const [logoUrl, setLogoUrl] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState("5000");
  const [idEmpresa, setIdEmpresa] = useState("");

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

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!inputFileRef.current?.files) return;
    const file = inputFileRef.current.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      const newBlob = await response.json();
      setLogoUrl(newBlob.url);
    } catch (error) {
      alert("Erro no upload.");
    } finally { setIsUploading(false); }
  }

  async function salvarConfig() {
    try {
        const res = await fetch('/api/painel/config', {
            method: 'POST',
            body: JSON.stringify({
                openTime, closeTime, lunchStart, lunchEnd, logoUrl,
                monthlyGoal: parseFloat(monthlyGoal),
                workDays: workDays.join(','),
            })
        });
        if (res.ok) alert("Configurações salvas!");
        else alert("Erro ao salvar.");
    } catch (error) { alert("Erro de conexão."); }
  }

  async function adicionarServico() {
    if(!newService.name || !newService.price) return;
    const res = await fetch('/api/painel/servicos', {
        method: 'POST', body: JSON.stringify(newService)
    });
    if(res.ok) { setNewService({ name: "", price: "", duration: "30" }); carregarTudo(); }
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

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      <div className="bg-white dark:bg-gray-800/50 p-8 rounded-xl shadow-sm border dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">⚙️ Dados do Negócio</h2>
        
        <div className="mb-8 border-b dark:border-gray-700 pb-8">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 block">Logo</label>
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full border dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <UploadCloud className="text-gray-400 dark:text-gray-600" size={32} />}
                </div>
                <div>
                    <input type="file" accept="image/*" ref={inputFileRef} onChange={handleLogoUpload} className="hidden" />
                    <button onClick={() => inputFileRef.current?.click()} disabled={isUploading} className="bg-gray-800 dark:bg-gray-700 text-white px-5 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-black dark:hover:bg-gray-600 transition text-sm">
                        {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />} {isUploading ? "Enviando..." : "Trocar Imagem"}
                    </button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Meta (R$)</label>
                <input type="number" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-900" value={monthlyGoal} onChange={e => setMonthlyGoal(e.target.value)} />
            </div>
            <div></div>
            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Abre às</label>
                <input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-900" value={openTime} onChange={e => setOpenTime(e.target.value)} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Fecha às</label>
                <input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-900" value={closeTime} onChange={e => setCloseTime(e.target.value)} />
            </div>
            <div className="col-span-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Pausa</p>
                <div className="flex gap-4">
                    <div className="flex-1"><label className="text-xs text-gray-400 mb-1 block">Início</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={lunchStart} onChange={e => setLunchStart(e.target.value)} /></div>
                    <div className="flex-1"><label className="text-xs text-gray-400 mb-1 block">Fim</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={lunchEnd} onChange={e => setLunchEnd(e.target.value)} /></div>
                </div>
            </div>
        </div>
        
        <div className="mt-6">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Dias</label>
            <div className="flex gap-2 flex-wrap">{diasSemana.map(dia => (<button key={dia.id} onClick={() => toggleDay(dia.id)} className={`w-10 h-10 rounded-full font-bold text-xs border transition ${workDays.includes(dia.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}>{dia.label}</button>))}</div>
        </div>
        
        <div className="border-t dark:border-gray-700 pt-8 mt-8">
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">Tema</h3>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700">
                <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="text-blue-400"/> : <Sun className="text-yellow-500"/>}
                    <div>
                        <p className="font-bold text-gray-800 dark:text-gray-100">Modo Noturno</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Mude a aparência do seu painel.</p>
                    </div>
                </div>
                <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
            </div>
        </div>

        <button onClick={salvarConfig} className="mt-8 bg-black dark:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2">
            <Save size={18} /> Salvar Alterações
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800/50 p-8 rounded-xl shadow-sm border dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">✂️ Meus Serviços</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700">
            <div className="flex-1"><label className="text-xs text-gray-400 mb-1 block">Nome</label><input placeholder="Ex: Clareamento" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} /></div>
            <div className="w-24"><label className="text-xs text-gray-400 mb-1 block">Preço</label><input type="number" placeholder="0.00" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} /></div>
            <div className="w-32"><label className="text-xs text-gray-400 mb-1 block">Duração</label><select className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option></select></div>
            <div className="flex items-end"><button onClick={adicionarServico} className="bg-green-600 text-white px-4 py-2 rounded h-[38px] flex items-center gap-2 font-bold"><Plus size={18} /> Add</button></div>
        </div>
        <div className="space-y-3">
            {services.map(serv => (
                <div key={serv.id} className="flex justify-between items-center p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900/50 shadow-sm">
                    <div><h3 className="font-bold text-gray-800 dark:text-gray-100">{serv.name}</h3><p className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 inline-block px-2 py-0.5 rounded mt-1">⏱ {serv.duration} min</p></div>
                    <div className="flex items-center gap-4"><span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/50 dark:text-blue-300 px-3 py-1 rounded-md border dark:border-blue-200 dark:border-blue-800">R$ {serv.price}</span><button onClick={() => deletarServico(serv.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><Trash2 size={18} /></button></div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
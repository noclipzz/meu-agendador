"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Save, Loader2, UploadCloud, Moon, Sun, Pencil, X, MessageSquare } from "lucide-react"; 
import { useTheme } from "../../../hooks/useTheme";
import { toast } from "sonner";
import { useAgenda } from "../../../contexts/AgendaContext";

export default function Configuracoes() {
  const { theme, toggleTheme } = useTheme();
  const context = useAgenda(); // Pegando o contexto de forma segura
  
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);
  
  // Configs Gerais
  const [logoUrl, setLogoUrl] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [interval, setInterval] = useState(30);
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState("5000");
  const [idEmpresa, setIdEmpresa] = useState("");
  
  const [whatsappMessage, setWhatsappMessage] = useState("Olá {nome}, seu agendamento está confirmado para {dia} às {hora}.");
  const [modalWhatsappOpen, setModalWhatsappOpen] = useState(false);

  // Serviços
  const [services, setServices] = useState<any[]>([]);
  const [serviceForm, setServiceForm] = useState({ id: "", name: "", price: "", duration: "30" });

  useEffect(() => { carregarTudo(); }, []);

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
            setInterval(dataConfig.interval || 30);
            setMonthlyGoal(dataConfig.monthlyGoal || "5000");
            if (dataConfig.workDays) setWorkDays(dataConfig.workDays.split(','));
            if (dataConfig.whatsappMessage) setWhatsappMessage(dataConfig.whatsappMessage);
        }
        const resServ = await fetch('/api/painel/servicos');
        const dataServ = await resServ.json();
        if(Array.isArray(dataServ)) setServices(dataServ);
    } catch(e) { console.error(e) } 
    finally { setLoading(false); }
  }

  async function handleLogoUpload() {
    if (!inputFileRef.current?.files?.[0]) return;
    const file = inputFileRef.current.files[0];
    setIsUploading(true);
    
    try {
      // Enviamos o arquivo diretamente
      const response = await fetch(`/api/upload?filename=${file.name}`, { 
        method: 'POST', 
        body: file 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro no servidor");
      }
      
      const newBlob = await response.json();
      setLogoUrl(newBlob.url);
      
      // Proteção para não quebrar se o context falhar
      if (typeof setRefreshKey === 'function') {
        setRefreshKey((prev: number) => prev + 1);
      }
      
      toast.success("Imagem carregada com sucesso!");
    } catch (error) { 
      console.error(error);
      toast.error("Falha no upload. Verifique o terminal do VS Code para detalhes."); 
    } 
    finally { setIsUploading(false); }
  }

  async function salvarConfig() {
    try {
        const res = await fetch('/api/painel/config', {
            method: 'POST',
            body: JSON.stringify({
                openTime, 
                closeTime, 
                lunchStart, 
                lunchEnd, 
                logoUrl,
                monthlyGoal: parseFloat(monthlyGoal),
                workDays: workDays.join(','),
                interval: Number(interval),
                whatsappMessage 
            })
        });
        
        if (res.ok) {
            toast.success("Configurações salvas!");
            if (context?.setRefreshKey) context.setRefreshKey((prev: number) => prev + 1);
        } else {
            toast.error("Erro ao salvar. Verifique se o banco de dados está atualizado.");
        }
    } catch (error) {
        toast.error("Erro de conexão.");
    }
  }

  async function salvarMensagemWhatsapp() {
      await salvarConfig();
      setModalWhatsappOpen(false);
  }

  function prepararEdicao(servico: any) {
    setServiceForm({ 
        id: servico.id, 
        name: servico.name, 
        price: servico.price, 
        duration: String(servico.duration) 
    });
    toast.info(`Editando: ${servico.name}`);
  }

  async function salvarServico() {
    if(!serviceForm.name || !serviceForm.price) return toast.warning("Preencha nome e preço.");
    const method = serviceForm.id ? 'PUT' : 'POST';
    try {
        const res = await fetch('/api/painel/servicos', {
            method: method, body: JSON.stringify(serviceForm)
        });
        if(res.ok) { 
            setServiceForm({ id: "", name: "", price: "", duration: "30" }); 
            carregarTudo(); 
            toast.success("Serviço salvo!");
        } else {
            toast.error("Erro ao salvar serviço.");
        }
    } catch (e) { toast.error("Erro de conexão."); }
  }

  async function deletarServico(id: string, nome: string) {
    toast(`Excluir o serviço "${nome}"?`, {
        action: {
            label: "Excluir",
            onClick: async () => {
                const res = await fetch('/api/painel/servicos', { method: 'DELETE', body: JSON.stringify({ id }) });
                if (res.ok) {
                    setServices(prev => prev.filter(s => s.id !== id));
                    toast.success("Serviço excluído.");
                } else {
                    toast.error("Erro ao excluir.");
                }
            }
        },
        cancel: { label: "Cancelar" }
    });
  }

  const toggleDay = (day: string) => {
    if (workDays.includes(day)) setWorkDays(workDays.filter(d => d !== day));
    else setWorkDays([...workDays, day]);
  }

  const diasSemana = [ { id: "0", label: "Dom" }, { id: "1", label: "Seg" }, { id: "2", label: "Ter" }, { id: "3", label: "Qua" }, { id: "4", label: "Qui" }, { id: "5", label: "Sex" }, { id: "6", label: "Sáb" } ];

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center text-sm">
        <span className="text-blue-800 font-bold">ID para Suporte Técnico:</span>
        <code className="bg-white px-2 py-1 rounded border text-gray-600 font-mono select-all">{idEmpresa}</code>
      </div>

      <div className="bg-white dark:bg-gray-800/50 p-8 rounded-xl shadow-sm border dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">⚙️ Dados do Negócio</h2>
        
        <div className="mb-8 border-b dark:border-gray-700 pb-8">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 block">Logo da Empresa</label>
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full border dark:border-gray-700 flex items-center justify-center overflow-hidden shadow-inner">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <UploadCloud className="text-gray-400 dark:text-gray-600" size={32} />}
                </div>
                <div>
                    <input type="file" accept="image/*" ref={inputFileRef} onChange={handleLogoUpload} className="hidden" />
                    <button onClick={() => inputFileRef.current?.click()} disabled={isUploading} className="bg-gray-800 dark:bg-gray-700 text-white px-5 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-black dark:hover:bg-gray-600 transition text-sm shadow-md">
                        {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />} {isUploading ? "Enviando..." : "Trocar Imagem"}
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Recomendado: 200x200 pixels.</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Meta Mensal (R$)</label><input type="number" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-900" value={monthlyGoal} onChange={e => setMonthlyGoal(e.target.value)} /></div>
            <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Tempo Atendimento</label><select className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-900" value={interval} onChange={e => setInterval(Number(e.target.value))}><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hora</option></select></div>
            <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Abre às</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-900" value={openTime} onChange={e => setOpenTime(e.target.value)} /></div>
            <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Fecha às</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-900" value={closeTime} onChange={e => setCloseTime(e.target.value)} /></div>
            <div className="col-span-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700"><p className="text-xs font-bold text-gray-500 uppercase mb-3">Horário de Pausa (Almoço)</p><div className="flex gap-4"><div className="flex-1"><label className="text-xs text-gray-400 mb-1 block">Início</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={lunchStart} onChange={e => setLunchStart(e.target.value)} /></div><div className="flex-1"><label className="text-xs text-gray-400 mb-1 block">Fim</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={lunchEnd} onChange={e => setLunchEnd(e.target.value)} /></div></div></div>
        </div>
        
        <div className="mt-6"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Dias de Funcionamento</label><div className="flex gap-2 flex-wrap">{diasSemana.map(dia => (<button key={dia.id} onClick={() => toggleDay(dia.id)} className={`w-10 h-10 rounded-full font-bold text-xs border transition ${workDays.includes(dia.id) ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105" : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}>{dia.label}</button>))}</div></div>
        
        <div className="mt-8 border-t dark:border-gray-700 pt-6 flex items-center justify-between">
            <div>
                 <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                     <MessageSquare size={16} className="text-green-600"/> Mensagem do WhatsApp
                 </h3>
                 <p className="text-xs text-gray-500">Personalize o texto automático.</p>
            </div>
            <button 
                onClick={() => setModalWhatsappOpen(true)}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
                Editar lembrete automático
            </button>
        </div>

        <div className="border-t dark:border-gray-700 pt-6 mt-6 flex items-center justify-between"><div className="flex items-center gap-3"><Moon className="text-gray-500"/><div><p className="font-bold text-gray-800 dark:text-gray-100">Modo Noturno</p><p className="text-xs text-gray-500 dark:text-gray-400">Aparência escura.</p></div></div><button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}/></button></div>

        <button onClick={salvarConfig} className="mt-8 bg-black dark:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:scale-[1.02] transition"><Save size={18} /> Salvar Alterações</button>
      </div>

      {/* BLOCO 2: SERVIÇOS */}
      <div className="bg-white dark:bg-gray-800/50 p-8 rounded-xl shadow-sm border dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">✂️ Meus Serviços</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700 items-end">
            <div className="flex-1 w-full"><label className="text-xs text-gray-400 mb-1 block">Nome</label><input placeholder="Ex: Clareamento" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} /></div>
            <div className="w-24"><label className="text-xs text-gray-400 mb-1 block">Preço</label><input type="number" placeholder="0.00" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} /></div>
            <div className="w-32"><label className="text-xs text-gray-400 mb-1 block">Duração</label><select className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800" value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration: e.target.value})}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option></select></div>
            
            <button onClick={salvarServico} className={`text-white px-4 py-2 rounded h-[38px] flex items-center gap-2 font-bold shadow-sm transition ${serviceForm.id ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}>
                {serviceForm.id ? <Save size={18}/> : <Plus size={18}/>} {serviceForm.id ? "Atualizar" : "Add"}
            </button>
            
            {serviceForm.id && (
                <button onClick={() => setServiceForm({ id: "", name: "", price: "", duration: "30" })} className="text-gray-400 hover:text-gray-600 p-2 h-[38px] flex items-center justify-center">
                    <X size={20}/>
                </button>
            )}
        </div>

        <div className="space-y-3">
            {services.map(serv => (
                <div key={serv.id} className="flex justify-between items-center p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900/50 shadow-sm group">
                    <div><h3 className="font-bold text-gray-800 dark:text-gray-100">{serv.name}</h3><p className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 inline-block px-2 py-0.5 rounded mt-1">⏱ {serv.duration} min</p></div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/50 dark:text-blue-300 px-3 py-1 rounded-md border dark:border-blue-200 dark:border-blue-800 mr-2">R$ {serv.price}</span>
                        <button onClick={() => prepararEdicao(serv)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition"><Pencil size={18} /></button>
                        <button onClick={() => deletarServico(serv.id, serv.name)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
        </div>
      </div>

       {modalWhatsappOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl w-full max-w-md border dark:border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><MessageSquare size={20} className="text-green-500"/> Editar Mensagem</h2>
                        <button onClick={() => setModalWhatsappOpen(false)}><X className="text-gray-400 hover:text-red-500"/></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <textarea 
                                rows={5}
                                className="w-full mt-2 p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 ring-blue-500 outline-none resize-none dark:text-gray-200"
                                value={whatsappMessage}
                                onChange={(e) => setWhatsappMessage(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setModalWhatsappOpen(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-2 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                Cancelar
                            </button>
                            <button onClick={salvarMensagemWhatsapp} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Save, Loader2, UploadCloud, Moon, Sun, Pencil, X, MessageSquare, Building2, Mail, Clock, Instagram, Facebook, Percent } from "lucide-react"; 
import { useTheme } from "../../../hooks/useTheme";
import { toast } from "sonner";
// CORREÇÃO DEFINITIVA DO CAMINHO:
import { useAgenda } from "../../../contexts/AgendaContext"; 

export default function Configuracoes() {
  const { theme, toggleTheme } = useTheme();
  const context = useAgenda(); 
  
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);
  
  // --- CAMPOS GERAIS ---
  const [name, setName] = useState(""); 
  const [notificationEmail, setNotificationEmail] = useState(""); 
  const [instagramUrl, setInstagramUrl] = useState(""); 
  const [facebookUrl, setFacebookUrl] = useState("");   
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

  // Serviços - Estado atualizado com 'commission'
  const [services, setServices] = useState<any[]>([]);
  const [serviceForm, setServiceForm] = useState({ 
    id: "", 
    name: "", 
    price: "", 
    duration: "30", 
    commission: "0" // ADICIONADO
  });

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    try {
        const resConfig = await fetch('/api/painel/config');
        const dataConfig = await resConfig.json();
        if (dataConfig && dataConfig.id) {
            setIdEmpresa(dataConfig.id);
            setName(dataConfig.name || ""); 
            setNotificationEmail(dataConfig.notificationEmail || "");
            setInstagramUrl(dataConfig.instagramUrl || ""); 
            setFacebookUrl(dataConfig.facebookUrl || "");   
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
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) throw new Error("Falha no servidor");
      const newBlob = await response.json();
      setLogoUrl(newBlob.url);
      toast.success("Imagem carregada com sucesso!");
    } catch (error) { 
      console.error(error);
      toast.error("Falha no upload."); 
    } 
    finally { setIsUploading(false); }
  }

  async function salvarConfig() {
    try {
        const res = await fetch('/api/painel/config', {
            method: 'POST',
            body: JSON.stringify({
                name, notificationEmail, instagramUrl, facebookUrl, openTime, closeTime, lunchStart, lunchEnd, logoUrl,
                monthlyGoal: parseFloat(monthlyGoal), workDays: workDays.join(','), interval: Number(interval), whatsappMessage 
            })
        });
        
        if (res.ok) {
            toast.success("Configurações salvas!");
            if (context && typeof context.setRefreshKey === 'function') {
                context.setRefreshKey((prev: number) => prev + 1);
            }
        } else {
            toast.error("Erro ao salvar. Verifique o banco de dados.");
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
        duration: String(servico.duration),
        commission: String(servico.commission || '0') // CARREGA A COMISSÃO
    });
    toast.info(`Editando: ${servico.name}`);
  }

  async function salvarServico() {
    if(!serviceForm.name || !serviceForm.price) return toast.warning("Preencha nome e preço.");
    const method = serviceForm.id ? 'PUT' : 'POST';
    try {
        const res = await fetch('/api/painel/servicos', { 
            method: method, 
            body: JSON.stringify(serviceForm) 
        });
        
        if(res.ok) { 
            setServiceForm({ id: "", name: "", price: "", duration: "30", commission: "0" }); 
            carregarTudo(); 
            toast.success("Serviço salvo!");
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 font-sans">
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center text-sm dark:bg-gray-900/50 dark:border-gray-700">
        <span className="text-blue-800 font-bold dark:text-blue-200 uppercase text-[10px] tracking-widest">ID para Suporte Técnico:</span>
        <code className="bg-white px-2 py-1 rounded border text-gray-600 font-mono select-all dark:bg-gray-800 dark:text-gray-300 text-xs">{idEmpresa}</code>
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
            <Building2 className="text-blue-500"/> Dados do Negócio
        </h2>
        
        <div className="mb-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Nome da Empresa</label>
                    <input 
                        className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" 
                        placeholder="Ex: Minha Barbearia" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                        <Mail size={14}/> E-mail para Avisos
                    </label>
                    <input 
                        type="email"
                        className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" 
                        placeholder="exemplo@gmail.com"
                        value={notificationEmail} 
                        onChange={e => setNotificationEmail(e.target.value)} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                        <Instagram size={14} className="text-pink-500"/> Link do Instagram
                    </label>
                    <input 
                        className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" 
                        placeholder="https://instagram.com/seu-perfil" 
                        value={instagramUrl} 
                        onChange={e => setInstagramUrl(e.target.value)} 
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1 dark:text-gray-400">
                        <Facebook size={14} className="text-blue-600"/> Link do Facebook
                    </label>
                    <input 
                        className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" 
                        placeholder="https://facebook.com/suapagina" 
                        value={facebookUrl} 
                        onChange={e => setFacebookUrl(e.target.value)} 
                    />
                </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-6">
                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block dark:text-gray-400">Logo da Empresa</label>
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full border dark:border-gray-700 flex items-center justify-center overflow-hidden shadow-inner">
                        {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <UploadCloud className="text-gray-400" size={32} />}
                    </div>
                    <div>
                        <input type="file" accept="image/*" ref={inputFileRef} onChange={handleLogoUpload} className="hidden" />
                        <button onClick={() => inputFileRef.current?.click()} disabled={isUploading} className="bg-gray-800 text-white px-5 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition text-sm shadow-md dark:bg-gray-700 dark:hover:bg-gray-600">
                            {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />} {isUploading ? "Enviando..." : "Trocar Imagem"}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t dark:border-gray-700">
            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Meta Mensal (R$)</label><input type="number" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={monthlyGoal} onChange={e => setMonthlyGoal(e.target.value)} /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Tempo Atendimento Padrão</label><select className="border dark:border-gray-700 p-4 rounded-2xl w-full text-sm bg-white dark:bg-gray-800 font-bold dark:text-white" value={interval} onChange={e => setInterval(Number(e.target.value))}><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hora</option></select></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Abre às</label><input type="time" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={openTime} onChange={e => setOpenTime(e.target.value)} /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block dark:text-gray-400">Fecha às</label><input type="time" className="border dark:border-gray-700 p-4 rounded-2xl w-full bg-white dark:bg-gray-800 font-bold dark:text-white" value={closeTime} onChange={e => setCloseTime(e.target.value)} /></div>
            <div className="col-span-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700"><p className="text-xs font-bold text-gray-500 uppercase mb-3 dark:text-gray-400">Horário de Pausa (Almoço)</p><div className="flex gap-4"><div className="flex-1"><label className="text-xs text-gray-400 mb-1 block dark:text-gray-300">Início</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800 dark:text-white" value={lunchStart} onChange={e => setLunchStart(e.target.value)} /></div><div className="flex-1"><label className="text-xs text-gray-400 mb-1 block dark:text-gray-300">Fim</label><input type="time" className="border dark:border-gray-700 p-2 rounded w-full text-sm bg-white dark:bg-gray-800 dark:text-white" value={lunchEnd} onChange={e => setLunchEnd(e.target.value)} /></div></div></div>
        </div>
        
        <div className="mt-6"><label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Dias de Funcionamento</label><div className="flex gap-2 flex-wrap">{diasSemana.map(dia => (<button key={dia.id} onClick={() => toggleDay(dia.id)} className={`w-10 h-10 rounded-full font-bold text-xs border transition ${workDays.includes(dia.id) ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105" : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 dark:text-gray-300"}`}>{dia.label}</button>))}</div></div>
        
        <div className="mt-8 border-t dark:border-gray-700 pt-6 flex items-center justify-between">
            <div>
                 <h3 className="font-bold text-sm text-gray-800 dark:text-white">Mensagem do WhatsApp</h3>
                 <p className="text-xs text-gray-500 uppercase font-bold text-[10px] dark:text-gray-400">Personalize o texto automático.</p>
            </div>
            <button onClick={() => setModalWhatsappOpen(true)} className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 transition dark:hover:bg-gray-700 dark:text-gray-200 uppercase tracking-widest">Editar lembrete automático</button>
        </div>

        <div className="border-t dark:border-gray-700 pt-6 mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Moon className="text-gray-500 dark:text-gray-400"/>
                <div><p className="font-bold text-gray-800 dark:text-white uppercase text-sm tracking-widest">Modo Noturno</p></div>
            </div>
            <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}/></button>
        </div>

        <button onClick={salvarConfig} className="mt-8 bg-black dark:bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition active:scale-95 flex items-center justify-center gap-2"><Save size={18} /> Salvar Alterações</button>
      </div>

      {/* BLOCO 2: SERVIÇOS (REFORMULADO) */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">✂️ Meus Serviços</h2>
        <div className="flex flex-wrap md:flex-nowrap gap-4 mb-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl border dark:border-gray-700 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nome do Serviço</label>
                <input placeholder="Ex: Clareamento" className="border dark:border-gray-700 p-4 rounded-2xl w-full text-sm bg-white dark:bg-gray-900 font-bold dark:text-white" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
            </div>
            <div className="w-24">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Preço</label>
                <input type="number" placeholder="0.00" className="border dark:border-gray-700 p-4 rounded-2xl w-full text-sm bg-white dark:bg-gray-900 font-bold dark:text-white" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} />
            </div>
            
            <div className="w-32">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Duração</label>
                <select className="border dark:border-gray-700 p-4 rounded-2xl w-full text-sm bg-white dark:bg-gray-900 font-bold dark:text-white" value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration: e.target.value})}>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30m</option>
                    <option value="120">2 horas</option>
                </select>
            </div>

            {/* NOVO CAMPO: COMISSÃO (%) */}
            <div className="w-24">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block flex items-center gap-1"><Percent size={10}/> Comis.</label>
                <input type="number" placeholder="0" className="border dark:border-gray-700 p-4 rounded-2xl w-full text-sm bg-white dark:bg-gray-900 font-bold dark:text-white" value={serviceForm.commission} onChange={e => setServiceForm({...serviceForm, commission: e.target.value})} />
            </div>

            <button onClick={salvarServico} className={`text-white px-6 py-4 rounded-2xl h-[56px] flex items-center gap-2 font-black shadow-sm transition ${serviceForm.id ? 'bg-yellow-500' : 'bg-green-600 hover:bg-green-700'}`}>
                {serviceForm.id ? <Save size={18}/> : <Plus size={18}/>} {serviceForm.id ? "Salvar" : "Add"}
            </button>
            {serviceForm.id && <button onClick={() => setServiceForm({ id: "", name: "", price: "", duration: "30", commission: "0" })} className="text-gray-400 p-2 h-[56px] dark:hover:text-white transition"><X size={24}/></button>}
        </div>

        <div className="space-y-3">
            {services.map(serv => (
                <div key={serv.id} className="flex justify-between items-center p-5 border dark:border-gray-700 rounded-[2rem] bg-white dark:bg-gray-800 shadow-sm group hover:border-blue-500 transition-all">
                    <div>
                        <h3 className="font-black text-gray-800 dark:text-white text-lg">{serv.name}</h3>
                        <div className="flex gap-3 mt-1">
                            <p className="text-[10px] text-gray-400 flex items-center gap-1 font-black uppercase tracking-widest"><Clock size={12}/> {serv.duration} min</p>
                            <p className="text-[10px] text-blue-500 flex items-center gap-1 font-black uppercase tracking-widest"><Percent size={12}/> {serv.commission || 0}% Comis.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-blue-600 mr-4 dark:text-blue-400">R$ {serv.price}</span>
                        <button onClick={() => prepararEdicao(serv)} className="text-gray-400 hover:text-blue-600 transition p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl"><Pencil size={18} /></button>
                        <button onClick={() => deletarServico(serv.id, serv.name)} className="text-gray-400 hover:text-red-600 transition p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
        </div>
      </div>

       {modalWhatsappOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] w-full max-w-md border dark:border-gray-800 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black flex items-center gap-2 dark:text-white"><MessageSquare size={20} className="text-green-500"/> Editar Mensagem</h2>
                        <button onClick={() => setModalWhatsappOpen(false)} className="text-gray-400 hover:text-red-500 transition"><X size={24}/></button>
                    </div>
                    <textarea rows={6} className="w-full mt-2 p-4 rounded-2xl border dark:border-gray-700 dark:bg-gray-950 dark:text-white text-sm outline-none focus:ring-2 ring-blue-500 resize-none font-medium" value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button onClick={() => setModalWhatsappOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl font-black uppercase text-xs text-gray-500 dark:text-gray-300">Cancelar</button>
                        <button onClick={salvarMensagemWhatsapp} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs">Confirmar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
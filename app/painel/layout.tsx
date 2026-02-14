"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import {
    Calendar, Settings, Users, PlusCircle, X, Loader2, User as UserIcon,
    Search, Check, MapPin, Trash2, BarChart3, Package, Briefcase,
    LayoutDashboard, ClipboardList, Menu, ShieldCheck, AlertTriangle
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { AgendaProvider, useAgenda } from "../../contexts/AgendaContext";
import { LogoNohud } from "../components/LogoNohud";
import { toast } from "sonner";
import { isBefore, subMinutes, addMinutes, areIntervalsOverlapping } from "date-fns";

// --- HELPER: MÁSCARA DE TELEFONE ---
const formatarTelefoneInput = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
};

function PainelConteudo({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    const { user, isLoaded } = useUser();
    const pathname = usePathname();
    const router = useRouter();
    const { refreshAgenda, companyId, setCompanyId } = useAgenda();

    const [verificando, setVerificando] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [userRole, setUserRole] = useState<"ADMIN" | "PROFESSIONAL">("PROFESSIONAL");
    const [userPlan, setUserPlan] = useState<string | null>(null);
    const [userPermissions, setUserPermissions] = useState<any>(null); // Novo: Permissões granulares
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Novo: Sidebar mobile
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [termoBusca, setTermoBusca] = useState("");
    const [salvando, setSalvando] = useState(false);

    const [tipoAgendamento, setTipoAgendamento] = useState<"CLIENTE" | "EVENTO">("CLIENTE");

    const [services, setServices] = useState<any[]>([]);
    const [profissionais, setProfissionais] = useState<any[]>([]);
    const [clientesCadastrados, setClientesCadastrados] = useState<any[]>([]);

    const [novo, setNovo] = useState({
        clientId: "",
        nome: "",
        phone: "",
        local: "",
        date: new Date().toISOString().split('T')[0],
        time: "",
        serviceId: "",
        professionalId: ""
    });

    useEffect(() => {
        setNovo({
            clientId: "",
            nome: "",
            phone: "",
            local: "",
            date: new Date().toISOString().split('T')[0],
            time: "",
            serviceId: "",
            professionalId: ""
        });
    }, [tipoAgendamento]);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isLoaded || !user || !refreshAgenda) return;

        async function verificarStatus() {
            try {
                // 1. O SUPER CHECK traz tudo: Status de Pagamento, Plano, Role e CompanyID
                let res = await fetch('/api/checkout');
                let dados = await res.json();

                const acabouDePagar = window.location.search.includes('success=true');
                const autoSync = window.location.search.includes('autoSync=true');

                console.log("🔍 [DEBUG] URL params:", { acabouDePagar, autoSync, active: dados.active, role: dados.role });

                // 🚀 SE TEM autoSync=true, tenta sincronizar automaticamente
                if (autoSync && !dados.active && dados.role === "ADMIN") {
                    console.log("🔄 [AUTO-SYNC] Detectado autoSync=true, tentando ativar assinatura automaticamente...");

                    // Tenta sync automático
                    try {
                        const syncRes = await fetch('/api/sync-subscription', { method: 'POST' });
                        const syncData = await syncRes.json();

                        console.log("📊 [AUTO-SYNC] Resposta da API:", syncData);

                        if (syncData.success) {
                            console.log("✅ [AUTO-SYNC] Assinatura ativada automaticamente!");
                            toast.success("Assinatura ativada com sucesso! 🎉");

                            // Recarrega a página sem o autoSync
                            window.history.replaceState({}, '', '/painel/dashboard');
                            window.location.reload();
                            return;
                        } else {
                            console.warn("⚠️ [AUTO-SYNC] API retornou success=false:", syncData);
                        }
                    } catch (e) {
                        console.error("❌ [AUTO-SYNC] Erro ao chamar API:", e);
                        console.warn("⚠️ [AUTO-SYNC] Falha na sincronização automática, continuando com polling...", e);
                    }
                }

                // SE ACABOU DE VOLTAR DO CHECKOUT, ESPERA O WEBHOOK ATIVAR (até 15s)
                if (!dados.active && acabouDePagar) {
                    console.log("⏳ Aguardando confirmação do pagamento...");
                    for (let i = 0; i < 5; i++) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        res = await fetch('/api/checkout');
                        dados = await res.json();
                        if (dados.active) {
                            console.log("✅ Pagamento confirmado!");
                            break;
                        }
                        console.log(`⏳ Tentativa ${i + 2}/5...`);
                    }
                }

                // CASO 1: Usuário Novo ou sem vínculo
                if (dados.role === "NEW") {
                    // Se acabou de pagar, precisa criar empresa primeiro
                    if (acabouDePagar) {
                        console.log("🏢 Usuário pagou, mas precisa criar empresa.");
                        router.push('/novo-negocio');
                        return;
                    }
                    // Tenta o Sync para ver se ele foi convidado
                    const resSync = await fetch('/api/sync');
                    if (resSync.ok) {
                        const dadosSync = await resSync.json();
                        setCompanyId(dadosSync.companyId);
                        setUserRole(dadosSync.role);
                        setHasAccess(true); // Permite acesso para profissionais
                        setVerificando(false);
                        return;
                    }
                    if (pathname !== '/novo-negocio') router.push('/novo-negocio');
                    return;
                }

                // CASO 2: Dono sem pagamento
                if (dados.role === "ADMIN" && !dados.active) {
                    // Se ACABOU de pagar e ainda está inativo, NÃO redireciona para planos
                    // (o webhook pode ainda estar processando)
                    if (acabouDePagar) {
                        console.log("⏳ Pagamento processando... permitindo acesso temporário.");

                        // Mostra toast com link para sincronização manual
                        toast("⏳ Aguardando confirmação do pagamento...", {
                            description: "Se o acesso não for liberado em alguns minutos, clique aqui para sincronizar manualmente.",
                            duration: 10000,
                            action: {
                                label: "Sincronizar Agora",
                                onClick: () => router.push('/sync')
                            }
                        });

                        setUserPlan(dados.plan || "INDIVIDUAL");
                        setUserRole(dados.role);
                        setCompanyId(dados.companyId);
                        setHasAccess(true); // Libera acesso temporário
                        setVerificando(false);
                        return;
                    }
                    // Redireciona para a página de planos (URL completa)
                    console.log("🚫 Sem assinatura ativa. Redirecionando para planos...");
                    window.location.href = 'https://www.nohud.com.br/#planos';
                    return;
                }

                // CASO 3: Acesso liberado (Dono Ativo ou Profissional)
                setUserPlan(dados.plan);
                setUserRole(dados.role);
                setUserPermissions(dados.permissions); // <--- CARREGA PERMISSÕES
                setCompanyId(dados.companyId);
                setHasAccess(true); // Libera acesso total
                setVerificando(false);

            } catch (error) {
                console.error("Erro fatal de verificação", error);
                router.push('/');
            }
        }
        verificarStatus();
    }, [router, user, isLoaded, setCompanyId, pathname]);

    useEffect(() => {
        if (isModalOpen && companyId) {
            fetch('/api/painel/servicos').then(r => r.json()).then(setServices);
            fetch('/api/painel/profissionais').then(r => r.json()).then(setProfissionais);
            fetch('/api/clientes').then(r => r.json()).then(setClientesCadastrados);
        }
    }, [isModalOpen, companyId]);

    async function salvarAgendamento() {
        if (!novo.nome || !novo.date || !novo.time) {
            toast.error("Por favor, preencha o nome, a data e o horário.");
            return;
        }

        if (tipoAgendamento === "CLIENTE" && (!novo.serviceId || !novo.professionalId)) {
            toast.error("Selecione um serviço e um profissional.");
            return;
        }

        const dataString = `${novo.date}T${novo.time}:00`;
        const dataFinal = new Date(dataString);

        if (isNaN(dataFinal.getTime())) {
            toast.error("Formato de data ou hora inválido.");
            return;
        }

        if (isBefore(dataFinal, subMinutes(new Date(), 5))) {
            toast.error("❌ Erro: O horário selecionado já passou.");
            return;
        }

        setSalvando(true);

        try {
            if (tipoAgendamento === "CLIENTE") {
                const servicoSelecionado = services.find(s => s.id === novo.serviceId);
                const duracaoMinutos = servicoSelecionado?.duration || 30;

                const resCheck = await fetch('/api/painel');
                const agendamentosExistentes = await resCheck.json();

                if (Array.isArray(agendamentosExistentes)) {
                    const conflito = agendamentosExistentes.find((ag: any) => {
                        if (ag.status === "CANCELADO") return false;
                        if (ag.professionalId !== novo.professionalId) return false;

                        const inicioExistente = new Date(ag.date);
                        const fimExistente = addMinutes(inicioExistente, ag.service?.duration || 30);

                        const inicioNovo = dataFinal;
                        const fimNovo = addMinutes(dataFinal, duracaoMinutos);

                        return areIntervalsOverlapping(
                            { start: inicioNovo, end: fimNovo },
                            { start: inicioExistente, end: fimExistente }
                        );
                    });

                    if (conflito) {
                        toast.error(`⚠️ Horário Indisponível! O profissional já estará atendendo ${conflito.customerName}.`);
                        setSalvando(false);
                        return;
                    }
                }
            }

            const res = await fetch('/api/agendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: novo.nome,
                    phone: novo.phone,
                    date: dataFinal.toISOString(),
                    serviceId: tipoAgendamento === "CLIENTE" ? novo.serviceId : null,
                    professionalId: tipoAgendamento === "CLIENTE" ? novo.professionalId : null,
                    clientId: novo.clientId || null,
                    type: tipoAgendamento,
                    location: novo.local || null,
                    companyId: companyId,
                    autoCreateClient: false // No painel, não queremos criar cliente automático se for avulso
                })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(tipoAgendamento === "CLIENTE" ? "Agendado com sucesso!" : "Evento criado!");

                // Exibir avisos de estoque se houver
                if (data.warnings && data.warnings.length > 0) {
                    data.warnings.forEach((warning: string) => {
                        toast.warning(warning, { duration: 6000 });
                    });
                }

                setIsModalOpen(false);
                setNovo({ clientId: "", nome: "", phone: "", local: "", date: new Date().toISOString().split('T')[0], time: "", serviceId: "", professionalId: "" });
                if (refreshAgenda) refreshAgenda();
            } else {
                toast.error(data.error || "Erro ao salvar agendamento.");
            }
        } catch (error) {
            toast.error("Erro de conexão com o servidor.");
        } finally {
            setSalvando(false);
        }
    }

    const clientesFiltrados = clientesCadastrados.filter(c =>
        c.name.toLowerCase().includes(termoBusca.toLowerCase()) || c.phone?.replace(/\D/g, '').includes(termoBusca.replace(/\D/g, ''))
    );

    const allItems = [
        { key: 'dashboard', name: "Visão Geral", path: "/painel/dashboard", icon: <LayoutDashboard size={20} /> },
        { key: 'agenda', name: "Agenda", path: "/painel/agenda", icon: <Calendar size={20} /> },
        { key: 'clientes', name: "Clientes", path: "/painel/clientes", icon: <Users size={20} /> },
        { key: 'financeiro', name: "Financeiro", path: "/painel/financeiro", icon: <BarChart3 size={20} /> },
        { key: 'prontuarios', name: "Prontuários", path: "/painel/prontuarios", icon: <ClipboardList size={20} /> },
        { key: 'estoque', name: "Estoque", path: "/painel/estoque", icon: <Package size={20} /> },
        { key: 'servicos', name: "Serviços", path: "/painel/servicos", icon: <Briefcase size={20} /> },
        { key: 'profissionais', name: "Equipe", path: "/painel/profissionais", icon: <UserIcon size={20} /> },
        { key: 'config', name: "Configurações", path: "/painel/config", icon: <Settings size={20} /> },
    ];

    const menuItems = allItems.filter(item => {
        // Admins tem permissão total (já garantido pela API, mas reforçamos aqui)
        if (userRole === "ADMIN") {
            // Regras de plano ainda se aplicam para o menu do Admin
            if (item.key === 'financeiro' && userPlan === "INDIVIDUAL") return false;
            if (item.key === 'prontuarios' && userPlan !== "MASTER") return false;
            if (item.key === 'estoque' && userPlan !== "MASTER") return false;
            return true;
        }

        // Se ainda não carregou permissões (para Profissionais), mostra apenas o básico por segurança
        if (!userPermissions) return item.key === 'agenda' || item.key === 'clientes';

        // Para profissionais, depende puramente das permissões setadas
        return userPermissions[item.key as keyof typeof userPermissions];
    });

    // Bloqueia se estiver verificando OU se não tiver acesso (caso esteja redirecionando)
    if (verificando || !hasAccess) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-gray-500 font-bold animate-pulse text-sm">
                {verificando ? "Acessando ambiente..." : "Redirecionando..."}
            </p>
        </div>
    );

    return (
        <div className={`min-h-screen flex flex-col md:flex-row font-sans ${theme}`}>

            {/* --- HEADER MOBILE --- */}
            <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-950 border-b dark:border-gray-800 z-30 sticky top-0">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <div className="flex items-center gap-4">
                    <UserButton />
                    <Link href="/" className="flex items-center gap-2">
                        <LogoNohud />
                    </Link>
                </div>
            </header>

            {/* --- OVERLAY MOBILE --- */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* --- SIDEBAR --- */}
            <aside className={`
                fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-950 border-r dark:border-gray-800 flex flex-col z-50 
                transition-transform duration-300 transform md:relative md:translate-x-0 md:w-64 md:z-20
                ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                print:hidden
            `}>
                <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <LogoNohud />
                    </Link>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-red-500 transition">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map(item => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${pathname === item.path ? "bg-blue-600 text-white shadow-md font-bold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                        >
                            {item.icon} {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 space-y-3">
                    <button
                        onClick={() => { setTipoAgendamento("CLIENTE"); setIsModalOpen(true); }}
                        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg hover:bg-blue-700 transition active:scale-95"
                    >
                        <PlusCircle size={20} /> Novo Agendamento
                    </button>

                    <div className="p-4 border-t dark:border-gray-800 flex items-center justify-between md:hidden">
                        <UserButton showName />
                        <div className="italic text-[10px] text-gray-400 uppercase tracking-widest">Modo: {userRole}</div>
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-800 hidden md:block">
                    <UserButton showName />
                    <div className="mt-2 px-1 italic text-[10px] text-gray-400 uppercase tracking-widest">Modo: {userRole}</div>
                </div>
            </aside>

            {/* --- MAIN: ADICIONADO CLASSES DE RESET PARA IMPRESSÃO --- */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen relative bg-gray-100 dark:bg-gray-900 print:p-0 print:m-0 print:w-full print:h-auto print:overflow-visible print:bg-white">
                {(() => {
                    const currentRoute = allItems.find(item => pathname === item.path);
                    const isDenied = currentRoute && userPermissions && !userPermissions[currentRoute.key] && userRole !== "ADMIN";

                    if (isDenied) {
                        return (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                                <ShieldCheck size={48} className="text-red-500 mb-4" />
                                <h1 className="text-3xl font-black dark:text-white">Acesso Restrito</h1>
                                <p className="text-gray-500 mt-2 font-medium">Contate o administrador para solicitar permissão para esta área.</p>
                                <button
                                    onClick={() => router.push('/painel/agenda')}
                                    className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition"
                                >
                                    Voltar para Agenda
                                </button>
                            </div>
                        );
                    }
                    return children;
                })()}

                <footer className="mt-auto pt-10 pb-6 text-center text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-bold print:hidden opacity-60 hover:opacity-100 transition-opacity">
                    &copy; {new Date().getFullYear()} NOHUD Tecnologia. Todos os direitos reservados.
                </footer>

                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 print:hidden">
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800">

                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-[60]"
                            >
                                <X size={24} />
                            </button>

                            <h3 className="text-2xl font-black mb-6 dark:text-white text-center">O que vamos criar?</h3>

                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-[1.2rem] mb-8">
                                <button
                                    onClick={() => setTipoAgendamento("CLIENTE")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition ${tipoAgendamento === "CLIENTE" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-500"}`}
                                >
                                    <UserIcon size={14} /> AGENDAMENTO
                                </button>
                                <button
                                    onClick={() => setTipoAgendamento("EVENTO")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition ${tipoAgendamento === "EVENTO" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-500"}`}
                                >
                                    <Calendar size={14} /> EVENTO
                                </button>
                            </div>

                            <div className="space-y-4">
                                {tipoAgendamento === "CLIENTE" ? (
                                    <>
                                        {/* SELEÇÃO DE CLIENTE FIXO */}
                                        <div className="space-y-2">
                                            {novo.clientId ? (
                                                <div className="w-full flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                        <Check size={18} /> {novo.nome}
                                                    </div>
                                                    <button
                                                        onClick={() => setNovo({ ...novo, clientId: "", nome: "", phone: "" })}
                                                        className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setIsSearchModalOpen(true)}
                                                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 dark:border-blue-900 p-4 rounded-2xl text-blue-600 text-sm font-black hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
                                                >
                                                    <Search size={18} /> BUSCAR CLIENTE CADASTRADO
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <input
                                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold"
                                                placeholder="Nome do Cliente"
                                                value={novo.nome}
                                                onChange={e => setNovo({ ...novo, nome: e.target.value, clientId: e.target.value === "" ? "" : novo.clientId })}
                                            />
                                            <input
                                                type="tel"
                                                maxLength={15}
                                                className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold transition-all"
                                                placeholder="(00) 00000-0000"
                                                value={novo.phone}
                                                onChange={e => setNovo({ ...novo, phone: formatarTelefoneInput(e.target.value) })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Nome do Evento (ex: Reunião)" value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} />
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-4 text-gray-400" size={20} />
                                            <input className="w-full border dark:border-gray-700 p-4 pl-12 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Onde será o evento?" value={novo.local} onChange={e => setNovo({ ...novo, local: e.target.value })} />
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Data</label>
                                        <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.date} onChange={e => setNovo({ ...novo, date: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Horário</label>
                                        <input type="time" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.time} onChange={e => setNovo({ ...novo, time: e.target.value })} />
                                    </div>
                                </div>

                                {tipoAgendamento === "CLIENTE" && (
                                    <div className="grid grid-cols-1 gap-3">
                                        <select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.serviceId} onChange={e => setNovo({ ...novo, serviceId: e.target.value })}>
                                            <option value="">Selecione o Serviço...</option>
                                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                                        </select>
                                        <select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 dark:text-white outline-none font-bold" value={novo.professionalId} onChange={e => setNovo({ ...novo, professionalId: e.target.value })}>
                                            <option value="">Selecione o Profissional...</option>
                                            {profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <button
                                    onClick={salvarAgendamento}
                                    disabled={salvando}
                                    className={`w-full p-5 rounded-2xl font-black text-lg shadow-xl transition active:scale-95 flex justify-center items-center gap-2 ${salvando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                >
                                    {salvando ? <Loader2 className="animate-spin" /> : tipoAgendamento === "CLIENTE" ? "Confirmar Agendamento" : "Criar Evento"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE BUSCA DE CLIENTES */}
                {isSearchModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4 print:hidden">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] border dark:border-gray-800">
                            <div className="flex justify-between items-center mb-4 dark:text-white">
                                <h3 className="font-black text-xl ml-2">Buscar Cliente</h3>
                                <button onClick={() => setIsSearchModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"><X /></button>
                            </div>
                            <div className="relative mb-4 px-2">
                                <Search className="absolute left-6 top-4 text-gray-400" size={20} />
                                <input autoFocus className="w-full pl-12 pr-4 py-4 border dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold" placeholder="Nome ou telefone..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} />
                            </div>
                            <div className="overflow-y-auto flex-1 space-y-2 custom-scrollbar pr-2 px-2">
                                {clientesFiltrados.map(c => (
                                    <button key={c.id} onClick={() => { setNovo({ ...novo, clientId: c.id, nome: c.name, phone: formatarTelefoneInput(c.phone || "") }); setIsSearchModalOpen(false); setTermoBusca(""); }} className="w-full text-left p-5 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-transparent hover:border-blue-200 transition flex justify-between items-center dark:text-white group">
                                        <div><p className="font-black text-base group-hover:text-blue-600 transition">{c.name}</p><p className="text-xs font-bold text-gray-500">{c.phone || "Sem telefone"}</p></div>
                                        <PlusCircle size={22} className="text-blue-500 opacity-0 group-hover:opacity-100 transition" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function PainelLayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AgendaProvider><PainelConteudo>{children}</PainelConteudo></AgendaProvider>
    );
}
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, FileText, Download, Filter, X, Eye, Loader2, ArrowLeft, Building2, UserCircle, Briefcase, Calculator, Settings, Check, Printer, RefreshCw, Lock, Share2, FileCode, Mail, Copy, Ban, DollarSign, ChevronDown, Edit2, Trash2 } from "lucide-react";
import { AddonPaywall } from "@/components/AddonPaywall";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import { formatarMoeda, desformatarMoeda } from "@/lib/validators";

function ModalPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || typeof document === 'undefined') return null;
    const target = document.getElementById('modal-root') || document.body;
    return createPortal(children, target);
}

export default function NotasFiscaisPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNovaNotaOpen, setIsNovaNotaOpen] = useState(false);
    const [hasModule, setHasModule] = useState<boolean | null>(null);

    // Form states for Nova Nota Manual
    const [clientes, setClientes] = useState<any[]>([]);
    const [formLoading, setFormLoading] = useState(false);
    const [searchClient, setSearchClient] = useState("");
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Configuração Padrão Puxada da Empresa
    const [configPadrao, setConfigPadrao] = useState<any>(null);

    // Estrutura do formulário seguindo o print
    const [form, setForm] = useState({
        // Cabeçalho
        naturezaOperacao: "1", // 1 = Tributação no município
        municipioIncidencia: "Ipatinga (MG)",
        dataEmissao: format(new Date(), "yyyy-MM-dd"),
        horaEmissao: format(new Date(), "HH:mm"),

        // Cliente
        tipoCliente: "FISICA",
        clienteId: "",
        nomeRazao: "",
        cpfCnpj: "",
        inscricaoMunicipal: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        telefone: "",
        email: "",

        // Serviço
        descricaoServico: "",
        itemListaServico: "",
        codigoTributacao: "",
        codigoCnae: "",
        descricaoAtividade: "",
        valorServicos: "",
        baseCalculo: 0,
        aliquota: 0,
        valorDeducoes: "",
        descontos: "",
        valorIss: 0,
        issRetido: false,
        construcaoCivil: false,

        // Totais e Impostos
        percCofins: 0,
        percPis: 0,
        percCsll: 0,
        percIr: 0,
        percInss: 0,
        valorCofins: 0,
        valorPis: 0,
        valorCsll: 0,
        valorIr: 0,
        valorInss: 0,
        valorLiquido: 0
    });

    useEffect(() => {
        carregarTudo();
    }, []);

    async function carregarTudo() {
        setLoading(true);
        try {
            // Pegar as faturas que têm NFe
            const res = await fetch("/api/financeiro/faturas?status=TODAS"); // Rota existente, vamos apenas filtrar no front para simplificar ou buscar faturas
            const faturasJson = await res.json();

            if (faturasJson && faturasJson.invoices) {
                const notas = faturasJson.invoices.filter((inv: any) => inv.nfeStatus !== null && inv.nfeStatus !== undefined);
                setData(notas);
            } else {
                setData([]);
            }

            // Pegar clientes para o autocomplete da nota manual
            const resCli = await fetch("/api/clientes");
            const cliJson = await resCli.json();
            if (Array.isArray(cliJson)) setClientes(cliJson);

            // Pegar Configurações da Empresa para os "Padrões"
            const resConf = await fetch("/api/painel/config");
            const confJson = await resConf.json();
            if (confJson) {
                setHasModule(!!confJson.hasNfeModule);
                setConfigPadrao(confJson);
                setForm(prev => ({
                    ...prev,
                    naturezaOperacao: String(confJson.naturezaOperacao || "1"),
                    codigoTributacao: confJson.codigoServico || "",
                    aliquota: confJson.aliquotaServico ? Number(confJson.aliquotaServico) : 0,
                    percInss: confJson.inssTax ? Number(confJson.inssTax) : 0
                }));
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Calcula Totais quando valores mudam
    useEffect(() => {
        const base = desformatarMoeda(String(form.valorServicos)) - desformatarMoeda(String(form.valorDeducoes)) - desformatarMoeda(String(form.descontos));
        const calcIss = (base * Number(form.aliquota)) / 100;
        const calcInss = (base * Number(form.percInss)) / 100;
        const calcCofins = (base * Number(form.percCofins)) / 100;
        const calcPis = (base * Number(form.percPis)) / 100;
        const calcCsll = (base * Number(form.percCsll)) / 100;
        const calcIr = (base * Number(form.percIr)) / 100;

        let liq = base - calcInss - calcCofins - calcPis - calcCsll - calcIr;
        if (form.issRetido) liq -= calcIss;

        setForm(prev => ({
            ...prev,
            baseCalculo: base > 0 ? base : 0,
            valorIss: calcIss > 0 ? calcIss : 0,
            valorInss: calcInss > 0 ? calcInss : 0,
            valorCofins: calcCofins > 0 ? calcCofins : 0,
            valorPis: calcPis > 0 ? calcPis : 0,
            valorCsll: calcCsll > 0 ? calcCsll : 0,
            valorIr: calcIr > 0 ? calcIr : 0,
            valorLiquido: liq > 0 ? liq : 0
        }));
    }, [
        form.valorServicos, form.valorDeducoes, form.descontos,
        form.aliquota, form.percInss, form.percCofins, form.percPis, form.percCsll, form.percIr, form.issRetido
    ]);

    function selecionarCliente(cli: any) {
        setForm(prev => ({
            ...prev,
            clienteId: cli.id,
            nomeRazao: cli.name || "",
            cpfCnpj: cli.cpf || cli.cnpj || "",
            tipoCliente: cli.clientType || (cli.cnpj ? "JURIDICA" : "FISICA"),
            cep: cli.cep || "",
            logradouro: cli.address || "",
            numero: cli.number || "",
            complemento: cli.complement || "",
            bairro: cli.neighborhood || "",
            cidade: cli.city || "",
            uf: cli.state || "",
            telefone: cli.phone || "",
            email: cli.email || ""
        }));
        setSearchClient(""); // limpa a busca
    }

    async function emitirNotaManual(e: React.FormEvent) {
        e.preventDefault();
        setFormLoading(true);

        try {
            toast.loading("Enviando NFS-e Manual...", { id: "nfe_manual" });

            const res = await fetch("/api/painel/financeiro/nfe/avulsa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    environment: 'HOMOLOGATION' // Forçar ambiente de testes ("Sem Valor Fiscal")
                })
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("ERRO NFE:", data);
                throw new Error(data.error || "Erro desconhecido ao emitir NF.");
            }

            toast.success("Nota enviada para processamento com sucesso!", { id: "nfe_manual" });
            setIsNovaNotaOpen(false);

            // Aguarda alguns segundos e tenta abrir a NFS-e oficial da prefeitura
            const invoiceId = data.invoiceId;
            if (invoiceId) {
                toast.loading("Aguardando processamento da NFS-e pela prefeitura...", { id: "consulta_nfse_auto" });
                setTimeout(async () => {
                    try {
                        const res = await fetch("/api/painel/financeiro/nfe/consultar", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ invoiceId })
                        });
                        const result = await res.json();
                        if (result.success && result.linkImpressao) {
                            toast.success(`NFS-e nº ${result.numeroNfse} emitida!`, { id: "consulta_nfse_auto" });
                            window.open(result.linkImpressao, '_blank');
                        } else {
                            toast.info("A NFS-e está sendo processada. Clique no ícone de impressão quando disponível.", { id: "consulta_nfse_auto" });
                        }
                        carregarTudo();
                    } catch {
                        toast.dismiss("consulta_nfse_auto");
                    }
                }, 5000);
            }

            carregarTudo();
        } catch (error: any) {
            toast.error(error.message || "Erro ao emitir nota.", { id: "nfe_manual" });
        } finally {
            setFormLoading(false);
        }
    }

    const formatCurrency = (val: number) => {
        return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    async function imprimirNfse(inv: any) {
        // Se já tem o link direto da prefeitura salvo, abre direto
        if (inv.nfeUrl) {
            window.open(inv.nfeUrl, '_blank');
            return;
        }

        // Consulta a API para obter o link de impressão da prefeitura
        toast.loading("Consultando NFS-e na prefeitura...", { id: "consulta_nfse" });

        try {
            const res = await fetch("/api/painel/financeiro/nfe/consultar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId: inv.id })
            });

            const result = await res.json();

            if (result.success && result.linkImpressao) {
                toast.success(`NFS-e nº ${result.numeroNfse} encontrada!`, { id: "consulta_nfse" });
                window.open(result.linkImpressao, '_blank');
                carregarTudo();
            } else {
                toast.warning(result.message || result.error || "NFS-e ainda não processada. Tente novamente em alguns segundos.", { id: "consulta_nfse" });
            }
        } catch (error: any) {
            toast.error("Erro de conexão ao consultar NFS-e.", { id: "consulta_nfse" });
        }
    }

    async function atualizarStatus(inv: any) {
        setRefreshingId(inv.id);
        toast.loading("Consultando status na prefeitura...", { id: `refresh_${inv.id}` });

        try {
            const res = await fetch("/api/painel/financeiro/nfe/consultar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId: inv.id })
            });

            const result = await res.json();

            if (result.success && result.linkImpressao) {
                toast.success(`NFS-e nº ${result.numeroNfse} emitida! Status atualizado.`, { id: `refresh_${inv.id}` });
                carregarTudo();
            } else {
                toast.info(result.message || "A prefeitura ainda está processando esta nota. Tente novamente em alguns instantes.", { id: `refresh_${inv.id}` });
            }
        } catch (error: any) {
            toast.error("Erro de conexão ao consultar status.", { id: `refresh_${inv.id}` });
        } finally {
            setRefreshingId(null);
        }
    }

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline mr-2" /> Carregando...</div>;

    if (hasModule === false) {
        return (
            <AddonPaywall
                title="Emissão de Notas (NFS-e)"
                description="Automatize a emissão de notas fiscais de serviço diretamente para a prefeitura. Sem redigitação, sem erros e com envio automático para o cliente."
                icon={<FileText size={32} />}
                color="blue"
                benefits={[
                    "Emissão automática nos agendamentos",
                    "Envio automático por E-mail e WhatsApp",
                    "Integração direta com +1.500 prefeituras",
                    "Suporte a Notas Avulsas (Manuais)",
                    "Gestão completa de impostos e RPS"
                ]}
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            {/* CABEÇALHO DA PÁGINA */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border dark:border-gray-700">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/painel/financeiro" className="text-gray-400 hover:text-blue-600 transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <span className="bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                            Impostos & Fiscal
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white tracking-tighter flex items-center gap-3">
                        <FileText className="text-blue-500 hidden md:block" size={36} />
                        Notas Fiscais
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mt-2">
                        Gerencie suas emissões e emita notas NFS-e avulsas manualmente.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Link
                        href="/painel/config"
                        className="bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95 flex-1 md:flex-none justify-center whitespace-nowrap text-sm"
                    >
                        <Settings size={20} /> Padrões NFe
                    </Link>
                    <button
                        onClick={() => setIsNovaNotaOpen(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 active:scale-95 flex-1 md:flex-none justify-center whitespace-nowrap text-sm"
                    >
                        <Plus size={20} /> Emissão Manual
                    </button>
                </div>
            </div>

            {/* TABELA DE NOTAS JÁ EMITIDAS */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700">
                    <h3 className="text-lg font-black text-gray-800 dark:text-white">Últimas Emissões (NFS-e)</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Nº NF</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referência / Fatura</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tomador</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Status NFE</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Nº RPS</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-2" />
                                        <p className="text-gray-400 font-bold">Carregando...</p>
                                    </td>
                                </tr>
                            ) : data && data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <FileText size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-400 font-bold">Nenhuma Nota Fiscal emitida ainda.</p>
                                    </td>
                                </tr>
                            ) : (
                                data && data.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition group">
                                        <td className="px-6 py-5 font-black text-gray-700 dark:text-gray-300">
                                            {inv.nfeProtocol || "-"}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate max-w-[200px]">{inv.description || "Referência manual"}</span>
                                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">FAT: {inv.id.slice(-8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">{inv.client?.name || "Avulso"}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${inv.nfeStatus === 'EMITIDA' ? 'bg-emerald-100 text-emerald-700' :
                                                inv.nfeStatus === 'PROCESSANDO' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {inv.nfeStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-black text-gray-900 dark:text-white text-sm">
                                            {formatCurrency(inv.value)}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {inv.nfeNumber ? (
                                                <span className="font-mono text-xs text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">{inv.nfeNumber}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center relative">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {/* Detalhes */}
                                                <button
                                                    onClick={() => toast.info("Visualizando detalhes...")}
                                                    className="p-1.5 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition shadow-sm"
                                                    title="Ver Detalhes"
                                                >
                                                    <Search size={14} />
                                                </button>

                                                {/* Editar */}
                                                <button
                                                    onClick={() => toast.info("Edição em manutenção")}
                                                    className="p-1.5 bg-orange-400 text-white rounded-md hover:bg-orange-500 transition shadow-sm"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>

                                                {/* Excluir/Cancelar Rápido */}
                                                <button
                                                    onClick={() => toast.warning("Deseja cancelar esta nota?")}
                                                    className="p-1.5 bg-white border border-gray-200 text-gray-400 rounded-md hover:border-red-200 hover:text-red-500 transition shadow-sm"
                                                    title="Cancelar/Excluir"
                                                >
                                                    <X size={14} />
                                                </button>

                                                {/* Dropdown Menu */}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setActiveMenuId(activeMenuId === inv.id ? null : inv.id)}
                                                        className="p-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition shadow-sm flex items-center"
                                                        title="Mais Opções"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>

                                                    {activeMenuId === inv.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-[60]"
                                                                onClick={() => setActiveMenuId(null)}
                                                            />
                                                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 z-[70] py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                                <button
                                                                    onClick={() => { setActiveMenuId(null); imprimirNfse(inv); }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b dark:border-gray-700"
                                                                >
                                                                    <Printer size={16} className="text-gray-400" /> Imprimir NFS-e
                                                                </button>
                                                                <button
                                                                    onClick={() => { setActiveMenuId(null); toast.info("Função de compartilhamento em breve"); }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                >
                                                                    <Share2 size={16} className="text-gray-400" /> Compartilhar
                                                                </button>
                                                                <button
                                                                    onClick={() => { setActiveMenuId(null); toast.info("Download de XML em breve"); }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                >
                                                                    <FileCode size={16} className="text-gray-400" /> Baixar XML
                                                                </button>
                                                                <button
                                                                    onClick={() => { setActiveMenuId(null); toast.info("Envio por e-mail em breve"); }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                >
                                                                    <Mail size={16} className="text-gray-400" /> Enviar por e-mail
                                                                </button>
                                                                <button
                                                                    onClick={() => { setActiveMenuId(null); toast.info("Duplicação em manutenção"); }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t dark:border-gray-700"
                                                                >
                                                                    <Copy size={16} className="text-gray-400" /> Duplicar NFS-e
                                                                </button>
                                                                <button
                                                                    onClick={() => { setActiveMenuId(null); toast.warning("Solicitação de cancelamento enviada"); }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                                                                >
                                                                    <Ban size={16} /> Cancelar NFS-e
                                                                </button>
                                                                <button
                                                                    onClick={() => { setActiveMenuId(null); toast.info("Abrindo faturamento..."); }}
                                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 flex items-center gap-2 border-t dark:border-gray-700"
                                                                >
                                                                    <DollarSign size={16} /> Ver no financeiro
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL FULLSCREEN: EMISSÃO DE NOTA MANUAL (Réplica do Modelo) */}
            {isNovaNotaOpen && (
                <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-6xl my-8 rounded-[2rem] shadow-2xl flex flex-col h-fit max-h-[95vh] overflow-hidden">

                        {/* Header do Form */}
                        <div className="flex items-center justify-between p-6 border-b dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-900">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                                    <FileText className="text-blue-500" /> Emissão de NFS-e Manual
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold mt-1">Preencha os dados abaixo para submeter a nota à Prefeitura.</p>
                            </div>
                            <button onClick={() => setIsNovaNotaOpen(false)} className="p-3 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 rounded-xl transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Corpo do Form (Scrollable) */}
                        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8 bg-blue-50/10 dark:bg-gray-900">
                            <form id="nfe-manual-form" onSubmit={emitirNotaManual} className="space-y-8">

                                {/* CABEÇALHO NFS-e */}
                                <div className="space-y-4">
                                    <h3 className="font-black text-gray-700 dark:text-gray-200 text-sm uppercase tracking-widest flex items-center gap-2 border-b dark:border-gray-800 pb-2">
                                        <Calculator size={16} /> Dados Operacionais
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Natureza da operação*</label>
                                            <select required value={form.naturezaOperacao} onChange={e => setForm({ ...form, naturezaOperacao: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold outline-none text-gray-700 dark:text-gray-300">
                                                <option value="1">1 - Tributação no município</option>
                                                <option value="2">2 - Tributação fora do município</option>
                                                <option value="3">3 - Isenção</option>
                                                <option value="4">4 - Imune</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Município de Incidência</label>
                                            <input required type="text" value={form.municipioIncidencia} onChange={e => setForm({ ...form, municipioIncidencia: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Data de emissão</label>
                                            <input required type="date" value={form.dataEmissao} onChange={e => setForm({ ...form, dataEmissao: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Hora de emissão</label>
                                            <input required type="time" value={form.horaEmissao} onChange={e => setForm({ ...form, horaEmissao: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* DADOS DO TOMADOR (CLIENTE) */}
                                <div className="space-y-4">
                                    <h3 className="font-black text-gray-700 dark:text-gray-200 text-sm uppercase tracking-widest flex items-center gap-2 border-b dark:border-gray-800 pb-2">
                                        <UserCircle size={16} /> Dados do Cliente (Tomador)
                                    </h3>

                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-1 block">Buscar Cliente Cadastrado (Opcional)</label>
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-3.5 text-blue-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Digite o nome..."
                                                    value={searchClient}
                                                    onChange={(e) => setSearchClient(e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-xl pl-10 p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 ring-blue-500"
                                                />
                                                {searchClient && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xl max-h-40 overflow-auto rounded-xl">
                                                        {clientes.filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase())).map(c => (
                                                            <div key={c.id} onClick={() => selecionarCliente(c)} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer font-bold text-sm text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 last:border-0">
                                                                {c.name} - {c.cpf || c.cnpj || "S/ Doc"}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Tipo*</label>
                                            <select required value={form.tipoCliente} onChange={e => setForm({ ...form, tipoCliente: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold outline-none text-gray-700 dark:text-gray-300">
                                                <option value="FISICA">Pessoa Física</option>
                                                <option value="JURIDICA">Pessoa Jurídica</option>
                                                <option value="ESTRANGEIRO">Estrangeiro</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nome / Razão Social*</label>
                                            <input required type="text" value={form.nomeRazao} onChange={e => setForm({ ...form, nomeRazao: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">CPF/CNPJ*</label>
                                            <input required type="text" value={form.cpfCnpj} onChange={e => setForm({ ...form, cpfCnpj: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                        </div>

                                        <div className="col-span-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">CEP</label>
                                                <input type="text" value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Logradouro / Rua</label>
                                                <input type="text" value={form.logradouro} onChange={e => setForm({ ...form, logradouro: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Número</label>
                                                <input type="text" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Complemento</label>
                                                <input type="text" value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Bairro</label>
                                                <input type="text" value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Cidade</label>
                                                <input type="text" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">UF</label>
                                                <input type="text" maxLength={2} value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none uppercase" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SERVIÇOS */}
                                <div className="space-y-4">
                                    <h3 className="font-black text-gray-700 dark:text-gray-200 text-sm uppercase tracking-widest flex items-center gap-2 border-b dark:border-gray-800 pb-2">
                                        <Briefcase size={16} /> Serviços Prestados
                                    </h3>

                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="col-span-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Discriminação dos Serviços*</label>
                                            <textarea required rows={3} placeholder="Ex: Referente a prestação de serviços de Consultoria..." value={form.descricaoServico} onChange={e => setForm({ ...form, descricaoServico: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none resize-none"></textarea>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Código Tributação Municipal (ISS)</label>
                                            <input type="text" value={form.codigoTributacao} onChange={e => setForm({ ...form, codigoTributacao: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">CNAE</label>
                                            <input type="text" value={form.codigoCnae} onChange={e => setForm({ ...form, codigoCnae: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                        </div>

                                        {/* Valores - Bloco Financeiro */}
                                        <div className="col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Valor dos Serviços (R$)*</label>
                                                <input required type="text" value={form.valorServicos} onChange={e => setForm({ ...form, valorServicos: formatarMoeda(e.target.value) })} className="w-full bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 text-sm font-black text-emerald-700 dark:text-emerald-400 outline-none focus:ring-2 ring-emerald-500" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Deduções (R$)</label>
                                                <input type="text" value={form.valorDeducoes} onChange={e => setForm({ ...form, valorDeducoes: formatarMoeda(e.target.value) })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Descontos (R$)</label>
                                                <input type="text" value={form.descontos} onChange={e => setForm({ ...form, descontos: formatarMoeda(e.target.value) })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Base P/ Cálculo</span>
                                                <span className="font-black text-gray-800 dark:text-white">{formatCurrency(form.baseCalculo)}</span>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Alíquota ISS (%)</label>
                                                <input type="number" step="0.01" value={form.aliquota} onChange={e => setForm({ ...form, aliquota: Number(e.target.value) })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Alíquota INSS (%)</label>
                                                <input type="number" step="0.01" value={form.percInss} onChange={e => setForm({ ...form, percInss: Number(e.target.value) })} className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-700 dark:text-gray-300 outline-none" />
                                            </div>

                                            {/* ISS Check */}
                                            <div className="col-span-2 flex items-center mt-6 ml-2 gap-3 cursor-pointer">
                                                <input id="checkRetido" type="checkbox" checked={form.issRetido} onChange={e => setForm({ ...form, issRetido: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                <label htmlFor="checkRetido" className="font-bold text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                    ISS Retido pelo Tomador?
                                                </label>
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                {/* TOTALIZADORES */}
                                <div className="space-y-4 pb-4">
                                    <h3 className="font-black text-gray-700 dark:text-gray-200 text-sm uppercase tracking-widest flex items-center gap-2 border-b dark:border-gray-800 pb-2">
                                        <Calculator size={16} /> Resumo de Impostos & Total Líquido
                                    </h3>

                                    <div className="bg-gray-900 text-white rounded-3xl p-6 shadow-xl border dark:border-gray-700 grid grid-cols-2 md:grid-cols-5 gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor ISS</span>
                                            <span className="font-bold text-gray-200">{formatCurrency(form.valorIss)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor INSS</span>
                                            <span className="font-bold text-gray-200">{formatCurrency(form.valorInss)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor PIS</span>
                                            <span className="font-bold text-gray-200">{formatCurrency(form.valorPis)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor COFINS</span>
                                            <span className="font-bold text-gray-200">{formatCurrency(form.valorCofins)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor IR</span>
                                            <span className="font-bold text-gray-200">{formatCurrency(form.valorIr)}</span>
                                        </div>

                                        {/* TOTAL LIQUIDO */}
                                        <div className="col-span-2 md:col-span-5 border-t border-gray-700 pt-4 flex flex-col md:flex-row justify-between items-center bg-gray-800 p-4 rounded-2xl">
                                            <div className="flex items-center gap-2">
                                                <Check size={20} className="text-emerald-500" />
                                                <span className="font-bold text-sm text-gray-300">Total Líquido Estimado a Receber:</span>
                                            </div>
                                            <span className="text-3xl font-black text-emerald-400 tracking-tighter mt-2 md:mt-0">
                                                {formatCurrency(form.valorLiquido)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>

                        {/* Rodapé Form Buttons */}
                        <div className="p-6 border-t dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setIsNovaNotaOpen(false)}
                                className="px-6 py-3 rounded-2xl font-black text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                form="nfe-manual-form"
                                type="submit"
                                disabled={formLoading}
                                className={`px-8 py-3 rounded-2xl font-black text-white flex items-center gap-2 transition text-sm shadow-xl active:scale-95 ${formLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/40"}`}
                            >
                                {formLoading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                                {formLoading ? "Enviando NFS-e..." : "Emitir Nota Fiscal (NFS-e)"}
                            </button>
                        </div>
                    </div>
                </div></ModalPortal>
            )}
        </div>
    );
}

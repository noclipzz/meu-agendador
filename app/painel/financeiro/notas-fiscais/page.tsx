"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, FileText, Download, Filter, X, Eye, Loader2, ArrowLeft, Building2, UserCircle, Briefcase, Calculator, Settings, Check, Printer } from "lucide-react";
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

    // Form states for Nova Nota Manual
    const [clientes, setClientes] = useState<any[]>([]);
    const [formLoading, setFormLoading] = useState(false);
    const [searchClient, setSearchClient] = useState("");

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
                setConfigPadrao(confJson);
                // Pré-preenche Padrões
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

            // Abre impressão automaticamente com os dados da nota recém-emitida
            const notaParaImprimir = {
                id: data.invoiceId || "",
                description: form.descricaoServico,
                value: desformatarMoeda(String(form.valorServicos)),
                nfeStatus: "PROCESSANDO",
                nfeProtocol: data.protocol || "",
                nfeNumber: null,
                createdAt: new Date().toISOString(),
                client: {
                    name: form.nomeRazao,
                    cpf: form.cpfCnpj,
                    address: form.logradouro,
                    number: form.numero,
                    neighborhood: form.bairro,
                    city: form.cidade,
                    state: form.uf,
                    cep: form.cep
                }
            };
            imprimirNfse(notaParaImprimir);

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

    function imprimirNfse(inv: any) {
        const tomador = inv.client || {};
        const dataFormatada = inv.createdAt ? format(new Date(inv.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-";
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>NFS-e - ${inv.description || "Nota Fiscal"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1a1a2e; padding: 40px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; }
  .header-left h1 { font-size: 22px; font-weight: 900; color: #2563eb; }
  .header-left p { font-size: 11px; color: #666; margin-top: 4px; }
  .header-right { text-align: right; }
  .header-right .status { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .status-processando { background: #dbeafe; color: #2563eb; }
  .status-emitida { background: #d1fae5; color: #059669; }
  .status-erro { background: #fee2e2; color: #dc2626; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .field { }
  .field-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
  .field-value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; }
  .total-box { background: #1e293b; color: #fff; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
  .total-box .label { font-size: 12px; font-weight: 700; color: #94a3b8; }
  .total-box .value { font-size: 28px; font-weight: 900; color: #34d399; }
  .discriminacao { background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 12px; line-height: 1.6; color: #334155; white-space: pre-wrap; }
  .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  .badge-homolog { background: #fef3c7; color: #d97706; padding: 8px 16px; border-radius: 8px; font-size: 11px; font-weight: 900; text-align: center; margin-bottom: 20px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="badge-homolog">⚠ AMBIENTE DE HOMOLOGAÇÃO - NOTA SEM VALOR FISCAL</div>
<div class="header">
  <div class="header-left">
    <h1>📄 NFS-e - Nota Fiscal de Serviço Eletrônica</h1>
    <p>${configPadrao?.name || "Empresa"} | CNPJ: ${configPadrao?.cnpj || "-"}</p>
  </div>
  <div class="header-right">
    <span class="status ${inv.nfeStatus === 'EMITIDA' ? 'status-emitida' : inv.nfeStatus === 'PROCESSANDO' ? 'status-processando' : 'status-erro'}">${inv.nfeStatus || "PENDENTE"}</span>
    <p style="font-size:11px;color:#666;margin-top:6px;">Emissão: ${dataFormatada}</p>
    ${inv.nfeProtocol ? '<p style="font-size:10px;color:#999;margin-top:2px;">Protocolo: ' + inv.nfeProtocol + '</p>' : ''}
  </div>
</div>

<div class="section">
  <div class="section-title">Prestador de Serviços</div>
  <div class="grid">
    <div class="field"><span class="field-label">Razão Social</span><div class="field-value">${configPadrao?.name || "-"}</div></div>
    <div class="field"><span class="field-label">CNPJ</span><div class="field-value">${configPadrao?.cnpj || "-"}</div></div>
    <div class="field"><span class="field-label">Inscrição Municipal</span><div class="field-value">${configPadrao?.inscricaoMunicipal || "-"}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Tomador de Serviços</div>
  <div class="grid">
    <div class="field"><span class="field-label">Nome / Razão Social</span><div class="field-value">${tomador.name || "Consumidor Final"}</div></div>
    <div class="field"><span class="field-label">CPF/CNPJ</span><div class="field-value">${tomador.cpf || tomador.cnpj || "-"}</div></div>
    <div class="field"><span class="field-label">Endereço</span><div class="field-value">${tomador.address || "-"}, ${tomador.number || ""} - ${tomador.neighborhood || ""}</div></div>
    <div class="field"><span class="field-label">Cidade/UF</span><div class="field-value">${tomador.city || "-"} / ${tomador.state || "-"} - CEP: ${tomador.cep || "-"}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Discriminação dos Serviços</div>
  <div class="discriminacao">${inv.description || "Serviço prestado"}</div>
</div>

<div class="section">
  <div class="section-title">Valores</div>
  <div class="grid-3">
    <div class="field"><span class="field-label">Valor dos Serviços</span><div class="field-value">${formatCurrency(inv.value)}</div></div>
    <div class="field"><span class="field-label">Referência</span><div class="field-value">FAT: ${inv.id?.slice(-8) || "-"}</div></div>
    <div class="field"><span class="field-label">Nº RPS</span><div class="field-value">${inv.nfeNumber || "-"}</div></div>
  </div>
</div>

<div class="total-box">
  <div class="label">VALOR TOTAL DA NOTA</div>
  <div class="value">${formatCurrency(inv.value)}</div>
</div>

<div class="footer">
  Documento gerado pelo sistema em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • NFS-e Padrão ABRASF 2.04
</div>
</body>
</html>`;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
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
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Protocolo</th>
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
                                            {inv.nfeNumber || "-"}
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
                                            {inv.nfeProtocol ? (
                                                <span className="font-mono text-xs text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">{inv.nfeProtocol}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => imprimirNfse(inv)}
                                                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition active:scale-95"
                                                title="Imprimir NFS-e"
                                            >
                                                <Printer size={16} />
                                            </button>
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

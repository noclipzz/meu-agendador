"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Activity, Server, AlertTriangle, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Boxes, Radio, Fingerprint, CalendarDays, KeySquare } from "lucide-react";

export default function LogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const [filterService, setFilterService] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState("ALL");

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        setLoading(true);
        try {
            const res = await fetch('/api/painel/dev/logs');
            const data = await res.json();
            if (Array.isArray(data)) {
                setLogs(data);
            }
        } catch (error) {
            console.error("Erro ao carregar logs", error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log => {
        const matchService = filterService === "ALL" || log.service === filterService;
        const matchStatus = filterStatus === "ALL" || log.status === filterStatus;
        return matchService && matchStatus;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "SUCCESS": return <CheckCircle2 className="text-emerald-500" size={18} />;
            case "WARNING": return <AlertTriangle className="text-orange-500" size={18} />;
            case "ERROR": return <AlertCircle className="text-red-500" size={18} />;
            default: return <Activity className="text-gray-500" size={18} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "SUCCESS": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-800";
            case "WARNING": return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/10 dark:text-orange-400 dark:border-orange-800";
            case "ERROR": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-800";
            default: return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
        }
    };

    const getServiceIcon = (service: string) => {
        switch (service) {
            case "CORA": return <KeySquare className="text-blue-500" size={16} />;
            case "EVOLUTION": return <Boxes className="text-green-500" size={16} />;
            case "SIGCORP": return <Server className="text-purple-500" size={16} />;
            default: return <Radio className="text-gray-500" size={16} />;
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <Activity className="text-purple-500" size={32} />
                    Logs de Integração
                </h1>
                <p className="text-gray-500 font-medium text-sm mt-1">
                    Painel de monitoramento "Caixa Preta" do sistema para as integrações (API, Webhooks, CRONs).
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex-1">
                    <label className="text-xs font-black uppercase text-gray-500 pl-2 mb-1 block tracking-wider">Serviço</label>
                    <select
                        value={filterService}
                        onChange={(e) => setFilterService(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-0 p-3 rounded-2xl outline-none font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                        <option value="ALL">Todos os Serviços</option>
                        <option value="CORA">Cora</option>
                        <option value="EVOLUTION">Evolution (WhatsApp)</option>
                        <option value="SIGCORP">SigCorp (NFS-e)</option>
                        <option value="SYSTEM">Sistema Interno</option>
                        <option value="RESEND">Resend (Emails)</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-xs font-black uppercase text-gray-500 pl-2 mb-1 block tracking-wider">Status</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-0 p-3 rounded-2xl outline-none font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="SUCCESS">Sucesso</option>
                        <option value="WARNING">Avisos</option>
                        <option value="ERROR">Erro Crítico</option>
                    </select>
                </div>
                <div className="flex items-end pb-1">
                    <button
                        onClick={loadLogs}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-2xl font-bold flex items-center justify-center transition-all h-12 w-full sm:w-auto px-6 shadow-md shadow-purple-500/20"
                    >
                        Atualizar Logs
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 opacity-50">
                    <Loader2 className="animate-spin text-purple-600 mb-4" size={40} />
                    <span className="font-bold text-gray-500 tracking-wider uppercase text-xs">Carregando telemetria...</span>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-800 p-20 flex flex-col items-center justify-center rounded-[3rem]">
                    <Activity size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
                    <h3 className="text-xl font-black text-gray-700 dark:text-gray-300">Nenhum evento registrado.</h3>
                    <p className="text-gray-500 font-medium">Os filtros atuais não retornaram nenhum log.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredLogs.map((log) => (
                        <div key={log.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all">
                            {/* LOG HEADER */}
                            <div
                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-l-4 ${log.status === 'ERROR' ? 'border-l-red-500' : log.status === 'WARNING' ? 'border-l-orange-500' : 'border-l-emerald-500'}`}
                            >
                                <div className="flex-shrink-0 pt-1">
                                    {getStatusIcon(log.status)}
                                </div>
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-gray-800 dark:text-white flex items-center gap-1.5">
                                                {getServiceIcon(log.service)} {log.service}
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                {log.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs">
                                            {log.identifier && (
                                                <span className="font-mono text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                                                    <Fingerprint size={12} /> {log.identifier}
                                                </span>
                                            )}
                                            {log.endpoint && (
                                                <span className="text-gray-500 font-mono truncate max-w-[200px] sm:max-w-md" title={log.endpoint}>
                                                    {log.endpoint}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                                        <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded border ${getStatusColor(log.status)}`}>
                                            {log.status}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1">
                                            <CalendarDays size={12} />
                                            {format(new Date(log.createdAt), "dd/MM/yy 'às' HH:mm:ss", { locale: ptBR })}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-gray-400 pl-2">
                                    {expandedLogId === log.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                </div>
                            </div>

                            {/* LOG DETAILS */}
                            {expandedLogId === log.id && (
                                <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 lg:grid-cols-2 gap-4">

                                    {log.errorMessage && (
                                        <div className="lg:col-span-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                                            <h4 className="text-red-800 dark:text-red-400 text-xs font-black uppercase mb-2 flex items-center gap-1.5"><AlertCircle size={14} /> Mensagem de Erro</h4>
                                            <pre className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap word-break">{log.errorMessage}</pre>
                                        </div>
                                    )}

                                    {log.payload && (
                                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
                                            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                                <h4 className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">Payload (Enviado)</h4>
                                            </div>
                                            <div className="p-4 overflow-auto max-h-[300px] custom-scrollbar">
                                                <pre className="text-xs text-gray-800 dark:text-gray-300 font-mono">
                                                    {JSON.stringify(log.payload, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {log.response && (
                                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
                                            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                                <h4 className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">Response (Recebido)</h4>
                                            </div>
                                            <div className="p-4 overflow-auto max-h-[300px] custom-scrollbar">
                                                <pre className="text-xs text-gray-800 dark:text-gray-300 font-mono">
                                                    {JSON.stringify(log.response, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


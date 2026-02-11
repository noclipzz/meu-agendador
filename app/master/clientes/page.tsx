"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Filter,
    Download,
    Eye,
    Trash2,
    Edit,
    Loader2,
    Users,
    Calendar,
    Briefcase,
    UserCircle,
    CheckCircle2,
    XCircle,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export default function MasterClientes() {
    const [dados, setDados] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState("");
    const [filtroPlano, setFiltroPlano] = useState("TODOS");
    const [filtroStatus, setFiltroStatus] = useState("TODOS");
    const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);

    useEffect(() => {
        carregar();
    }, []);

    async function carregar() {
        try {
            const res = await fetch('/api/master');
            const data = await res.json();
            setDados(data);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar clientes");
        } finally {
            setLoading(false);
        }
    }

    async function deletarCliente(companyId: string, nome: string) {
        if (!confirm(`Tem certeza que deseja DELETAR permanentemente "${nome}"?\n\nIsso irá remover:\n- Todos os agendamentos\n- Todos os clientes\n- Todos os profissionais\n- Todos os serviços\n\nEssa ação NÃO pode ser desfeita!`)) {
            return;
        }

        try {
            const res = await fetch('/api/master', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId })
            });

            if (res.ok) {
                toast.success("Cliente deletado com sucesso");
                carregar();
                setClienteSelecionado(null);
            } else {
                toast.error("Erro ao deletar cliente");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        }
    }

    function exportarCSV() {
        const csv = [
            ['Nome', 'Slug', 'Owner ID', 'Plano', 'Status', 'MRR', 'Clientes', 'Profissionais', 'Agendamentos', 'Data Cadastro'].join(','),
            ...empresasFiltradas.map(emp => [
                emp.name,
                emp.slug,
                emp.ownerId,
                emp.plano,
                emp.status,
                `R$ ${emp.valor}`,
                emp.totalClientes,
                emp.totalProfissionais,
                emp.totalAgendamentos,
                new Date(emp.createdAt).toLocaleDateString('pt-BR')
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success("CSV exportado com sucesso!");
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    const empresas = dados?.empresas || [];

    // FILTROS
    const empresasFiltradas = empresas.filter((emp: any) => {
        const matchBusca = emp.name.toLowerCase().includes(busca.toLowerCase()) ||
            emp.slug.toLowerCase().includes(busca.toLowerCase()) ||
            emp.ownerId.toLowerCase().includes(busca.toLowerCase());
        const matchPlano = filtroPlano === "TODOS" || emp.plano === filtroPlano;
        const matchStatus = filtroStatus === "TODOS" || emp.status === filtroStatus;
        return matchBusca && matchPlano && matchStatus;
    });

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2">Gestão de Clientes</h1>
                    <p className="text-gray-400">{empresasFiltradas.length} de {empresas.length} empresas</p>
                </div>
                <button
                    onClick={exportarCSV}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-2xl font-bold transition"
                >
                    <Download size={20} />
                    Exportar CSV
                </button>
            </div>

            {/* FILTROS */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, slug ou Clerk ID..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-blue-500"
                    />
                </div>
                <select
                    value={filtroPlano}
                    onChange={(e) => setFiltroPlano(e.target.value)}
                    className="px-6 py-3 bg-gray-800 border border-gray-700 rounded-2xl text-white font-bold outline-none"
                >
                    <option value="TODOS">Todos os Planos</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="MASTER">Master</option>
                    <option value="SEM PLANO">Sem Plano</option>
                </select>
                <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="px-6 py-3 bg-gray-800 border border-gray-700 rounded-2xl text-white font-bold outline-none"
                >
                    <option value="TODOS">Todos os Status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                </select>
            </div>

            {/* TABELA */}
            <div className="bg-gray-800 rounded-3xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-900">
                            <tr>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Empresa</th>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Plano</th>
                                <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Status</th>
                                <th className="text-center p-4 text-xs font-black text-gray-400 uppercase">Clientes</th>
                                <th className="text-center p-4 text-xs font-black text-gray-400 uppercase">Profissionais</th>
                                <th className="text-center p-4 text-xs font-black text-gray-400 uppercase">Agendamentos</th>
                                <th className="text-right p-4 text-xs font-black text-gray-400 uppercase">MRR</th>
                                <th className="text-center p-4 text-xs font-black text-gray-400 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empresasFiltradas.map((emp: any) => (
                                <tr key={emp.id} className="border-t border-gray-700 hover:bg-gray-900/50 transition">
                                    <td className="p-4">
                                        <div>
                                            <p className="font-bold text-white">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{emp.slug}</p>
                                            <p className="text-[10px] text-gray-600 mt-1">{emp.ownerId}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${emp.plano === 'MASTER' ? 'bg-yellow-600/20 text-yellow-400' :
                                            emp.plano === 'PREMIUM' ? 'bg-purple-600/20 text-purple-400' :
                                                emp.plano === 'INDIVIDUAL' ? 'bg-blue-600/20 text-blue-400' :
                                                    'bg-gray-700 text-gray-400'
                                            }`}>
                                            {emp.plano}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {emp.status === 'ACTIVE' ? (
                                                <><CheckCircle2 className="text-green-500" size={16} /><span className="text-sm text-green-400">Ativo</span></>
                                            ) : (
                                                <><XCircle className="text-red-500" size={16} /><span className="text-sm text-red-400">Inativo</span></>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center text-white font-bold">{emp.totalClientes}</td>
                                    <td className="p-4 text-center text-white font-bold">{emp.totalProfissionais}</td>
                                    <td className="p-4 text-center text-white font-bold">{emp.totalAgendamentos}</td>
                                    <td className="p-4 text-right text-green-400 font-bold">R$ {emp.valor}</td>
                                    <td className="p-4">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => setClienteSelecionado(emp)}
                                                className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition"
                                                title="Ver detalhes"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => deletarCliente(emp.id, emp.name)}
                                                className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition"
                                                title="Deletar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE DETALHES */}
            {clienteSelecionado && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-700">
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black text-white mb-2">{clienteSelecionado.name}</h2>
                                    <p className="text-gray-400">Detalhes completos da empresa</p>
                                </div>
                                <button
                                    onClick={() => setClienteSelecionado(null)}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition"
                                >
                                    <XCircle className="text-gray-400" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-800 p-4 rounded-2xl">
                                    <p className="text-xs text-gray-500 mb-1">Slug</p>
                                    <p className="text-white font-bold">{clienteSelecionado.slug}</p>
                                    <a
                                        href={`https://www.nohud.com.br/${clienteSelecionado.slug}`}
                                        target="_blank"
                                        className="text-blue-400 text-xs flex items-center gap-1 mt-2 hover:underline"
                                    >
                                        Abrir página <ExternalLink size={12} />
                                    </a>
                                </div>
                                <div className="bg-gray-800 p-4 rounded-2xl">
                                    <p className="text-xs text-gray-500 mb-1">Owner ID</p>
                                    <p className="text-white font-mono text-xs break-all">{clienteSelecionado.ownerId}</p>
                                </div>
                                <div className="bg-gray-800 p-4 rounded-2xl">
                                    <p className="text-xs text-gray-500 mb-1">Plano</p>
                                    <p className="text-white font-bold text-lg">{clienteSelecionado.plano}</p>
                                </div>
                                <div className="bg-gray-800 p-4 rounded-2xl">
                                    <p className="text-xs text-gray-500 mb-1">Valor Mensal</p>
                                    <p className="text-green-400 font-bold text-lg">R$ {clienteSelecionado.valor}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-600/20">
                                    <Users className="text-blue-400 mb-2" size={24} />
                                    <p className="text-2xl font-black text-white">{clienteSelecionado.totalClientes}</p>
                                    <p className="text-xs text-blue-400">Clientes</p>
                                </div>
                                <div className="bg-purple-600/10 p-4 rounded-2xl border border-purple-600/20">
                                    <UserCircle className="text-purple-400 mb-2" size={24} />
                                    <p className="text-2xl font-black text-white">{clienteSelecionado.totalProfissionais}</p>
                                    <p className="text-xs text-purple-400">Profissionais</p>
                                </div>
                                <div className="bg-green-600/10 p-4 rounded-2xl border border-green-600/20">
                                    <Calendar className="text-green-400 mb-2" size={24} />
                                    <p className="text-2xl font-black text-white">{clienteSelecionado.totalAgendamentos}</p>
                                    <p className="text-xs text-green-400">Agendamentos</p>
                                </div>
                                <div className="bg-yellow-600/10 p-4 rounded-2xl border border-yellow-600/20">
                                    <Briefcase className="text-yellow-400 mb-2" size={24} />
                                    <p className="text-2xl font-black text-white">{clienteSelecionado.totalServicos}</p>
                                    <p className="text-xs text-yellow-400">Serviços</p>
                                </div>
                            </div>

                            {clienteSelecionado.stripeCustomerId && (
                                <div className="bg-gray-800 p-4 rounded-2xl">
                                    <p className="text-xs text-gray-500 mb-2">Stripe Customer ID</p>
                                    <p className="text-white font-mono text-sm">{clienteSelecionado.stripeCustomerId}</p>
                                    {clienteSelecionado.stripeSubscriptionId && (
                                        <p className="text-gray-400 font-mono text-xs mt-1">Sub: {clienteSelecionado.stripeSubscriptionId}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => deletarCliente(clienteSelecionado.id, clienteSelecionado.name)}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold transition"
                                >
                                    Deletar Cliente
                                </button>
                                <button
                                    onClick={() => setClienteSelecionado(null)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-2xl font-bold transition"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
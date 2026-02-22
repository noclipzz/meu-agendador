"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Plus, Search, Phone, Mail, History, X, Save, UserPlus, Pencil,
    Calendar, Clock, MapPin, FileText, CheckCircle2, UserCircle,
    DollarSign, Receipt, Trash2, Download, Image as ImageIcon,
    FileIcon, Loader2, UploadCloud, CreditCard, QrCode, Banknote, AlertTriangle,
    ClipboardList, Printer, ChevronDown, Eye
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { useAgenda } from "@/contexts/AgendaContext";

// --- HELPER: MÁSCARA DE TELEFONE ---
const formatarTelefone = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
};

const formatarCPF = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
};

const formatarCNPJ = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 14);
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
    if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    if (raw.length <= 12) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`;
};

const formatarCEP = (value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
};

export default function ClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(true);

    // loadingDetalhes serve para indicar se estamos baixando os dados extras (financeiro/anexos)
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    const [salvandoAnexo, setSalvandoAnexo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modais e Seleção
    const [modalAberto, setModalAberto] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
    const [abaAtiva, setAbaAtiva] = useState<"DADOS" | "FINANCEIRO" | "ANEXOS" | "PRONTUARIO">("DADOS");
    const [isEditing, setIsEditing] = useState(false);
    const [confirmarExclusao, setConfirmarExclusao] = useState<{ id: string, tipo: 'CLIENTE' | 'ANEXO' } | null>(null);

    // Estado para nova observação rápida
    const [novaObs, setNovaObs] = useState("");
    const [mostrarInputObs, setMostrarInputObs] = useState(false);
    const [editandoNota, setEditandoNota] = useState<{ index: number, text: string } | null>(null);

    // Prontuário
    const [prontuarioTemplates, setProntuarioTemplates] = useState<any[]>([]);
    const [prontuarioEntries, setProntuarioEntries] = useState<any[]>([]);
    const [prontuarioTemplateSelecionado, setProntuarioTemplateSelecionado] = useState<string>("");
    const [prontuarioFormData, setProntuarioFormData] = useState<Record<string, any>>({});
    const [prontuarioEditId, setProntuarioEditId] = useState<string | null>(null);
    const [prontuarioSalvando, setProntuarioSalvando] = useState(false);
    const [prontuarioVisualizando, setProntuarioVisualizando] = useState<any>(null);
    const [loadingProntuarios, setLoadingProntuarios] = useState(false);
    const [modalProntuarioAberto, setModalProntuarioAberto] = useState(false);
    const [empresaInfo, setEmpresaInfo] = useState<any>({ name: "", logo: "", plan: "", city: "" });
    const [printConfigModal, setPrintConfigModal] = useState<{ entry: any; dateVisible: boolean; signatureType: string } | null>(null);
    const [form, setForm] = useState({
        id: "", name: "", phone: "", email: "", clientType: "FISICA", cpf: "", cnpj: "", rg: "", inscricaoEstadual: "", photoUrl: "",
        birthDate: "", cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "", maritalStatus: "", status: "ATIVO"
    });

    // Query params para integração com a agenda
    const searchParams = useSearchParams();
    const router = useRouter();
    const { userRole } = useAgenda(); // Pegando role
    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

    async function handleCEPChange(cep: string) {
        const formatado = formatarCEP(cep);
        setForm(prev => ({ ...prev, cep: formatado }));

        const cleanCEP = formatado.replace(/\D/g, "");
        if (cleanCEP.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setForm(prev => ({
                        ...prev,
                        cep: formatado,
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }));
                    toast.success("Endereço localizado!");
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            }
        }
    }

    useEffect(() => { carregarClientes(); carregarEmpresa(); }, []);

    // Efeito para tratar query params da agenda (abrir ficha ou novo cadastro)
    // Efeito para tratar query params da agenda (abrir ficha ou novo cadastro)
    useEffect(() => {
        if (loading || clientes.length === 0 && !searchParams.get('novoCadastro')) return;

        const abrirFichaId = searchParams.get('abrirFicha');
        const novoCadastro = searchParams.get('novoCadastro');

        if (abrirFichaId) {
            const cliente = clientes.find(c => c.id === abrirFichaId);
            if (cliente) {
                abrirFichaCliente(cliente);
            } else {
                // Se o ID foi passado mas o cliente não existe (ex: excluído), mas temos dados de fallback
                const nomeFallback = searchParams.get('nome');
                if (nomeFallback) {
                    toast.info("Cliente vinculado não encontrado. Abrindo novo cadastro.", { duration: 4000 });
                    const telefone = searchParams.get('telefone') || '';
                    const bookingId = searchParams.get('bookingId') || '';
                    setForm(prev => ({
                        ...prev,
                        id: '',
                        name: nomeFallback,
                        phone: formatarTelefone(telefone),
                    }));
                    if (bookingId) setPendingBookingId(bookingId);
                    setModalAberto(true);
                }
            }
            router.replace('/painel/clientes', { scroll: false });
        } else if (novoCadastro === '1') {
            const nome = searchParams.get('nome') || '';
            const telefone = searchParams.get('telefone') || '';
            const bookingId = searchParams.get('bookingId') || '';
            setForm(prev => ({
                ...prev,
                id: '',
                name: nome,
                phone: formatarTelefone(telefone),
            }));
            if (bookingId) setPendingBookingId(bookingId);
            setModalAberto(true);
            router.replace('/painel/clientes', { scroll: false });
        }
    }, [loading, clientes]);

    async function carregarEmpresa() {
        try {
            const res = await fetch('/api/painel/config');
            const data = await res.json();
            if (data) {
                setEmpresaInfo({
                    name: data.name || "",
                    logo: data.logoUrl || "",
                    plan: data.plan || "",
                    city: data.city || "",
                    address: data.address || "",
                    phone: data.phone || "",
                    cnpj: data.cnpj || ""
                });
            }
        } catch { }
    }

    async function carregarClientes() {
        const res = await fetch('/api/clientes');
        const data = await res.json();
        if (Array.isArray(data)) {
            setClientes(data);
        } else {
            console.error("Erro ao carregar clientes:", data);
            setClientes([]);
        }
        setLoading(false);
    }

    async function abrirFichaCliente(clienteBasico: any) {
        setClienteSelecionado(clienteBasico);
        setAbaAtiva("DADOS");
        setLoadingDetalhes(true);
        // Reset prontuário
        setProntuarioEntries([]);
        setProntuarioTemplateSelecionado("");
        setProntuarioFormData({});
        setProntuarioEditId(null);
        setProntuarioVisualizando(null);

        // 2. Inicia o carregamento dos detalhes em background

        try {
            const res = await fetch(`/api/clientes/${clienteBasico.id}`);
            if (res.ok) {
                const dadosCompletos = await res.json();

                // 3. Atualiza o cliente selecionado mesclando os dados novos
                setClienteSelecionado((prev: any) => {
                    if (prev && prev.id === clienteBasico.id) {
                        return { ...prev, ...dadosCompletos };
                    }
                    return prev;
                });
            } else {
                toast.error("Não foi possível carregar o histórico completo.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDetalhes(false);
        }
    }

    async function salvarCliente() {
        if (!form.name) return toast.error("Nome obrigatório");
        const method = form.id ? 'PUT' : 'POST';
        const res = await fetch('/api/clientes', {
            method, body: JSON.stringify(form)
        });

        if (res.ok) {
            const clienteSalvo = await res.json();
            if (form.id) {
                setClientes(prev => prev.map(c => c.id === form.id ? clienteSalvo : c));
                if (clienteSelecionado?.id === form.id) {
                    setClienteSelecionado((prev: any) => ({ ...prev, ...clienteSalvo }));
                }
            } else {
                setClientes(prev => [...prev, clienteSalvo]);

                // Se veio da agenda, vincula o novo cliente ao agendamento
                if (pendingBookingId) {
                    try {
                        await fetch('/api/painel/vincular-cliente', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bookingId: pendingBookingId, clientId: clienteSalvo.id })
                        });
                    } catch (err) {
                        console.error('Erro ao vincular cliente ao agendamento:', err);
                    }
                    setPendingBookingId(null);
                }
            }
            toast.success(form.id ? "Dados atualizados!" : "Cliente cadastrado!");
            fecharModal();
        } else {
            const errorData = await res.json().catch(() => ({ error: "Erro ao processar solicitação." }));
            toast.error(errorData.error || "Erro ao salvar cliente.");
        }
    }

    async function adicionarNotaRapida() {
        if (!novaObs.trim()) return;
        const dataNota = format(new Date(), "dd/MM/yy 'às' HH:mm");
        const notaFormatada = `[${dataNota}]: ${novaObs}`;
        const novaStringNotas = clienteSelecionado.notes ? `${clienteSelecionado.notes}\n${notaFormatada}` : notaFormatada;

        const res = await fetch('/api/clientes', {
            method: 'PUT',
            body: JSON.stringify({ ...clienteSelecionado, notes: novaStringNotas })
        });

        if (res.ok) {
            const atualizado = await res.json();
            setClienteSelecionado((prev: any) => ({ ...prev, notes: novaStringNotas }));
            setClientes(prev => prev.map(c => c.id === atualizado.id ? { ...c, notes: novaStringNotas } : c));
            setNovaObs(""); setMostrarInputObs(false);
            toast.success("Observação adicionada!");
        }
    }

    async function deletarNota(index: number) {
        if (!clienteSelecionado) return;
        const notasArray = (clienteSelecionado.notes || "").split('\n');
        // Como exibimos em reverse(), o index aqui precisa ser mapeado de volta
        const indexOriginal = notasArray.length - 1 - index;
        const novasNotasArr = notasArray.filter((_: any, i: number) => i !== indexOriginal);
        const novaStringNotas = novasNotasArr.join('\n');

        const res = await fetch('/api/clientes', {
            method: 'PUT',
            body: JSON.stringify({ ...clienteSelecionado, notes: novaStringNotas })
        });

        if (res.ok) {
            setClienteSelecionado((prev: any) => ({ ...prev, notes: novaStringNotas }));
            setClientes(prev => prev.map(c => c.id === clienteSelecionado.id ? { ...c, notes: novaStringNotas } : c));
            toast.success("Observação removida!");
        }
    }

    async function salvarEdicaoNota() {
        if (!clienteSelecionado || !editandoNota) return;
        const notasArray = (clienteSelecionado.notes || "").split('\n');
        // Mapear o index reverso de volta
        const indexOriginal = notasArray.length - 1 - editandoNota.index;
        const novasNotasArr = [...notasArray];
        novasNotasArr[indexOriginal] = editandoNota.text;
        const novaStringNotas = novasNotasArr.join('\n');

        const res = await fetch('/api/clientes', {
            method: 'PUT',
            body: JSON.stringify({ ...clienteSelecionado, notes: novaStringNotas })
        });

        if (res.ok) {
            setClienteSelecionado((prev: any) => ({ ...prev, notes: novaStringNotas }));
            setClientes(prev => prev.map(c => c.id === clienteSelecionado.id ? { ...c, notes: novaStringNotas } : c));
            setEditandoNota(null);
            toast.success("Observação atualizada!");
        }
    }

    async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        toast.info("Enviando foto...");
        try {
            const blob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            if (blob.url) {
                setForm(prev => ({ ...prev, photoUrl: blob.url }));
                toast.success("Foto enviada!");
            } else {
                toast.error("Erro ao processar imagem.");
            }
        } catch (error: any) {
            console.error("ERRO_UPLOAD_FOTO:", error);
            toast.error("Erro no upload: " + (error.message || "Verifique o console"));
        }
    }

    async function handleUploadAnexo(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setSalvandoAnexo(true);
        try {
            const blob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            const resBanco = await fetch('/api/clientes/anexos', {
                method: 'POST',
                body: JSON.stringify({ name: file.name, url: blob.url, type: file.type, size: file.size, clientId: clienteSelecionado.id })
            });
            if (resBanco.ok) {
                const novoAnexo = await resBanco.json();
                setClienteSelecionado({ ...clienteSelecionado, attachments: [...(clienteSelecionado.attachments || []), novoAnexo] });
                toast.success("Arquivo anexado!");
            }
        } catch (error) { toast.error("Erro no upload."); }
        finally { setSalvandoAnexo(false); }
    }

    async function executarExclusao() {
        if (!confirmarExclusao) return;
        const { id, tipo } = confirmarExclusao;
        const url = tipo === 'CLIENTE' ? `/api/clientes/${id}` : '/api/clientes/anexos';
        const res = await fetch(url, { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.ok) {
            if (tipo === 'CLIENTE') {
                setClientes(prev => prev.filter(c => c.id !== id));
                setClienteSelecionado(null);
            } else {
                setClienteSelecionado({ ...clienteSelecionado, attachments: clienteSelecionado.attachments.filter((a: any) => a.id !== id) });
            }
            toast.success("Excluído com sucesso.");
        }
        setConfirmarExclusao(null);
    }

    function abrirEdicao(cliente: any) {
        setForm({
            ...cliente,
            clientType: cliente.clientType || "FISICA",
            phone: formatarTelefone(cliente.phone || ""),
            cpf: formatarCPF(cliente.cpf || ""),
            cnpj: formatarCNPJ(cliente.cnpj || ""),
            cep: formatarCEP(cliente.cep || ""),
            photoUrl: cliente.photoUrl || "",
            birthDate: cliente.birthDate || "",
            rg: cliente.rg || "",
            inscricaoEstadual: cliente.inscricaoEstadual || "",
            number: cliente.number || "",
            complement: cliente.complement || "",
            neighborhood: cliente.neighborhood || "",
            maritalStatus: cliente.maritalStatus || "",
            state: cliente.state || ""
        });
        setIsEditing(true);
        setModalAberto(true);
    }
    function fecharModal() { setModalAberto(false); setIsEditing(false); setForm({ id: "", name: "", phone: "", email: "", photoUrl: "", clientType: "FISICA", cpf: "", cnpj: "", rg: "", inscricaoEstadual: "", birthDate: "", cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "", maritalStatus: "", status: "ATIVO" }); }

    // === PRONTUÁRIO ===
    async function carregarProntuario() {
        if (!clienteSelecionado) return;
        setLoadingProntuarios(true);
        try {
            const [resTemplates, resEntries] = await Promise.all([
                fetch('/api/painel/prontuarios'),
                fetch(`/api/painel/prontuarios/entries?clientId=${clienteSelecionado.id}`)
            ]);
            const [tpls, ents] = await Promise.all([resTemplates.json(), resEntries.json()]);
            setProntuarioTemplates(Array.isArray(tpls) ? tpls : []);
            setProntuarioEntries(Array.isArray(ents) ? ents : []);
        } catch (error) {
            console.error("Erro ao carregar prontuários:", error);
        } finally {
            setLoadingProntuarios(false);
        }
    }

    async function salvarProntuario() {
        if (!prontuarioTemplateSelecionado || !clienteSelecionado) return;
        setProntuarioSalvando(true);
        try {
            const res = await fetch('/api/painel/prontuarios/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: prontuarioEditId || undefined,
                    templateId: prontuarioTemplateSelecionado,
                    clientId: clienteSelecionado.id,
                    data: prontuarioFormData
                })
            });
            if (res.ok) {
                toast.success(prontuarioEditId ? "Ficha atualizada!" : "Ficha salva!");
                setProntuarioFormData({});
                setProntuarioEditId(null);
                setProntuarioTemplateSelecionado("");
                setModalProntuarioAberto(false);
                carregarProntuario();
            } else {
                toast.error("Erro ao salvar ficha técnica");
            }
        } finally {
            setProntuarioSalvando(false);
        }
    }

    async function excluirProntuario(id: string) {
        if (!confirm("Tem certeza que deseja excluir esta ficha?")) return;
        try {
            const res = await fetch('/api/painel/prontuarios/entries', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                toast.success("Ficha excluída!");
                setProntuarioEntries(prontuarioEntries.filter(e => e.id !== id));
            } else {
                toast.error("Erro ao excluir ficha");
            }
        } catch { toast.error("Erro ao excluir"); }
    }

    function imprimirProntuario(entry: any) {
        setPrintConfigModal({ entry, dateVisible: true, signatureType: 'both' });
    }

    function executarImpressaoDaFicha() {
        if (!printConfigModal?.entry) return;
        const { entry, dateVisible, signatureType } = printConfigModal;

        const fields = entry.template?.fields as any[] || [];
        const data = entry.data as Record<string, any> || {};

        // Separar headers e campos normais
        const sections: { header: string; items: { label: string; value: string }[] }[] = [];
        let currentSection: { header: string; items: { label: string; value: string }[] } = { header: '', items: [] };

        fields.forEach((field: any) => {
            if (field.type === 'header') {
                if (currentSection.items.length > 0 || currentSection.header) {
                    sections.push(currentSection);
                }
                currentSection = { header: field.label, items: [] };
                return;
            }
            let valor = '';
            if (field.type === 'table') {
                const rows = data[field.id] as string[][] || [];
                const cols = field.options as string[] || [];
                if (rows.length === 0) {
                    valor = '—';
                } else {
                    let tableHtml = '<table style="width:100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; table-layout: fixed; word-wrap: break-word;"><thead><tr>';
                    cols.forEach(col => {
                        tableHtml += `<th style="border-bottom: 1px solid #f3f4f6; padding: 4px 6px; background: #f9fafb; text-align: left; color:#6b7280;">${col}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';
                    rows.forEach(row => {
                        tableHtml += '<tr>';
                        cols.forEach((_, i) => {
                            tableHtml += `<td style="border-bottom: 1px solid #f3f4f6; padding: 4px 6px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; white-space: pre-wrap;">${row[i] || ''}</td>`;
                        });
                        tableHtml += '</tr>';
                    });
                    tableHtml += '</tbody></table>';
                    valor = tableHtml;
                }
            } else {
                valor = field.type === 'checkbox' ? (data[field.id] ? '✅ Sim' : '✗ Não') :
                    field.type === 'checkboxGroup' ? (Array.isArray(data[field.id]) ? data[field.id].join(', ') : '—') :
                        data[field.id] || '—';

                if (field.type === 'checkbox' && data[field.id] && data[field.id + "_details"]) {
                    valor = `${valor} (${field.detailsLabel || 'Justificativa'}: ${data[field.id + "_details"]})`;
                }
            }

            currentSection.items.push({ label: field.label, value: String(valor) });
        });
        if (currentSection.items.length > 0 || currentSection.header) {
            sections.push(currentSection);
        }

        // Gerar HTML dos campos em duas colunas (COM SUPORTE MOBILE)
        let camposHtml = '';
        sections.forEach(section => {
            if (section.header) {
                camposHtml += `<div class="section-header">${section.header}</div>`;
            }
            camposHtml += '<div class="fields-grid">';
            section.items.forEach(item => {
                const isLong = item.value.length > 60;
                camposHtml += `<div class="field-item${isLong ? ' full-width' : ''}">
                    <div class="field-label">${item.label}</div>
                    <div class="field-value">${item.value}</div>
                </div>`;
            });
            camposHtml += '</div>';
        });

        const logoHtml = empresaInfo.logo
            ? `<img src="${empresaInfo.logo}" class="company-logo" />`
            : `<div class="company-logo-placeholder">🏥</div>`;

        const nomeEmpresa = empresaInfo.corporateName || empresaInfo.name || 'Empresa';

        const html = `<!DOCTYPE html><html><head><title>Ficha - ${clienteSelecionado?.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Inter',sans-serif; color:#1f2937; background:#fff; }
            .page { max-width:800px; margin:0 auto; padding:20px; }
            
            /* BOTÃO VOLTAR (APENAS PARA MOBILE/SCREEN) */
            .back-button { display:none; margin-bottom: 20px; font-size: 14px; font-weight: 800; color: #0d9488; text-decoration: none; align-items: center; gap: 5px; cursor: pointer; }
            @media screen and (max-width: 600px) { .back-button { display: flex; } .page { padding: 15px; } }

            /* HEADER */
            .header { display:flex; justify-content:space-between; align-items:center; padding-bottom:20px; border-bottom:3px solid #0d9488; margin-bottom:28px; }
            .header-left { display:flex; align-items:center; gap:14px; }
            .company-logo { width:52px; height:52px; border-radius:14px; object-fit:cover; border:2px solid #e5e7eb; }
            .company-logo-placeholder { width:52px; height:52px; border-radius:14px; background:#f0fdfa; display:flex; align-items:center; justify-content:center; font-size:26px; border:2px solid #ccfbf1; }
            .company-name { font-size:20px; font-weight:900; color:#0f172a; letter-spacing:-0.5px; }
            .company-subtitle { font-size:10px; color:#0d9488; font-weight:700; text-transform:uppercase; letter-spacing:2px; }
            .header-right { text-align:right; }
            .header-date { font-size:11px; color:#6b7280; font-weight:600; }
            .header-doc { font-size:9px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }

            /* TÍTULO */
            .doc-title { font-size:22px; font-weight:900; color:#0f172a; margin-bottom:4px; letter-spacing:-0.5px; }
            .doc-subtitle { font-size:11px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:2px; margin-bottom:20px; }

            /* PACIENTE */
            .client-box { background:linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%); padding:12px 18px; border-radius:14px; margin-bottom:16px; display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; border:1px solid #e0f2fe; }
            .client-item label { font-size:9px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:2px; }
            .client-item span { font-size:12px; color:#0f172a; font-weight:800; }
            .client-item.full { grid-column: 1 / -1; }

            /* SEÇÕES */
            .section-header { font-size:12px; font-weight:900; color:#0d9488; text-transform:uppercase; letter-spacing:1px; padding:10px 0 6px; border-bottom:1px solid #0d9488; margin-bottom:0; margin-top:8px; }

            /* GRID DE CAMPOS - UMA COLUNA */
            .fields-grid { display:flex; flex-direction: column; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; border-top:1px solid #e5e7eb; }
            .field-item { padding:8px 14px; border-bottom:1px solid #e5e7eb; }
            .field-label { font-size:10px; font-weight:800; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
            .field-value { font-size:14px; font-weight:700; color:#111827; word-break:break-word; }

            /* ASSINATURA */
            .signature { margin-top:60px; display:flex; justify-content:space-around; padding-top:20px; }
            .signature-block { text-align:center; }
            .signature-line { width:220px; border-top:1px solid #374151; margin-bottom:6px; }
            .signature-label { font-size:10px; color:#6b7280; font-weight:600; }

            /* RODAPÉ */
            .footer { margin-top:40px; text-align:center; font-size:9px; color:#9ca3af; padding-top:16px; border-top:1px solid #e5e7eb; }
            .footer strong { color:#6b7280; }

            @media print {
                body { padding:0; }
                .page { padding:20px; max-width:100%; }
                .back-button { display:none !important; }
                .section-header { break-after:avoid; }
                .fields-grid { break-inside:auto; }
                .field-item { break-inside:avoid; }
            }
        </style></head><body>
        <div class="page">
            <a href="javascript:window.close()" class="back-button">← Voltar para a Ficha</a>
            <div class="header">
                <div class="header-left">
                    ${logoHtml}
                    <div>
                        <div class="company-name">${nomeEmpresa}</div>
                    </div>
                </div>
                <div class="header-right">
                    <div class="header-date">${format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm")}</div>
                    <div class="header-doc">Documento Nº ${entry.id.slice(-6).toUpperCase()}</div>
                </div>
            </div>

            <h1 class="doc-title">${entry.template?.name}</h1>

            <div class="client-box">
                <div class="client-item"><label>Cliente</label><span>${clienteSelecionado?.name || '—'}</span></div>
                <div class="client-item"><label>${clienteSelecionado?.clientType === 'JURIDICA' ? 'CNPJ' : 'CPF'}</label><span>${clienteSelecionado?.clientType === 'JURIDICA' ? (clienteSelecionado?.cnpj || '—') : (clienteSelecionado?.cpf || '—')}</span></div>
                <div class="client-item"><label>Telefone</label><span>${clienteSelecionado?.phone || '—'}</span></div>
                <div class="client-item"><label>${clienteSelecionado?.clientType === 'JURIDICA' ? 'Insc. Estadual' : 'RG'}</label><span>${clienteSelecionado?.clientType === 'JURIDICA' ? (clienteSelecionado?.inscricaoEstadual || '—') : (clienteSelecionado?.rg || '—')}</span></div>
                <div class="client-item"><label>E-mail</label><span>${clienteSelecionado?.email || '—'}</span></div>
                ${clienteSelecionado?.clientType !== 'JURIDICA' ? `<div class="client-item"><label>Estado Civil</label><span>${clienteSelecionado?.maritalStatus || '—'}</span></div>` : ''}
                <div class="client-item full"><label>Endereço Completo</label><span>${clienteSelecionado?.address || ''}, ${clienteSelecionado?.number || ''} ${clienteSelecionado?.complement || ''} - ${clienteSelecionado?.neighborhood || ''} - ${clienteSelecionado?.city || ''}/${clienteSelecionado?.state || ''}</span></div>
            </div>

            ${camposHtml}

            ${dateVisible ? `
            <div style="margin-top: 40px; text-align: right; font-size: 13px; font-weight: 700; color: #1f2937; padding-right: 20px;">
                ${empresaInfo?.city || '___________________'}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>` : '<div style="margin-top: 40px;"></div>'}

            ${signatureType !== 'none' ? `
            <div class="signature">
                ${['prof', 'both'].includes(signatureType) ? `<div class="signature-block"><div class="signature-line"></div><div class="signature-label">Assinatura do Profissional</div></div>` : ''}
                ${['client', 'both', 'client_resp'].includes(signatureType) ? `<div class="signature-block"><div class="signature-line"></div><div class="signature-label">${clienteSelecionado?.name || 'Assinatura do Cliente'}</div></div>` : ''}
                ${['client_resp'].includes(signatureType) ? `<div class="signature-block"><div class="signature-line"></div><div class="signature-label">${empresaInfo?.corporateName || empresaInfo?.name || 'Assinatura da Empresa'}</div></div>` : ''}
            </div>` : ''}

            <div class="footer">
                <strong>${nomeEmpresa}</strong> — Documento gerado automaticamente pelo sistema em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
            </div>
        </div>
        </body></html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                setPrintConfigModal(null);
            }, 600);
        }
    }

    const filtrados = clientes.filter(c => c.name.toLowerCase().includes(busca.toLowerCase()) || c.phone?.includes(busca));

    if (loading) return <div className="p-10 text-center font-black text-gray-400 animate-pulse uppercase text-xs">Sincronizando CRM...</div>;

    return (
        <div className="space-y-6 pb-20 p-2 font-sans overflow-x-hidden">
            <div className="flex justify-between items-center px-2">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Gestão de Clientes</h1>
                {userRole === "ADMIN" && (
                    <button onClick={() => setModalAberto(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"><UserPlus size={20} /> Adicionar Cliente</button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 flex items-center gap-3 shadow-sm mx-2">
                <Search className="text-gray-400 ml-3" size={20} />
                <input className="bg-transparent outline-none flex-1 py-3 text-sm dark:text-white" placeholder="Pesquisar por nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                {filtrados.map(c => (
                    <div key={c.id} onClick={() => abrirFichaCliente(c)} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-500 shadow-sm transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-xl text-blue-600 shadow-sm border border-blue-100 dark:border-blue-800/30 overflow-hidden">
                                {c.photoUrl ? (
                                    <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                                ) : (
                                    c.name.charAt(0)
                                )}
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${c.status === 'ATIVO' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50 text-green-600' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 text-red-600'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'ATIVO' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-[9px] font-black uppercase tracking-wider">{c.status}</span>
                            </div>
                        </div>
                        <h3 className="font-black text-lg group-hover:text-blue-600 transition dark:text-white">{c.name}</h3>
                        <p className="text-sm text-gray-500">{c.phone || 'Sem telefone'}</p>
                    </div>
                ))}
            </div>

            {/* FICHA DO CLIENTE (HORIZONTAL COM ABAS) */}
            {clienteSelecionado && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-4">
                    <div className="bg-white dark:bg-gray-950 w-full md:max-w-6xl h-full md:max-h-[90vh] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">

                        {/* HEADER DA FICHA */}
                        <div className="p-4 md:p-8 border-b dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 dark:bg-white/5 shrink-0 gap-4">
                            <div className="flex items-center gap-4 md:gap-6 w-full">
                                <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-blue-600 flex items-center justify-center text-white text-xl md:text-3xl font-black shadow-xl shrink-0 overflow-hidden">
                                    {clienteSelecionado.photoUrl ? (
                                        <img src={clienteSelecionado.photoUrl} alt={clienteSelecionado.name} className="w-full h-full object-cover" />
                                    ) : (
                                        clienteSelecionado.name.charAt(0)
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl md:text-3xl font-black dark:text-white truncate" title={clienteSelecionado.name}>{clienteSelecionado.name}</h2>
                                    <div className="flex flex-col md:flex-row gap-1 md:gap-4 mt-1">
                                        <span className="text-blue-600 font-bold flex items-center gap-1 text-xs md:text-sm"><Phone size={12} className="md:size-3.5" /> {clienteSelecionado.phone}</span>
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${clienteSelecionado.status === 'ATIVO' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50 text-green-600' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 text-red-600'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${clienteSelecionado.status === 'ATIVO' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                            Cliente {clienteSelecionado.status}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* BOTÕES DE AÇÃO: EDITAR, EXCLUIR, FECHAR */}
                            <div className="flex gap-2 w-full md:w-auto justify-end">
                                {userRole === "ADMIN" && (
                                    <>
                                        <button onClick={() => abrirEdicao(clienteSelecionado)} className="flex-1 md:flex-none p-3 md:p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl md:rounded-2xl hover:bg-gray-50 transition text-blue-600 shadow-sm flex items-center justify-center" title="Editar"><Pencil size={18} className="md:size-5" /></button>
                                        <button onClick={() => setConfirmarExclusao({ id: clienteSelecionado.id, tipo: 'CLIENTE' })} className="flex-1 md:flex-none p-3 md:p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl md:rounded-2xl hover:bg-red-50 hover:text-red-500 transition text-gray-400 shadow-sm flex items-center justify-center" title="Excluir"><Trash2 size={18} className="md:size-5" /></button>
                                    </>
                                )}
                                <button onClick={() => setClienteSelecionado(null)} className="flex-1 md:flex-none p-3 md:p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl md:rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 transition text-gray-400 shadow-sm flex items-center justify-center" title="Fechar"><X size={18} className="md:size-5" /></button>
                            </div>
                        </div>

                        {/* SELETOR DE ABAS */}
                        <div className="flex px-8 pt-6 gap-8 border-b dark:border-gray-800 bg-white dark:bg-gray-950 overflow-x-auto shrink-0 relative z-10">
                            <button onClick={() => setAbaAtiva("DADOS")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "DADOS" ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-400"}`}>Geral</button>
                            <button onClick={() => setAbaAtiva("FINANCEIRO")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "FINANCEIRO" ? "border-b-4 border-green-600 text-green-600" : "text-gray-400"}`}>Financeiro</button>
                            <button onClick={() => setAbaAtiva("ANEXOS")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "ANEXOS" ? "border-b-4 border-purple-600 text-purple-600" : "text-gray-400"}`}>Documentos</button>
                            {empresaInfo.plan && empresaInfo.plan.toUpperCase() !== "INDIVIDUAL" && empresaInfo.plan.toUpperCase() !== "PREMIUM" && (
                                <button onClick={() => { setAbaAtiva("PRONTUARIO"); carregarProntuario(); }} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${abaAtiva === "PRONTUARIO" ? "border-b-4 border-teal-600 text-teal-600" : "text-gray-400"}`}><ClipboardList size={14} /> Ficha & Evolução</button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                            {abaAtiva === "DADOS" && (
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-12 lg:col-span-8 space-y-8">
                                        <section><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><FileText size={14} /> Documentação</h4>
                                            <div className="grid grid-cols-12 gap-4">
                                                {clienteSelecionado.clientType === 'JURIDICA' ? (
                                                    <>
                                                        <div className="col-span-6 lg:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CNPJ</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.cnpj || "---"}</p></div>
                                                        <div className="col-span-6 lg:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Inscrição Estadual</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.inscricaoEstadual || "---"}</p></div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="col-span-6 lg:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CPF</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.cpf || "---"}</p></div>
                                                        <div className="col-span-6 lg:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">RG</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.rg || "---"}</p></div>
                                                    </>
                                                )}
                                                <div className="col-span-6 lg:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Telefone</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.phone || "---"}</p></div>

                                                {clienteSelecionado.clientType !== 'JURIDICA' && (
                                                    <div className="col-span-6 lg:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Nasc.</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.birthDate && !isNaN(new Date(clienteSelecionado.birthDate).getTime()) ? format(new Date(clienteSelecionado.birthDate), "dd/MM/yyyy") : "---"}</p></div>
                                                )}

                                                <div className={`col-span-12 ${clienteSelecionado.clientType === 'JURIDICA' ? 'lg:col-span-9' : 'lg:col-span-8'} p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800 min-w-0`}><label className="text-[9px] font-black text-gray-400 uppercase">E-mail</label><p className="font-bold dark:text-white text-xs truncate" title={clienteSelecionado.email}>{clienteSelecionado.email || "---"}</p></div>

                                                {clienteSelecionado.clientType !== 'JURIDICA' && (
                                                    <div className="col-span-12 lg:col-span-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Estado Civil</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.maritalStatus || "---"}</p></div>
                                                )}
                                            </div>
                                        </section>
                                        <section><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><MapPin size={14} /> Localização</h4>
                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-6 md:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CEP</label><p className="font-bold dark:text-white text-xs truncate">{clienteSelecionado.cep || "---"}</p></div>
                                                <div className="col-span-6 md:col-span-9 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Endereço</label><p className="font-bold dark:text-white text-xs truncate" title={`${clienteSelecionado.address || ""} ${clienteSelecionado.number || ""}`}>{clienteSelecionado.address || "---"}{clienteSelecionado.number ? `, ${clienteSelecionado.number}` : ""}</p></div>

                                                <div className="col-span-6 md:col-span-5 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Bairro</label><p className="font-bold dark:text-white text-xs truncate">{clienteSelecionado.neighborhood || "---"}</p></div>
                                                <div className={`col-span-6 ${clienteSelecionado.complement ? 'md:col-span-4' : 'md:col-span-7'} p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800`}><label className="text-[9px] font-black text-gray-400 uppercase">Cidade / UF</label><p className="font-bold dark:text-white text-xs truncate">{clienteSelecionado.city || "---"}{clienteSelecionado.state ? ` / ${clienteSelecionado.state}` : ""}</p></div>

                                                {clienteSelecionado.complement && (
                                                    <div className="col-span-6 md:col-span-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Comp.</label><p className="font-bold dark:text-white text-xs truncate">{clienteSelecionado.complement}</p></div>
                                                )}
                                            </div>
                                        </section>
                                        <section>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                    <Plus size={14} /> Notas e Observações
                                                </h4>
                                                {userRole === "ADMIN" && (
                                                    <button onClick={() => setMostrarInputObs(!mostrarInputObs)} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm">
                                                        <Plus size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {mostrarInputObs && (
                                                <div className="flex gap-2 mb-6 animate-in slide-in-from-top-2">
                                                    <input
                                                        className="flex-1 border-2 dark:border-gray-800 p-3 rounded-2xl bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500 dark:text-white transition"
                                                        placeholder="Digite uma nova nota..."
                                                        value={novaObs}
                                                        onChange={e => setNovaObs(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && adicionarNotaRapida()}
                                                    />
                                                    <button onClick={adicionarNotaRapida} className="bg-green-600 text-white px-5 rounded-2x font-black text-xs uppercase shadow-lg shadow-green-600/20 hover:bg-green-700 transition">Salvar</button>
                                                </div>
                                            )}

                                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                                {clienteSelecionado.notes?.split('\n').filter((n: string) => n.trim() !== "").reverse().map((n: string, i: number) => (
                                                    <div key={i} className="group relative p-4 bg-yellow-50/40 dark:bg-yellow-500/5 rounded-2xl border border-yellow-100 dark:border-yellow-900/20 text-sm dark:text-gray-200 transition-all hover:border-yellow-200 dark:hover:border-yellow-800/50">
                                                        {editandoNota?.index === i ? (
                                                            <div className="space-y-2">
                                                                <textarea
                                                                    className="w-full bg-white dark:bg-gray-900 border-2 border-blue-500 p-3 rounded-xl outline-none font-bold text-xs shadow-inner"
                                                                    value={editandoNota.text}
                                                                    onChange={e => setEditandoNota({ ...editandoNota, text: e.target.value })}
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => setEditandoNota(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition">Cancelar</button>
                                                                    <button onClick={salvarEdicaoNota} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 transition">Salvar Alteração</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-start gap-4">
                                                                <p className="flex-1 leading-relaxed italic">{n}</p>
                                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                    {userRole === "ADMIN" && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => setEditandoNota({ index: i, text: n })}
                                                                                className="text-blue-400 hover:text-blue-500 p-1"
                                                                                title="Editar nota"
                                                                            >
                                                                                <Pencil size={14} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => { if (confirm("Deseja excluir esta nota?")) deletarNota(i); }}
                                                                                className="text-red-400 hover:text-red-500 p-1"
                                                                                title="Excluir nota"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )) || <p className="text-gray-400 text-xs text-center py-10 italic uppercase font-bold tracking-widest opacity-40">Nenhuma observação registrada.</p>}
                                            </div>
                                        </section>
                                    </div>
                                    <div className="col-span-12 lg:col-span-4 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] p-6 border dark:border-gray-800">
                                        <h4 className="text-sm font-black mb-6 uppercase text-blue-600 flex items-center gap-2"><History size={18} /> Últimas Visitas</h4>
                                        <div className="space-y-4">
                                            {loadingDetalhes && !clienteSelecionado.bookings ? (
                                                <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-blue-600 mb-2" /> <p className="text-[10px] uppercase text-gray-400 font-bold">Buscando histórico...</p></div>
                                            ) : (
                                                <>
                                                    {clienteSelecionado.bookings?.map((b: any) => (
                                                        <div key={b.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border dark:border-gray-800 flex justify-between items-center group hover:border-blue-500 transition-all">
                                                            <div>
                                                                <p className="font-black text-sm dark:text-white uppercase leading-none mb-1">{b.service?.name || "Serviço"}</p>
                                                                <p className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1 mb-1">
                                                                    <UserCircle size={10} /> Prof: {b.professional?.name || 'Não informado'}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-gray-400">{format(new Date(b.date), "dd/MM/yy 'às' HH:mm")}</p>
                                                            </div>
                                                            <span className="font-black text-green-600 text-sm">R$ {Number(b.service?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    ))}
                                                    {(!clienteSelecionado.bookings || clienteSelecionado.bookings.length === 0) && (
                                                        <p className="text-center text-xs text-gray-400">Nenhuma visita.</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {abaAtiva === "FINANCEIRO" && (
                                <div className="space-y-8 animate-in fade-in duration-500">

                                    {loadingDetalhes ? (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <div className="bg-white dark:bg-gray-900 shadow-xl rounded-full px-8 py-4 flex items-center gap-3 border dark:border-gray-800">
                                                <Loader2 className="animate-spin text-blue-600" size={24} />
                                                <span className="font-black text-xs uppercase tracking-widest text-gray-500">Carregando Ficha Financeira...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                                <div className="p-4 md:p-8 bg-green-50 dark:bg-green-900/10 rounded-3xl md:rounded-[2.5rem] border border-green-100 dark:border-green-900/30 text-center">
                                                    <p className="text-[10px] font-black text-green-600 uppercase mb-1">Total Já Pago</p>
                                                    <p className="text-xl md:text-3xl font-black text-green-600">R$ {(clienteSelecionado.invoices || []).filter((i: any) => i.status === "PAGO").reduce((acc: any, cur: any) => acc + Number(cur.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="p-4 md:p-8 bg-red-50 dark:bg-red-900/10 rounded-3xl md:rounded-[2.5rem] border border-red-100 dark:border-red-900/30 text-center">
                                                    <p className="text-[10px] font-black text-red-600 uppercase mb-1">Em Aberto</p>
                                                    <p className="text-xl md:text-3xl font-black text-red-600">R$ {(clienteSelecionado.invoices || []).filter((i: any) => i.status === "PENDENTE").reduce((acc: any, cur: any) => acc + Number(cur.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="p-4 md:p-8 bg-blue-50 dark:bg-blue-900/10 rounded-3xl md:rounded-[2.5rem] border border-blue-100 dark:border-blue-800 text-center">
                                                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Acumulado</p>
                                                    <p className="text-xl md:text-3xl font-black dark:text-white">R$ {(clienteSelecionado.invoices?.reduce((acc: any, cur: any) => acc + Number(cur.value), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2 ml-2"><Receipt size={18} /> Detalhamento Financeiro</h4>
                                                {clienteSelecionado.invoices?.map((inv: any) => (
                                                    <div key={inv.id} className="p-6 bg-white dark:bg-gray-900 border-2 dark:border-gray-800 rounded-[2rem] flex justify-between items-center hover:border-green-500 transition-all shadow-sm">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${inv.status === 'PAGO' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                                {inv.method === 'PIX' ? <QrCode size={24} /> : inv.method === 'CARTAO' ? <CreditCard size={24} /> : <Banknote size={24} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-black text-xs md:text-base dark:text-white uppercase tracking-tight truncate" title={inv.description}>{inv.description}</p>
                                                                {inv.status !== 'PAGO' && (
                                                                    <p className="text-[10px] font-bold text-red-400 uppercase">Venc: {format(new Date(inv.dueDate), "dd/MM/yyyy")}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className={`font-black text-sm md:text-xl ${inv.status === 'PAGO' ? 'text-green-600' : 'text-red-600'}`}>R$ {Number(inv.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{inv.status} • {inv.method || 'A DEFINIR'}</span>
                                                        </div>
                                                    </div>
                                                )) || <p className="text-center py-20 opacity-30 italic">Sem faturamentos registrados.</p>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {abaAtiva === "ANEXOS" && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center px-2"><h4 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2"><Plus size={18} /> Documentos e Fotos</h4>
                                        <label className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase cursor-pointer hover:bg-purple-700 transition flex items-center gap-2 shadow-lg">
                                            {salvandoAnexo ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}{salvandoAnexo ? "Subindo..." : "Novo Arquivo"}
                                            <input type="file" className="hidden" onChange={handleUploadAnexo} accept=".pdf,image/*" disabled={salvandoAnexo} />
                                        </label>
                                    </div>
                                    {loadingDetalhes && !clienteSelecionado.attachments ? (
                                        <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-purple-600 mb-2" /> <p className="text-[10px] uppercase text-gray-400 font-bold">Buscando arquivos...</p></div>
                                    ) : (
                                        <>
                                            <div className="bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] p-8 border dark:border-gray-800">
                                                <div className="flex justify-between items-center mb-6">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Armazenamento Utilizado</p>
                                                    <p className="text-[10px] font-black text-purple-600 uppercase">
                                                        {((clienteSelecionado.attachments?.reduce((acc: number, cur: any) => acc + (cur.size || 0), 0) || 0) / (1024 * 1024)).toFixed(2)} MB / 10 MB
                                                    </p>
                                                </div>
                                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-600 transition-all duration-500"
                                                        style={{ width: `${Math.min(100, ((clienteSelecionado.attachments?.reduce((acc: number, cur: any) => acc + (cur.size || 0), 0) || 0) / (10 * 1024 * 1024)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                {clienteSelecionado.attachments?.map((file: any) => (
                                                    <div key={file.id} className="p-4 md:p-6 bg-white dark:bg-gray-900 border-2 dark:border-gray-800 rounded-3xl md:rounded-[2.5rem] flex justify-between items-center group hover:border-purple-500 transition-all">
                                                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">{file.type.includes('image') ? <ImageIcon size={20} className="md:size-6" /> : <FileText size={20} className="md:size-6" />}</div>
                                                            <div className="min-w-0"><p className="font-black text-xs md:text-sm uppercase dark:text-white truncate" title={file.name}>{file.name}</p><p className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(file.createdAt), "dd MMM yyyy")}</p></div>
                                                        </div>
                                                        <div className="flex gap-1 md:gap-2 shrink-0">
                                                            <a href={file.url} target="_blank" className="p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-blue-600 transition"><Download size={16} className="md:size-[18px]" /></a>
                                                            {userRole === "ADMIN" && (
                                                                <button onClick={() => setConfirmarExclusao({ id: file.id, tipo: 'ANEXO' })} className="p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-red-500 transition"><Trash2 size={16} className="md:size-[18px]" /></button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )) || <div className="col-span-full py-20 text-center opacity-30 italic">Sem anexos.</div>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {abaAtiva === "PRONTUARIO" && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    {loadingProntuarios ? (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <Loader2 className="animate-spin text-teal-600 mb-2" size={30} />
                                            <p className="text-[10px] uppercase text-gray-400 font-bold">Carregando fichas...</p>
                                        </div>
                                    ) : prontuarioVisualizando ? (
                                        /* VISUALIZAÇÃO DO PRONTUÁRIO PREENCHIDO */
                                        <div>
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                                <button onClick={() => setProntuarioVisualizando(null)} className="text-sm text-blue-600 font-extrabold hover:underline flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl transition-all">
                                                    <ChevronDown className="rotate-90" size={16} /> Voltar para Lista
                                                </button>
                                                <button onClick={() => imprimirProntuario(prontuarioVisualizando)} className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-teal-700 transition"><Printer size={14} /> Imprimir</button>
                                            </div>
                                            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-8">
                                                <h3 className="text-xl font-black dark:text-white mb-1">{prontuarioVisualizando.template?.name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-6">Preenchido em {format(new Date(prontuarioVisualizando.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                                                <div className="space-y-4">
                                                    {(prontuarioVisualizando.template?.fields as any[])?.map((field: any) => {
                                                        const valor = (prontuarioVisualizando.data as any)?.[field.id];
                                                        if (field.type === 'header') return <h4 key={field.id} className="text-sm font-black text-teal-600 uppercase tracking-widest pt-4 border-t dark:border-gray-800">{field.label}</h4>;
                                                        return (
                                                            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b dark:border-gray-800/50">
                                                                {field.type === 'table' ? (
                                                                    <div className="col-span-1 sm:col-span-3">
                                                                        <p className="text-[10px] sm:text-xs font-black sm:font-bold text-gray-400 sm:text-gray-500 uppercase sm:normal-case mb-2">{field.label}</p>
                                                                        <div className="overflow-x-auto w-full border dark:border-gray-700 rounded-xl">
                                                                            <table className="w-full text-left border-collapse text-xs table-fixed">
                                                                                <thead>
                                                                                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                                                        {(field.options as string[] || []).map((col, i) => (
                                                                                            <th key={i} className="border-b dark:border-gray-700 p-2 px-3 font-bold text-gray-500 uppercase">{col}</th>
                                                                                        ))}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {(Array.isArray(valor) ? valor : []).map((row: string[], ri: number) => (
                                                                                        <tr key={ri} className="border-b dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                                                                                            {(field.options as string[] || []).map((_, ci) => (
                                                                                                <td key={ci} className="border-r dark:border-gray-700/50 last:border-0 p-2 px-3 dark:text-gray-300 font-medium break-words whitespace-pre-wrap">{row[ci] || ''}</td>
                                                                                            ))}
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <p className="text-[10px] sm:text-xs font-black sm:font-bold text-gray-400 sm:text-gray-500 uppercase sm:normal-case">{field.label}</p>
                                                                        <p className="text-sm font-bold dark:text-white sm:col-span-2">
                                                                            {field.type === 'checkbox' ? (
                                                                                <span>
                                                                                    {valor ? '✅ Sim' : '❌ Não'}
                                                                                    {valor && (prontuarioVisualizando.data as any)?.[field.id + "_details"] && (
                                                                                        <span className="text-gray-400 font-normal ml-2 italic">
                                                                                            ({field.detailsLabel || 'Justificativa'}: {(prontuarioVisualizando.data as any)[field.id + "_details"]})
                                                                                        </span>
                                                                                    )}
                                                                                </span>
                                                                            ) :
                                                                                field.type === 'checkboxGroup' ? (Array.isArray(valor) ? valor.join(', ') : '---') :
                                                                                    valor || '---'}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* LISTA + BOTÃO NOVO */
                                        <>
                                            {prontuarioTemplates.length === 0 ? (
                                                <div className="text-center py-16">
                                                    <ClipboardList size={40} className="text-gray-300 mx-auto mb-4" />
                                                    <p className="text-sm text-gray-500 font-bold">Nenhum modelo de ficha técnica criado.</p>
                                                    <p className="text-xs text-gray-400 mt-1">Vá em <b>Fichas Técnicas</b> no menu lateral para criar um modelo.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* BOTÃO NOVO PRONTUÁRIO */}
                                                    <button
                                                        onClick={() => { setProntuarioTemplateSelecionado(""); setProntuarioFormData({}); setProntuarioEditId(null); setModalProntuarioAberto(true); }}
                                                        className="w-full border-2 border-dashed border-teal-300 dark:border-teal-800 p-5 rounded-2xl text-teal-600 font-bold text-sm hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={18} /> Nova Ficha Técnica
                                                    </button>

                                                    {/* LISTA DE PRONTUÁRIOS PREENCHIDOS */}
                                                    {prontuarioEntries.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-3 flex items-center gap-2"><History size={14} /> Fichas Preenchidas ({prontuarioEntries.length})</h4>
                                                            <div className="space-y-2">
                                                                {prontuarioEntries.map((entry: any) => (
                                                                    <div key={entry.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl hover:border-teal-500 transition group">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center shrink-0"><FileText size={18} /></div>
                                                                            <div>
                                                                                <p className="font-bold text-sm dark:text-white">{entry.template?.name}</p>
                                                                                <p className="text-[10px] text-gray-400 font-bold">{format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                                                            <button onClick={() => setProntuarioVisualizando(entry)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-teal-600 transition" title="Visualizar"><Eye size={14} /></button>
                                                                            <button onClick={() => { setProntuarioTemplateSelecionado(entry.templateId); setProntuarioFormData(entry.data as any); setProntuarioEditId(entry.id); setModalProntuarioAberto(true); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-blue-600 transition" title="Editar"><Pencil size={14} /></button>
                                                                            <button onClick={() => imprimirProntuario(entry)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-green-600 transition" title="Imprimir"><Printer size={14} /></button>
                                                                            {userRole === "ADMIN" && (
                                                                                <button onClick={() => excluirProntuario(entry.id)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-red-500 transition" title="Excluir"><Trash2 size={14} /></button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {prontuarioEntries.length === 0 && (
                                                        <div className="text-center py-10 opacity-40">
                                                            <ClipboardList size={30} className="mx-auto mb-2" />
                                                            <p className="text-xs font-bold">Nenhuma ficha preenchida para este cliente.</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RODAPÉ ESTILIZADO */}
                        <div className="p-4 md:p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
                            <div className="flex gap-4 md:gap-8 w-full md:w-auto justify-around md:justify-start">
                                <div><p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1">Total Gasto</p><p className="font-black text-xl md:text-2xl text-green-600">R$ {clienteSelecionado.bookings?.reduce((acc: any, b: any) => acc + Number(b.service?.price || 0), 0) || "0"}</p></div>
                                <div className="border-l dark:border-gray-800 pl-4 md:pl-8"><p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1">Frequência</p><p className="font-black text-xl md:text-2xl text-blue-600">{clienteSelecionado.bookings?.length || 0}x</p></div>
                            </div>
                            <div className="text-center md:text-right w-full md:w-auto"><p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">Ficha atualizada em tempo real</p><p className="text-[8px] md:text-[9px] text-gray-500 mt-0.5 md:mt-1 uppercase font-bold">Registro: {clienteSelecionado.createdAt ? format(new Date(clienteSelecionado.createdAt), "dd/MM/yyyy") : "---"}</p></div>
                        </div>
                    </div>
                </div>
            )}

            {modalAberto && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-5xl max-h-[90vh] relative shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border dark:border-gray-800">
                        {/* HEADER FIXO */}
                        <div className="p-8 pb-4 shrink-0 flex justify-between items-center">
                            <h2 className="text-3xl font-black dark:text-white px-2 tracking-tighter">{isEditing ? "Editar Ficha Técnica" : "Novo Cliente"}</h2>
                            <button onClick={fecharModal} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-500 transition shadow-sm"><X size={24} /></button>
                        </div>

                        {/* CONTEÚDO SCROLLÁVEL */}
                        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                            <div className="space-y-8 px-2">
                                {/* SEÇÃO 0: FOTO E IDENTIFICAÇÃO */}
                                <div className="flex flex-col md:flex-row gap-6 items-start px-2">
                                    <div className="shrink-0 flex flex-col items-center gap-2">
                                        <div className="w-24 h-24 rounded-[2rem] bg-gray-100 flex items-center justify-center overflow-hidden border-2 dark:border-gray-700 relative group">
                                            {form.photoUrl ? (
                                                <img src={form.photoUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserCircle size={48} className="text-gray-300" />
                                            )}
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white font-bold text-xs uppercase">
                                                <UploadCloud size={24} />
                                                <input type="file" className="hidden" onChange={handleUploadFoto} accept="image/*" />
                                            </label>
                                        </div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Foto do<br />Cliente</p>
                                    </div>
                                    <div className="flex-1 w-full space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-3">{form.clientType === 'JURIDICA' ? 'Razão Social / Nome Fantasia' : 'Nome Completo'}</label>
                                                <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={form.clientType === 'JURIDICA' ? "Nome da empresa" : "Nome do cliente"} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Telefone / WhatsApp</label>
                                                <input type="tel" maxLength={15} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.phone} onChange={e => setForm({ ...form, phone: formatarTelefone(e.target.value) })} placeholder="(00) 00000-0000" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">URL da Foto (Opcional)</label>
                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition text-xs" value={form.photoUrl} onChange={e => setForm({ ...form, photoUrl: e.target.value })} placeholder="Cole um link de imagem..." />
                                        </div>
                                    </div>
                                </div>

                                {/* SEÇÃO 1: DADOS PESSOAIS */}
                                <section>
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                            <UserCircle size={16} /> Documentação {form.clientType === 'JURIDICA' ? 'Empresarial' : 'Pessoal'}
                                        </h3>
                                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1">
                                            <button
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition shadow-sm ${form.clientType === 'FISICA' ? 'bg-white dark:bg-gray-700 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                onClick={() => setForm({ ...form, clientType: 'FISICA', cnpj: '', inscricaoEstadual: '' })}
                                            >
                                                Física
                                            </button>
                                            <button
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition shadow-sm ${form.clientType === 'JURIDICA' ? 'bg-white dark:bg-gray-700 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                onClick={() => setForm({ ...form, clientType: 'JURIDICA', cpf: '', rg: '', birthDate: '', maritalStatus: '' })}
                                            >
                                                Jurídica
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[2.5rem] border dark:border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-6">
                                        {form.clientType === 'JURIDICA' ? (
                                            <>
                                                <div className="md:col-span-6 space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3">CNPJ</label>
                                                    <input maxLength={18} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: formatarCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" />
                                                </div>
                                                <div className="md:col-span-6 space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Inscrição Estadual</label>
                                                    <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.inscricaoEstadual} onChange={e => setForm({ ...form, inscricaoEstadual: e.target.value })} placeholder="Isento, ou nº IE" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="md:col-span-4 space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3">CPF</label>
                                                    <input maxLength={14} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.cpf} onChange={e => setForm({ ...form, cpf: formatarCPF(e.target.value) })} placeholder="000.000.000-00" />
                                                </div>
                                                <div className="md:col-span-4 space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3">RG</label>
                                                    <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })} placeholder="Registro Geral" />
                                                </div>
                                                <div className="md:col-span-4 space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Data de Nascimento</label>
                                                    <input type="date" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
                                                </div>
                                                <div className="md:col-span-12 lg:col-span-12 space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Estado Civil</label>
                                                    <select className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })}>
                                                        <option value="">Selecione...</option>
                                                        <option value="Solteiro(a)">Solteiro(a)</option>
                                                        <option value="Casado(a)">Casado(a)</option>
                                                        <option value="Divorciado(a)">Divorciado(a)</option>
                                                        <option value="Viúvo(a)">Viúvo(a)</option>
                                                        <option value="União Estável">União Estável</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                        <div className="md:col-span-12 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">E-mail para Contato</label>
                                            <input type="email" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="exemplo@email.com" />
                                        </div>
                                    </div>
                                </section>

                                {/* SEÇÃO 2: ENDEREÇO */}
                                <section>
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
                                        <MapPin size={16} /> Endereço Residencial
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[2.5rem] border dark:border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-6">
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">CEP</label>
                                            <div className="relative">
                                                <input maxLength={9} className="w-full border-2 dark:border-gray-700 p-4 pr-10 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.cep} onChange={e => handleCEPChange(e.target.value)} placeholder="00000-000" />
                                                <Search className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                        <div className="md:col-span-7 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Rua / Avenida</label>
                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Logradouro" />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Número</label>
                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="Nº" />
                                        </div>

                                        <div className="md:col-span-4 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Bairro</label>
                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} placeholder="Bairro" />
                                        </div>
                                        <div className="md:col-span-4 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Complemento</label>
                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.complement} onChange={e => setForm({ ...form, complement: e.target.value })} placeholder="Apto, Bloco..." />
                                        </div>
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Cidade</label>
                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Cidade" />
                                        </div>
                                        <div className="md:col-span-1 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">UF</label>
                                            <input maxLength={2} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition uppercase text-center" value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} placeholder="UF" />
                                        </div>
                                    </div>
                                </section>

                                {/* SEÇÃO 3: OUTROS */}
                                <section>
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 px-2">
                                        <ClipboardList size={16} /> Outras Informações
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[2.5rem] border dark:border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-6">
                                        <div className="md:col-span-4 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Status do Cliente</label>
                                            <select className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                                <option value="ATIVO">ATIVO</option>
                                                <option value="INATIVO">INATIVO</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-8 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Observações Internas (Resumo)</label>
                                            <textarea rows={2} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas gerais sobre o cliente..." />
                                            <p className="text-[9px] text-gray-400 font-bold ml-4">* As notas podem ser editadas/excluídas individualmente diretamente na ficha do cliente.</p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* RODAPÉ FIXO */}
                        <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
                            <button onClick={salvarCliente} className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition flex items-center justify-center gap-3 active:scale-[0.98]">
                                <Save size={20} /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO ESTILIZADO */}
            {confirmarExclusao && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
                    <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] w-full max-w-sm text-center shadow-2xl border dark:border-gray-800 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div>
                        <h2 className="text-2xl font-black mb-2 dark:text-white tracking-tighter uppercase">Excluir?</h2>
                        <p className="text-gray-500 text-sm mb-8 font-medium">Os dados serão removidos permanentemente. Confirmar?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConfirmarExclusao(null)} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black text-[10px] uppercase text-gray-600 dark:text-gray-300">Não</button>
                            <button onClick={executarExclusao} className="p-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20">Sim, excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL FLUTUANTE DO PRONTUÁRIO */}
            {modalProntuarioAberto && clienteSelecionado && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[120] p-4">
                    <div className="bg-white dark:bg-gray-950 w-full max-w-3xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        {/* HEADER DO MODAL */}
                        <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black dark:text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white"><ClipboardList size={20} /></div>
                                    {prontuarioEditId ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 ml-[52px]">Paciente: <b className="text-gray-700 dark:text-gray-300">{clienteSelecionado.name}</b></p>
                            </div>
                            <button onClick={() => { setModalProntuarioAberto(false); setProntuarioFormData({}); setProntuarioEditId(null); setProntuarioTemplateSelecionado(""); }} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 transition text-gray-400 shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        {/* CONTEÚDO SCROLLÁVEL */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {/* SELETOR DE TEMPLATE */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Modelo da Ficha</label>
                                <select
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white outline-none focus:border-teal-500"
                                    value={prontuarioTemplateSelecionado}
                                    onChange={e => { setProntuarioTemplateSelecionado(e.target.value); if (!prontuarioEditId) setProntuarioFormData({}); }}
                                >
                                    <option value="">Selecione um modelo...</option>
                                    {prontuarioTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            {/* CAMPOS DINÂMICOS */}
                            {prontuarioTemplateSelecionado && (() => {
                                const template = prontuarioTemplates.find((t: any) => t.id === prontuarioTemplateSelecionado);
                                if (!template) return null;
                                return (
                                    <div className="space-y-5">
                                        {(template.fields as any[]).map((field: any) => (
                                            <div key={field.id}>
                                                {field.type === 'header' && (
                                                    <h5 className="text-sm font-black text-teal-600 uppercase tracking-widest pt-6 pb-2 border-t-2 border-teal-200 dark:border-teal-800 mt-2">{field.label}</h5>
                                                )}
                                                {field.type === 'text' && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                        <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })} />
                                                    </div>
                                                )}
                                                {field.type === 'textarea' && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                        <textarea rows={4} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })} />
                                                    </div>
                                                )}
                                                {field.type === 'number' && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                        <input type="number" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })} />
                                                    </div>
                                                )}
                                                {field.type === 'date' && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                        <input type="date" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })} />
                                                    </div>
                                                )}
                                                {field.type === 'select' && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                        <select className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={prontuarioFormData[field.id] || ''} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.value })}>
                                                            <option value="">Selecione...</option>
                                                            {field.options?.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                                {field.type === 'checkbox' && (
                                                    <div className="space-y-3">
                                                        <label className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-2 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-500 transition">
                                                            <input type="checkbox" className="w-6 h-6 accent-teal-600 rounded" checked={prontuarioFormData[field.id] || false} onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.checked })} />
                                                            <span className="text-sm font-bold dark:text-white">{field.label}</span>
                                                            {field.required && <span className="text-red-500 text-xs">*</span>}
                                                        </label>

                                                        {field.allowsDetails && prontuarioFormData[field.id] && (
                                                            <div className="ml-10 animate-in slide-in-from-top-2 duration-200">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{field.detailsLabel || 'Justificativa'}</label>
                                                                <input
                                                                    className="w-full border-2 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition"
                                                                    placeholder="Descreva aqui..."
                                                                    value={prontuarioFormData[field.id + "_details"] || ''}
                                                                    onChange={e => setProntuarioFormData({ ...prontuarioFormData, [field.id + "_details"]: e.target.value })}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {field.type === 'checkboxGroup' && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-2 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {field.options?.map((opt: string, i: number) => (
                                                                <label key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-500 transition text-sm">
                                                                    <input type="checkbox" className="accent-teal-600 w-5 h-5" checked={(prontuarioFormData[field.id] || []).includes(opt)} onChange={e => {
                                                                        const arr = prontuarioFormData[field.id] || [];
                                                                        setProntuarioFormData({ ...prontuarioFormData, [field.id]: e.target.checked ? [...arr, opt] : arr.filter((v: string) => v !== opt) });
                                                                    }} />
                                                                    <span className="font-bold dark:text-white">{opt}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {field.type === 'table' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                        <div className="overflow-x-auto border-2 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden">
                                                            <table className="w-full text-left border-collapse text-sm">
                                                                <thead>
                                                                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                                        {field.options?.map((col: string, i: number) => <th key={i} className="p-3 font-black text-xs text-gray-500 uppercase tracking-widest border-b dark:border-gray-700">{col}</th>)}
                                                                        <th className="p-3 border-b dark:border-gray-700 w-10"></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(prontuarioFormData[field.id] as string[][] || []).map((row: string[], ri: number) => (
                                                                        <tr key={ri} className="border-b dark:border-gray-700/50 last:border-0 group hover:bg-gray-50 dark:hover:bg-gray-800/20 transition">
                                                                            {field.options?.map((_: string, ci: number) => (
                                                                                <td key={ci} className="p-2 border-r dark:border-gray-700/50 last:border-0">
                                                                                    <textarea
                                                                                        rows={2}
                                                                                        className="w-full bg-transparent outline-none font-bold dark:text-white px-2 py-1 focus:bg-gray-100 dark:focus:bg-gray-800 rounded transition resize-y min-h-[40px]"
                                                                                        value={row[ci] || ''}
                                                                                        onChange={e => {
                                                                                            const arr = [...(prontuarioFormData[field.id] as string[][] || [])];
                                                                                            if (!arr[ri]) arr[ri] = [];
                                                                                            arr[ri][ci] = e.target.value;
                                                                                            setProntuarioFormData({ ...prontuarioFormData, [field.id]: arr });
                                                                                        }}
                                                                                        placeholder={`---`}
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                            <td className="p-2 text-center">
                                                                                <button onClick={() => {
                                                                                    const arr = [...(prontuarioFormData[field.id] as string[][] || [])];
                                                                                    arr.splice(ri, 1);
                                                                                    setProntuarioFormData({ ...prontuarioFormData, [field.id]: arr });
                                                                                }} className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                            <div className="p-3 bg-gray-50 dark:bg-gray-800/30 border-t dark:border-gray-700">
                                                                <button onClick={() => {
                                                                    const arr = [...(prontuarioFormData[field.id] as string[][] || [])];
                                                                    arr.push(new Array(field.options?.length || 0).fill(''));
                                                                    setProntuarioFormData({ ...prontuarioFormData, [field.id]: arr });
                                                                }} className="text-xs font-bold text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 px-3 py-2 rounded-xl transition flex items-center gap-2 inline-flex"><Plus size={14} /> Adicionar Linha</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* BOTÃO SALVAR FIXO NO RODAPÉ */}
                        {prontuarioTemplateSelecionado && (
                            <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0">
                                <button
                                    onClick={salvarProntuario}
                                    disabled={prontuarioSalvando}
                                    className="w-full bg-teal-600 text-white p-5 rounded-2xl font-black text-base hover:bg-teal-700 transition flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-teal-600/20"
                                >
                                    {prontuarioSalvando ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                                    {prontuarioSalvando ? 'Salvando...' : (prontuarioEditId ? 'Atualizar Ficha' : 'Salvar Ficha')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE IMPRESSÃO - OPÇÕES PERSONALIZADAS OBRIGATORIAS */}
            {printConfigModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
                            <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                                <Printer size={22} className="text-teal-600" /> Imprimir Ficha
                            </h2>
                            <button onClick={() => setPrintConfigModal(null)} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-500 transition text-gray-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Assinatura */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileIcon size={14} /> Bloco de Assinaturas
                                </label>
                                <div className="space-y-2">
                                    {[
                                        { id: 'none', label: 'Não exibir bloco de assinaturas' },
                                        { id: 'client', label: 'Apenas Assinatura do Cliente' },
                                        { id: 'prof', label: 'Apenas Assinatura do Profissional' },
                                        { id: 'both', label: 'Cliente e Profissional' },
                                        { id: 'client_resp', label: 'Cliente e Empresa' },
                                    ].map(opt => (
                                        <label key={opt.id} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${printConfigModal.signatureType === opt.id ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'}`}>
                                            <input
                                                type="radio"
                                                name="signatureOption"
                                                className="accent-teal-600 w-4 h-4"
                                                checked={printConfigModal.signatureType === opt.id}
                                                onChange={() => setPrintConfigModal({ ...printConfigModal, signatureType: opt.id })}
                                            />
                                            <span className={`font-bold text-sm ${printConfigModal.signatureType === opt.id ? 'text-teal-700 dark:text-teal-400' : 'text-gray-600 dark:text-gray-300'}`}>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Data */}
                            <div className="space-y-3 pt-2 border-t dark:border-gray-800">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={14} /> Exibição da Data
                                </label>
                                <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer hover:border-teal-500 transition-all">
                                    <div className="relative flex items-center w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={printConfigModal.dateVisible}
                                            onChange={(e) => setPrintConfigModal({ ...printConfigModal, dateVisible: e.target.checked })}
                                        />
                                        <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-teal-500 transition-all"></div>
                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6"></div>
                                    </div>
                                    <span className="font-bold text-sm text-gray-600 dark:text-gray-300">Mostrar a data atual no rodapé</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                            <button
                                onClick={executarImpressaoDaFicha}
                                className="w-full bg-teal-600 text-white p-4 rounded-xl font-black text-sm hover:bg-teal-700 transition-all flex justify-center items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95"
                            >
                                <Printer size={18} /> Gerar PDF (Imprimir)
                            </button>
                        </div>
                    </div>
                </div >
            )
            }
        </div >
    );
}
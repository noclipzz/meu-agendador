"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Plus, Search, Phone, Mail, History, X, Save, UserPlus, Pencil,
    Calendar, Clock, MapPin, FileText, CheckCircle2, UserCircle,
    DollarSign, Receipt, Trash2, Download, Image as ImageIcon,
    FileIcon, Loader2, UploadCloud, CreditCard, QrCode, Banknote, AlertTriangle,
    ClipboardList, Printer, ChevronDown, Eye, ShieldCheck, Link2, PenTool, CheckCircle, SlidersHorizontal
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { useAgenda } from "@/contexts/AgendaContext";
import * as XLSX from "xlsx";
import {
    validateCPF, validateEmail,
    formatarTelefone, formatarCPF, formatarCNPJ, formatarCEP
} from "@/lib/validators";
import { saveAs } from "file-saver";

function ModalPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || typeof document === 'undefined') return null;
    const target = document.getElementById('modal-root') || document.body;
    return createPortal(children, target);
}

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
    const [modalImportarAberto, setModalImportarAberto] = useState(false);
    const [importErros, setImportErros] = useState<string[]>([]);
    const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
    const [abaAtiva, setAbaAtiva] = useState<"DADOS" | "HISTORICO" | "FINANCEIRO" | "ANEXOS" | "FICHAS">("DADOS");
    const [filtroHistorico, setFiltroHistorico] = useState({ dataInicial: "", dataFinal: "", servico: "", profissional: "" });
    const [isEditing, setIsEditing] = useState(false);
    const [confirmarExclusao, setConfirmarExclusao] = useState<{ id: string, tipo: 'CLIENTE' | 'ANEXO' | 'TERMO' | 'FICHA' } | null>(null);

    // Termos de Consentimento
    const [modalTermoAberto, setModalTermoAberto] = useState(false);
    const [termoFormData, setTermoFormData] = useState({ title: "", content: "" });
    const [gerandoTermo, setGerandoTermo] = useState(false);

    // Estado para nova observação rápida
    const [novaObs, setNovaObs] = useState("");
    const [mostrarInputObs, setMostrarInputObs] = useState(false);
    const [editandoNota, setEditandoNota] = useState<{ index: number, text: string } | null>(null);

    // Fichas Técnicas
    const [fichaTemplates, setFichaTemplates] = useState<any[]>([]);
    const [fichaEntries, setFichaEntries] = useState<any[]>([]);
    const [fichaTemplateSelecionado, setFichaTemplateSelecionado] = useState<string>("");
    const [fichaFormData, setFichaFormData] = useState<Record<string, any>>({});
    const [fichaEditId, setFichaEditId] = useState<string | null>(null);
    const [fichaSalvando, setFichaSalvando] = useState(false);
    const [fichaVisualizando, setFichaVisualizando] = useState<any>(null);
    const [loadingFichas, setLoadingFichas] = useState(false);
    const [modalFichaAberto, setModalFichaAberto] = useState(false);
    const [technicalProfessionals, setTechnicalProfessionals] = useState<any[]>([]);
    const [empresaInfo, setEmpresaInfo] = useState<any>({ name: "", logo: "", plan: "", city: "", hasDigitalSignatureModule: false });
    const [printConfigModal, setPrintConfigModal] = useState<{
        entry: any;
        dateVisible: boolean;
        twoColumns: boolean;
        signatures: { client: boolean; prof: boolean; company: boolean; technical: boolean; digitalA1: boolean };
        selectedTechnicalId?: string;
        useDigitalSignature: boolean;
        includeQR: boolean;
        docNumber: string;
        customFooter: string;
        a1Choice?: 'company' | 'technical' | 'prof' | 'none';
    } | null>(null);
    const [signingPdf, setSigningPdf] = useState(false);
    const [form, setForm] = useState({
        id: "", name: "", phone: "", email: "", clientType: "FISICA", cpf: "", cnpj: "", rg: "", inscricaoEstadual: "", photoUrl: "",
        birthDate: "", cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "", maritalStatus: "", status: "ATIVO",
        corporateName: "", openingDate: "", cnae: "", legalRepresentative: ""
    });

    // Query params para integração com a agenda
    const searchParams = useSearchParams();
    const router = useRouter();
    const { userRole } = useAgenda(); // Pegando role
    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

    async function handleCNPJChange(cnpj: string) {
        const formatado = formatarCNPJ(cnpj);
        setForm(prev => ({ ...prev, cnpj: formatado }));

        const cleanCNPJ = formatado.replace(/\D/g, "");
        if (cleanCNPJ.length === 14) {
            toast.info("Buscando dados do CNPJ...");
            try {
                const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
                const data = await res.json();
                if (data && !data.message) {
                    setForm(prev => ({
                        ...prev,
                        name: data.nome_fantasia || data.razao_social || prev.name,
                        corporateName: data.razao_social || prev.corporateName,
                        openingDate: data.data_abertura ? data.data_abertura.split('-').reverse().join('/') : prev.openingDate,
                        cnae: data.cnae_fiscal_descricao || data.cnae_fiscal || prev.cnae,
                        legalRepresentative: data.qsa && data.qsa.length > 0 ? data.qsa.map((s: any) => s.nome).join(', ') : prev.legalRepresentative,
                        email: data.email || prev.email,
                        phone: data.ddd_telefone_1 ? formatarTelefone(data.ddd_telefone_1) : prev.phone,
                        cep: data.cep ? formatarCEP(data.cep) : prev.cep,
                        address: data.logradouro || prev.address,
                        number: data.numero || prev.number,
                        complement: data.complemento || prev.complement,
                        neighborhood: data.bairro || prev.neighborhood,
                        city: data.municipio || prev.city,
                        state: data.uf || prev.state,
                    }));
                    toast.success("Dados da empresa carregados!");
                }
            } catch (error) {
                console.error("Erro ao buscar CNPJ:", error);
                toast.error("Erro ao buscar dados do CNPJ.");
            }
        }
    }

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

    useEffect(() => {
        carregarResponsaveisTecnicos();
        carregarClientes();
        carregarEmpresa();
    }, []);

    async function carregarResponsaveisTecnicos() {
        try {
            const res = await fetch('/api/painel/profissionais');
            const data = await res.json();
            setTechnicalProfessionals(data.filter((p: any) => p.isTechnicalResponsible));
        } catch { }
    }

    // Salvar preferências sempre que mudarem
    useEffect(() => {
        if (printConfigModal) {
            const prefs = {
                dateVisible: printConfigModal.dateVisible,
                twoColumns: printConfigModal.twoColumns,
                signatures: printConfigModal.signatures
            };
            localStorage.setItem('nohud_print_prefs', JSON.stringify(prefs));
        }
    }, [printConfigModal?.dateVisible, printConfigModal?.twoColumns, printConfigModal?.signatures]);

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
                    number: data.number || "",
                    complement: data.complement || "",
                    neighborhood: data.neighborhood || "",
                    state: data.state || "",
                    cep: data.cep || "",
                    phone: data.phone || "",
                    cnpj: data.cnpj || "",
                    corporateName: data.corporateName || "",
                    signatureUrl: data.signatureUrl || "",
                    technicalSignatureUrl: data.technicalSignatureUrl || "",
                    technicalCertificadoA1Url: data.technicalCertificadoA1Url || "",
                    technicalCertificadoSenha: data.technicalCertificadoSenha || "",
                    certificadoA1Url: data.certificadoA1Url || "",
                    hasDigitalSignatureModule: data.hasDigitalSignatureModule || false
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
        // Reset ficha técnica
        setFichaEntries([]);
        setFichaTemplateSelecionado("");
        setFichaFormData({});
        setFichaEditId(null);
        setFichaVisualizando(null);

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

    async function processarImportacao(file: File) {
        if (!file) return;

        setImportErros([]);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const sheet = workbook.Sheets[firstSheet];

                // Converte para JSON
                const rawJsonData = XLSX.utils.sheet_to_json(sheet);

                if (rawJsonData.length === 0) {
                    toast.error("O arquivo está vazio.");
                    return;
                }

                // Mapeia colunas em português para as chaves em inglês esperadas pela API
                const jsonData = rawJsonData.map((row: any) => ({
                    name: row.Nome || row.name || row.NOME,
                    phone: row.Telefone || row.telefone || row.phone || row.TELEFONE,
                    email: row.Email || row.email || row.EMAIL,
                    clientType: row.TipoDaPessoa || row.clientType || 'FISICA',
                    cpf: row.CPF || row.cpf,
                    cnpj: row.CNPJ || row.cnpj,
                    address: row.Endereco || row.address,
                    number: row.Numero || row.number,
                    complement: row.Complemento || row.complement,
                    neighborhood: row.Bairro || row.neighborhood,
                    city: row.Cidade || row.city,
                    state: row.Estado || row.state,
                    notes: row.Observacoes || row.notes || row.Observação
                })).filter((c: any) => c.name); // Ignora linhas sem nome

                if (jsonData.length === 0) {
                    toast.error("Nenhum cliente válido (com nome) encontrado no arquivo.");
                    return;
                }

                const res = await fetch('/api/clientes/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clients: jsonData })
                });

                const result = await res.json();

                if (res.ok) {
                    if (result.importados > 0) {
                        toast.success(`Importados ${result.importados} clientes com sucesso!`);
                    } else {
                        toast.warning(`Nenhum cliente importado.`);
                    }

                    if (result.erros && result.erros.length > 0) {
                        setImportErros(result.erros);
                        toast.error(`Atenção: Houve ${result.erros.length} erros ou duplicações.`);
                    } else {
                        setModalImportarAberto(false);
                    }

                    carregarClientes(); // Recarrega a lista
                } else {
                    toast.error(result.error || "Erro ao importar.");
                    if (result.erros && result.erros.length > 0) {
                        setImportErros(result.erros);
                    }
                }
            } catch (error) {
                console.error("Erro ao ler excel:", error);
                toast.error("Erro ao processar o arquivo Excel.");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function baixarModeloExcel() {
        const cabecalho = [
            {
                Nome: "João Silva",
                Telefone: "(11) 99999-9999",
                Email: "joao@email.com",
                TipoDaPessoa: "FISICA",
                CPF: "111.222.333-44",
                CNPJ: "",
                Endereco: "Rua Exemplo",
                Numero: "123",
                Complemento: "Apt 4",
                Bairro: "Centro",
                Cidade: "São Paulo",
                Estado: "SP",
                Observacoes: "Cliente VIP"
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(cabecalho);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, "modelo_importacao_clientes.xlsx");
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

    async function gerarTermo() {
        if (!termoFormData.title || !termoFormData.content) return toast.error("Preencha título e conteúdo do termo.");
        try {
            setGerandoTermo(true);
            const res = await fetch("/api/clientes/termos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: clienteSelecionado.id,
                    title: termoFormData.title,
                    content: termoFormData.content
                }),
            });
            if (res.ok) {
                const novoTermo = await res.json();
                setClienteSelecionado({ ...clienteSelecionado, consentTerms: [novoTermo, ...(clienteSelecionado.consentTerms || [])] });
                toast.success("Termo de consentimento gerado com sucesso.");
                setTermoFormData({ title: "", content: "" });
                setModalTermoAberto(false);
            } else {
                toast.error("Erro ao gerar termo.");
            }
        } catch {
            toast.error("Erro interno.");
        } finally {
            setGerandoTermo(false);
        }
    }

    async function executarExclusao() {
        if (!confirmarExclusao) return;
        const { id, tipo } = confirmarExclusao;
        const url = tipo === 'CLIENTE' ? `/api/clientes/${id}` : tipo === 'TERMO' ? `/api/clientes/termos/${id}` : tipo === 'FICHA' ? '/api/painel/fichas-tecnicas/entries' : '/api/clientes/anexos';
        const res = await fetch(url, { method: 'DELETE', body: tipo === 'CLIENTE' || tipo === 'TERMO' ? undefined : JSON.stringify({ id }) });
        if (res.ok) {
            if (tipo === 'CLIENTE') {
                setClientes(prev => prev.filter(c => c.id !== id));
                setClienteSelecionado(null);
            } else if (tipo === 'TERMO') {
                setClienteSelecionado({ ...clienteSelecionado, consentTerms: clienteSelecionado.consentTerms.filter((t: any) => t.id !== id) });
            } else if (tipo === 'FICHA') {
                setFichaEntries(prev => prev.filter(e => e.id !== id));
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
            state: cliente.state || "",
            corporateName: cliente.corporateName || "",
            openingDate: cliente.openingDate || "",
            cnae: cliente.cnae || "",
            legalRepresentative: cliente.legalRepresentative || ""
        });
        setIsEditing(true);
        setModalAberto(true);
    }
    function fecharModal() { setModalAberto(false); setIsEditing(false); setForm({ id: "", name: "", phone: "", email: "", photoUrl: "", clientType: "FISICA", cpf: "", cnpj: "", rg: "", inscricaoEstadual: "", birthDate: "", cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "", maritalStatus: "", status: "ATIVO", corporateName: "", openingDate: "", cnae: "", legalRepresentative: "" }); }

    // === FICHAS TÉCNICAS ===
    async function carregarFichas() {
        if (!clienteSelecionado) return;
        setLoadingFichas(true);
        try {
            const [resTemplates, resEntries] = await Promise.all([
                fetch('/api/painel/fichas-tecnicas'),
                fetch(`/api/painel/fichas-tecnicas/entries?clientId=${clienteSelecionado.id}`)
            ]);
            const [tpls, ents] = await Promise.all([resTemplates.json(), resEntries.json()]);
            setFichaTemplates(Array.isArray(tpls) ? tpls : []);
            setFichaEntries(Array.isArray(ents) ? ents : []);
        } catch (error) {
            console.error("Erro ao carregar fichas técnicas:", error);
        } finally {
            setLoadingFichas(false);
        }
    }

    async function salvarFicha() {
        if (!fichaTemplateSelecionado || !clienteSelecionado) return;
        setFichaSalvando(true);
        try {
            const res = await fetch('/api/painel/fichas-tecnicas/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: fichaEditId || undefined,
                    templateId: fichaTemplateSelecionado,
                    clientId: clienteSelecionado.id,
                    data: fichaFormData
                })
            });
            if (res.ok) {
                toast.success(fichaEditId ? "Ficha atualizada!" : "Ficha salva!");
                setFichaFormData({});
                setFichaEditId(null);
                setFichaTemplateSelecionado("");
                setModalFichaAberto(false);
                carregarFichas();
            } else {
                toast.error("Erro ao salvar ficha técnica");
            }
        } finally {
            setFichaSalvando(false);
        }
    }

    async function excluirFicha(id: string) {
        setConfirmarExclusao({ id, tipo: 'FICHA' });
    }

    function imprimirFicha(entry: any) {
        if (!entry) return;

        // Se já estiver bloqueado, usa as configurações que foram salvas no momento da tranca
        if (entry.isLocked) {
            const savedSettings = typeof entry.printSettings === 'string' 
                ? JSON.parse(entry.printSettings) 
                : entry.printSettings;
            
            executarImpressaoDaFichaDirect(
                entry,
                savedSettings.dateVisible ?? true,
                savedSettings.signatures || { client: true, prof: true, company: false, technical: false, digitalA1: false },
                savedSettings.useDigitalSignature ?? !!empresaInfo?.hasDigitalSignatureModule,
                savedSettings.includeQR ?? true,
                savedSettings.twoColumns ?? false,
                savedSettings.docNumber || entry.id.slice(-6).toUpperCase(),
                savedSettings.customFooter || "",
                savedSettings.selectedTechnicalId
            );
            return;
        }

        const savedPrintPrefs = localStorage.getItem('nohud_print_prefs');
        let initialPrefs = {
            dateVisible: true,
            twoColumns: false,
            signatures: { client: true, prof: true, company: false, technical: false, digitalA1: false },
            useDigitalSignature: !!empresaInfo?.hasDigitalSignatureModule,
            includeQR: true
        };

        if (savedPrintPrefs) {
            try {
                initialPrefs = { ...initialPrefs, ...JSON.parse(savedPrintPrefs) };
            } catch (e) { }
        }

        setPrintConfigModal({
            entry,
            docNumber: entry.id.slice(-6).toUpperCase(),
            customFooter: "",
            a1Choice: 'none',
            ...initialPrefs
        });
    }

    async function executarImpressaoDaFicha() {
        if (!printConfigModal?.entry) return;
        const { entry, dateVisible, signatures, useDigitalSignature, includeQR, twoColumns, docNumber, customFooter, selectedTechnicalId, a1Choice } = printConfigModal;

        // --- BLOQUEIO PERMANENTE NA PRIMEIRA IMPRESSÃO ---
        if (!entry.isLocked) {
            try {
                const lockRes = await fetch('/api/painel/fichas-tecnicas/entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: entry.id,
                        templateId: entry.templateId,
                        clientId: entry.clientId,
                        data: entry.data,
                        lock: true,
                        printSettings: { dateVisible, signatures, useDigitalSignature, includeQR, twoColumns, docNumber, customFooter, selectedTechnicalId }
                    })
                });
                
                if (lockRes.ok) {
                    const updatedEntry = await lockRes.json();
                    setFichaEntries(prev => prev.map(h => h.id === entry.id ? { ...h, ...updatedEntry } : h));
                    if (fichaVisualizando?.id === entry.id) setFichaVisualizando({ ...fichaVisualizando, ...updatedEntry });
                    toast.success("Documento finalizado e autenticado!");
                }
            } catch (err) { console.error(err); }
        }

        executarImpressaoDaFichaDirect(entry, dateVisible, signatures, useDigitalSignature, includeQR, twoColumns, docNumber, customFooter, selectedTechnicalId, a1Choice);
    }

    async function executarImpressaoDaFichaDirect(entry: any, dateVisible: boolean, signatures: any, useDigitalSignature: boolean, includeQR: boolean, twoColumns: boolean, docNumber: string, customFooter: string, selectedTechnicalId?: string, a1Choice?: string) {

        const fields = entry.template?.fields as any[] || [];
        const data = entry.data as Record<string, any> || {};

        // Separar headers e campos normais
        const sections: { header: string; items: { label: string; value: string; width: string }[] }[] = [];
        let currentSection: { header: string; items: { label: string; value: string; width: string }[] } = { header: '', items: [] };

        fields.forEach((field: any) => {
            if (field.conditional) {
                const dependOnId = field.conditional.dependsOnId;
                const requiredValue = field.conditional.dependsOnValue;
                const actualValue = data[dependOnId];

                let shouldShow = false;
                if (typeof requiredValue === 'boolean') {
                    shouldShow = requiredValue === true ? !!actualValue : !actualValue;
                } else {
                    if (Array.isArray(actualValue)) {
                        shouldShow = actualValue.includes(requiredValue);
                    } else {
                        shouldShow = actualValue === requiredValue;
                    }
                }
                if (!shouldShow) return;
            }

            if (field.type === 'header' || field.type === 'static') {
                if (currentSection.items.length > 0 || currentSection.header) {
                    sections.push(currentSection);
                }
                if (field.type === 'header') {
                    currentSection = { header: field.label, items: [] };
                } else {
                    currentSection.items.push({ label: '', value: field.label, width: '100%' });
                }
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
            } else if (field.type === 'image') {
                const imgData = data[field.id];
                valor = imgData ? `<img src="${imgData}" style="max-height: 200px; max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 5px;" />` : '—';
            } else if (field.type === 'slider') {
                valor = data[field.id] !== undefined ? String(data[field.id]) : '—';
            } else if (field.type === 'currency') {
                valor = data[field.id] ? `R$ ${Number(data[field.id]).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
            } else {
                valor = field.type === 'checkbox' ? (data[field.id] ? '✅ Sim' : '✗ Não') :
                    field.type === 'checkboxGroup' ? (Array.isArray(data[field.id]) ? data[field.id].join(', ') : '—') :
                        data[field.id] || '—';

                if (field.type === 'checkbox' && data[field.id] && data[field.id + "_details"]) {
                    valor = `${valor} (${field.detailsLabel || 'Justificativa'}: ${data[field.id + "_details"]})`;
                }
            }

            currentSection.items.push({ label: field.label, value: String(valor), width: field.width || "100%" });
        });
        if (currentSection.items.length > 0 || currentSection.header) {
            sections.push(currentSection);
        }

        // --- GERAR QR CODE ---
        let qrCodeDataUrl = "";
        if (includeQR) {
            try {
                const verifyUrl = `${window.location.origin}/verificar/documento/${entry.id}`;
                qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { 
                    margin: 1, 
                    width: 200, 
                    color: { 
                        dark: signatures.digitalA1 ? '#064e3b' : '#0d9488', 
                        light: '#ffffff' 
                    } 
                });
            } catch (err) { console.error("Erro QR Code:", err); }
        }

        // Gerar HTML dos campos com suporte a larguras (%)
        let camposHtml = '';
        sections.forEach(section => {
            const templateName = entry.template?.name?.trim().toUpperCase();
            const sectionHeader = section.header?.trim().toUpperCase();

            if (sectionHeader && sectionHeader !== templateName) {
                camposHtml += `<div class="section-header">${section.header}</div>`;
            }
            camposHtml += '<div class="fields-grid">';
            section.items.forEach(item => {
                const containsTable = item.value.includes('<table');
                const containsImg = item.value.includes('<img');
                const isStatic = item.label === ''; // Convention for static fields
                const isLong = item.value.length > 80 || containsTable || containsImg || isStatic;

                if (isStatic) {
                    camposHtml += `<div class="field-item w-100" style="background: #eff6ff; border-left: 4px solid #3b82f6; border-right: 1.5px solid #e2e8f0; border-bottom: 1.5px solid #e2e8f0; margin: 5px 0;">
                        <div class="field-value" style="color: #1e40af; font-weight: 700; text-transform: none; font-size: 11px; padding: 4px 0;">${item.value}</div>
                    </div>`;
                    return;
                }

                let widthClass = 'w-100';
                if (!isLong && !twoColumns) {
                    if (item.width === '50%') widthClass = 'w-50';
                    else if (item.width === '33%') widthClass = 'w-33';
                    else if (item.width === '25%') widthClass = 'w-25';
                    else if (item.width === '66%') widthClass = 'w-66';
                    else if (item.width === '75%') widthClass = 'w-75';
                }
                if (twoColumns && !isLong) widthClass = 'w-50';
                if (isLong) widthClass = 'w-100'; // Override if too long

                camposHtml += `<div class="field-item ${widthClass}">
                    <div class="field-label">${item.label}</div>
                    <div class="field-value">${item.value}</div>
                </div>`;
            });
            camposHtml += '</div>';
        });

        const logoHtml = empresaInfo.logo
            ? `<img src="${empresaInfo.logo}" class="company-logo" />`
            : `<div class="company-logo-placeholder">📋</div>`;

        const nomeEmpresa = empresaInfo.corporateName || empresaInfo.name || 'Empresa';

        const html = `<!DOCTYPE html><html><head><title>Ficha - ${clienteSelecionado?.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Inter',sans-serif; color:#1f2937; background:#fff; height: 100%; display: flex; flex-direction: column; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { width: 100%; max-width: 800px; margin: 0 auto; padding: 40px 30px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
            @media screen and (max-width: 600px) { .page { padding: 15px; } }
            
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #0d9488; padding-bottom: 15px; }
            .header-left { display: flex; align-items: center; gap: 15px; }
            .company-logo { width: 45px; height: 45px; object-fit: contain; }
            .company-name { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
            
            .auth-badge { display: flex; align-items: center; gap: 8px; border: 1px solid #ccfbf1; background: #f0fdfa; padding: 6px 12px; border-radius: 8px; }
            .auth-text { text-align: left; }
            .auth-label { font-size: 8px; font-weight: 900; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px; }
            .auth-hash { font-size: 7px; font-family: monospace; color: #64748b; }
            .qr-code { width: 35px; height: 35px; }
            
            .header-right { text-align: right; }
            .header-date { font-size: 11px; font-weight: 700; color: #1e293b; }
            .header-doc { font-size: 9px; font-weight: 600; color: #64748b; margin-top: 2px; }

            .doc-title { font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 25px; margin-top: 10px; }
            
            .client-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px 20px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; }
            .client-item { display: flex; flex-direction: column; }
            .client-item label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
            .client-item span { font-size: 12px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
            .client-item.full { grid-column: span 2; }

            .section-title { font-size: 12px; font-weight: 900; color: #0d9488; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px; margin-bottom: 10px; clear: both; display: block; width: 100%; }
            .section-header { font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; background: #f8fafc; padding: 8px 15px; border: 1.5px solid #e2e8f0; border-bottom: none; clear: both; display: block; width: 100%; margin-top: 10px; }
            
            .fields-grid { border: 1.5px solid #e2e8f0; border-radius: 0; display: flex; flex-wrap: wrap; flex-direction: row; border-bottom: none; border-right: none; }
            .field-item { border-bottom: 1.5px solid #e2e8f0; border-right: 1.5px solid #e2e8f0; padding: 6px 15px; display: flex; flex-direction: column; gap: 2px; box-sizing: border-box; }
            .field-label { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; }
            .field-value { font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.4; word-break: break-word; }
            
            /* Class helpers for flexible width */
            .w-100 { width: 100%; }
            .w-50 { width: 50%; }
            .w-33 { width: 33.3333%; }
            .w-25 { width: 25%; }
            .w-66 { width: 66.6666%; }
            .w-75 { width: 75%; }
            
            .date-row { margin-top: 40px; text-align: right; font-size: 13px; font-weight: 700; color: #1e293b; }
            
            .signatures-container { margin-top: 60px; display: flex; justify-content: space-around; align-items: flex-end; gap: 40px; }
            .signature-block { flex: 1; text-align: center; max-width: 250px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; min-height: 90px; }
            .signature-image { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 250px; height: 120px; object-fit: contain; object-position: center bottom; mix-blend-mode: multiply; z-index: 0; pointer-events: none; }
            .signature-line { width: 100%; border-top: 1.5px solid #0f172a; position: relative; z-index: 1; }
            .signature-label { font-size: 10px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-top: 8px; width: 100%; }

            .signature-a1 { border: 1.5px solid #0d9488; background: #fff; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; max-width: 220px; flex: 1; position: relative; }
            .a1-title { font-size: 7px; font-weight: 900; color: #0d9488; text-transform: uppercase; margin-bottom: 3px; display: flex; align-items: center; gap: 4px; width: 100%; }
            .a1-name { font-size: 9px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.1; }
            .a1-details { font-size: 7px; color: #334155; margin-top: 1px; font-weight: 600; line-height: 1.3; font-family: monospace; letter-spacing: -0.2px; width: 100%; }
            .a1-footer { display: none; }

            .footer-line { border-top: 1px solid #e2e8f0; margin-top: auto; padding-top: 15px; text-align: center; }
            .footer-text { font-size: 10px; font-weight: 600; color: #64748b; }
            .footer-text strong { color: #1e293b; }

            @media print {
                body { padding:0; }
                .page { padding: 40px; max-width: 100%; border: none; }
                .back-button { display:none !important; }
                .fields-grid { break-inside: auto; }
                .field-item { break-inside: avoid; }
            }
        </style></head><body>
        <div class="page">
            
            <div class="header">
                <div class="header-left">
                    ${logoHtml}
                    <div class="company-name">${nomeEmpresa}</div>
                </div>
                
                ${includeQR ? `
                <div class="auth-badge" style="${signatures.digitalA1 ? 'border: 2px solid #0d9488; background: #ecfdf5;' : ''}">
                    <div class="auth-text">
                        <div class="auth-label" style="${signatures.digitalA1 ? 'color: #065f46; font-weight: 900;' : ''}">
                            ${signatures.digitalA1 ? 'VALIDAR ASSINATURA A1' : 'AUTENTICIDADE'}
                        </div>
                        <div class="auth-hash">${entry.id.slice(0, 10).toUpperCase()}</div>
                    </div>
                    <img src="${qrCodeDataUrl}" class="qr-code" />
                </div>
                ` : ''}
                
                <div class="header-right">
                    <div class="header-date">${format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm")}</div>
                    <div class="header-doc">Nº ${docNumber || entry.id.slice(-6).toUpperCase()}</div>
                </div>
            </div>

            <h1 class="doc-title">${entry.template?.name}</h1>

            <div class="client-box" style="margin-bottom: 10px; padding: 12px 20px;">
                <div class="client-item"><label>Empresa</label><span>${nomeEmpresa}</span></div>
                <div class="client-item"><label>CNPJ</label><span>${empresaInfo?.cnpj || '—'}</span></div>
                <div class="client-item"><label>Telefone</label><span>${empresaInfo?.phone || '—'}</span></div>
                <div class="client-item full"><label>Endereço Completo</label><span>${empresaInfo?.address || ''}${empresaInfo?.number ? ', ' + empresaInfo.number : ''}${empresaInfo?.complement ? ' ' + empresaInfo.complement : ''}${empresaInfo?.neighborhood ? ' - ' + empresaInfo.neighborhood : ''}${empresaInfo?.city ? ' - ' + empresaInfo.city : ''}${empresaInfo?.state ? '/' + empresaInfo.state : ''}</span></div>
            </div>

            <div class="client-box" style="margin-bottom: 25px; padding: 12px 20px;">
                <div class="client-item"><label>Cliente</label><span>${clienteSelecionado?.name || '—'}</span></div>
                <div class="client-item"><label>${clienteSelecionado?.clientType === 'JURIDICA' ? 'CNPJ' : 'CPF'}</label><span>${clienteSelecionado?.clientType === 'JURIDICA' ? (clienteSelecionado?.cnpj || '—') : (clienteSelecionado?.cpf || '—')}</span></div>
                <div class="client-item"><label>Telefone</label><span>${clienteSelecionado?.phone || '—'}</span></div>
                <div class="client-item"><label>${clienteSelecionado?.clientType === 'JURIDICA' ? 'Insc. Estadual' : 'RG'}</label><span>${clienteSelecionado?.clientType === 'JURIDICA' ? (clienteSelecionado?.inscricaoEstadual || '—') : (clienteSelecionado?.rg || '—')}</span></div>
                <div class="client-item"><label>E-mail</label><span>${clienteSelecionado?.email || '—'}</span></div>
                ${clienteSelecionado?.clientType !== 'JURIDICA' ? `<div class="client-item"><label>Estado Civil</label><span>${clienteSelecionado?.maritalStatus || '—'}</span></div>` : ''}
                <div class="client-item ${clienteSelecionado?.clientType !== 'JURIDICA' ? 'full' : ''}"><label>Endereço Completo</label><span>${clienteSelecionado?.address || ''}, ${clienteSelecionado?.number || ''} ${clienteSelecionado?.complement || ''} - ${clienteSelecionado?.neighborhood || ''} - ${clienteSelecionado?.city || ''}/${clienteSelecionado?.state || ''}</span></div>
            </div>


            <div class="fields-grid">${camposHtml}</div>

            ${dateVisible ? `
            <div class="date-row">
                ${empresaInfo?.city || '___________________'}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>` : ''}

            <div class="signatures-container">
                ${signatures.client ? `
                    <div class="signature-block">
                        ${(useDigitalSignature && clienteSelecionado?.signatureUrl) ? `<img src="${clienteSelecionado.signatureUrl}" class="signature-image" />` : ''}
                        <div class="signature-line"></div>
                        <div class="signature-label">${clienteSelecionado?.name || 'Assinatura do Cliente'}</div>
                    </div>` : ''}
                
                ${signatures.prof ? `
                    ${(signatures.digitalA1 && entry.professional?.certificadoA1Url) ? `
                    <div class="signature-a1">
                        <div class="a1-title">🛡️ Documento Assinado Digitalmente</div>
                        <div class="a1-name">${entry.professional?.name}</div>
                        <div class="a1-details">
                            CPF: ${entry.professional?.cpf || '—'}<br/>
                            Assinatura: Profissional Preenchedor<br/>
                            Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}<br/>
                            ID: ${entry.id.toUpperCase()}
                        </div>
                    </div>
                    ` : `
                        <div class="signature-block">
                            ${(useDigitalSignature && entry.professional?.signatureUrl) ? `<img src="${entry.professional.signatureUrl}" class="signature-image" />` : ''}
                            <div class="signature-line"></div>
                            <div class="signature-label">${entry.professional?.name || 'Assinatura do Profissional'}</div>
                        </div>
                    `}
                ` : ''}

                ${signatures.company ? `
                    ${(signatures.digitalA1 && empresaInfo.certificadoA1Url) ? `
                    <div class="signature-a1">
                        <div class="a1-title">🛡️ Documento Assinado Digitalmente</div>
                        <div class="a1-name">${empresaInfo?.corporateName || empresaInfo?.name}</div>
                        <div class="a1-details">
                            CNPJ: ${empresaInfo?.cnpj || '—'}<br/>
                            Assinatura: Entidade Jurídica (Empresa)<br/>
                            Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}<br/>
                            ID: ${entry.id.toUpperCase()}
                        </div>
                    </div>
                    ` : `
                        <div class="signature-block">
                            ${(useDigitalSignature && empresaInfo.signatureUrl) ? `<img src="${empresaInfo.signatureUrl}" class="signature-image" />` : ''}
                            <div class="signature-line"></div>
                            <div class="signature-label">${empresaInfo?.corporateName || empresaInfo?.name || 'Assinatura da Empresa'}</div>
                        </div>
                    `}
                ` : ''}

                ${signatures.technical ? (function() {
                    const tech = technicalProfessionals?.find(p => p.id === selectedTechnicalId);
                    return `
                        ${(signatures.digitalA1 && tech?.certificadoA1Url) ? `
                        <div class="signature-a1">
                            <div class="a1-title">🛡️ Assinado por Responsável Técnico</div>
                            <div class="a1-name">${tech?.name}</div>
                            <div class="a1-details">
                                CPF: ${tech?.cpf || '—'}<br/>
                                RT: ${tech?.councilName || ''} ${tech?.councilNumber || ''}<br/>
                                Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}<br/>
                                ID: ${entry.id.toUpperCase()}
                            </div>
                        </div>
                        ` : `
                        <div class="signature-block">
                            ${(useDigitalSignature && tech?.signatureUrl) ? `<img src="${tech.signatureUrl}" class="signature-image" />` : ''}
                            <div class="signature-line"></div>
                            <div class="signature-label">
                                <div style="font-weight: 900;">${tech?.name || 'Assinatura do Responsável Técnico'}</div>
                                ${tech?.councilName ? `<div style="font-size: 8px; font-weight: 700; color: #64748b; margin-top: 2px;">${tech.councilName} ${tech.councilNumber || ''}</div>` : ''}
                            </div>
                        </div>`}
                    `;
                })() : ''}
            </div>

            <div class="footer-line">
                <div class="footer-text">
                    ${customFooter ? customFooter : `<strong>${nomeEmpresa}</strong> — Documento gerado automaticamente pelo sistema em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`}
                </div>
            </div>
        </div>
        </body></html>`;

        // --- GERAÇÃO OTIMIZADA PARA PDF ---
        const pdfContent = `
            <div id="pdf-container" style="width: 800px; padding: 40px; background: white; color: #1f2937; font-family: 'Inter', sans-serif; position: relative;">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                    ${/* Extrair apenas o CSS de dentro da string html original */ ""}
                    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #0d9488; padding-bottom: 15px; }
                    .header-left { display: flex; align-items: center; gap: 15px; }
                    .company-logo { width: 45px; height: 45px; object-fit: contain; }
                    .company-name { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
                    .auth-badge { display: flex; align-items: center; gap: 8px; border: 1.5px solid #ccfbf1; background: #f0fdfa; padding: 4px 10px; border-radius: 8px; min-height: 45px; }
                    .auth-text { text-align: left; }
                    .auth-label { font-size: 8px; font-weight: 900; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1; }
                    .auth-hash { font-size: 7px; font-family: monospace; color: #64748b; margin-top: 2px; }
                    .qr-code { width: 35px; height: 35px; object-fit: contain; display: block !important; }
                    .header-right { text-align: right; }
                    .header-date { font-size: 11px; font-weight: 700; color: #1e293b; }
                    .header-doc { font-size: 9px; font-weight: 600; color: #64748b; margin-top: 2px; }
                    .doc-title { font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 25px; margin-top: 20px; }
                    .section-title { font-size: 14px; font-weight: 900; color: #0d9488; text-transform: uppercase; letter-spacing: 1px; margin-top: 30px; margin-bottom: 12px; display: block; width: 100%; clear: both; line-height: 1.5; }
                    .client-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 20px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 30px; }
                    .client-item { display: flex; flex-direction: column; }
                    .client-item label { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
                    .client-item span { font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
                    .client-item.full { grid-column: span 2; }
                    .section-header { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; background: #f1f5f9; padding: 12px 15px; border: 1.5px solid #e2e8f0; border-bottom: none; margin-top: 40px; display: block; width: 100%; clear: both; line-height: 1.5; } 
                    .fields-grid { border-bottom: 1.5px solid #e2e8f0; border-right: 1.5px solid #e2e8f0; border-radius: 0; display: flex; flex-wrap: wrap; flex-direction: row; background: white; margin-bottom: 30px; width: 100%; box-sizing: border-box; } 
                    .field-item { border-top: 1.5px solid #e2e8f0; border-left: 1.5px solid #e2e8f0; padding: 6px 12px; display: flex; flex-direction: column; gap: 2px; box-sizing: border-box; min-height: 48px; } 
                    .field-label { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                    .field-value { font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; line-height: 1.2; word-break: break-word; }
                    .w-100 { width: 100%; } .w-50 { width: 50%; } .w-33 { width: 33.3333%; } .w-25 { width: 25%; } .w-66 { width: 66.6666%; } .w-75 { width: 75%; }
                    .signatures-container { margin-top: 60px; display: flex; justify-content: space-around; align-items: flex-end; gap: 40px; }
                    .signature-block { flex: 1; text-align: center; max-width: 250px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; min-height: 90px; }
                    .signature-image { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 250px; height: 120px; object-fit: contain; mix-blend-mode: multiply; }
                    .signature-line { width: 100%; border-top: 1.5px solid #0f172a; position: relative; z-index: 1; }
                    .signature-label { font-size: 10px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-top: 8px; }
                    .signature-a1 { border: 1px solid #0d9488; background: #fff; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; max-width: 250px; flex: 1; }
                    .a1-title { font-size: 8px; font-weight: 900; color: #0d9488; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
                    .a1-name { font-size: 10px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
                    .a1-details { font-size: 8px; color: #334155; margin-top: 2px; font-weight: 600; font-family: monospace; }
                    .a1-footer { font-size: 6px; color: #64748b; margin-top: 6px; text-transform: uppercase; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 4px; }
                    .footer-line { border-top: 1px solid #e2e8f0; margin-top: 40px; padding-top: 15px; text-align: center; }
                    .footer-text { font-size: 10px; font-weight: 600; color: #64748b; }
                    .back-button { display: none !important; }
                </style>
                ${
                   // Remover o botão 'Voltar' e qualquer cabeçalho indesejado do HTML injetado
                   (html.includes('id="printable-content"') 
                   ? html.split('id="printable-content">')[1]?.split('</body>')[0] 
                   : (html.split('<body>')[1]?.split('</body>')[0] || html))
                   .replace(/<a[^>]*class="back-button"[^>]*>.*?<\/a>/gi, '')
                }
            </div>
        `;

        // --- ASSINATURA DIGITAL CRIPTOGRÁFICA (PFX/A1 REAL) ---
        if (signatures.digitalA1) {
            setSigningPdf(true);
            try {
                // @ts-ignore
                const html2pdf = (await import('html2pdf.js')).default;
                
                // --- RENDERIZAÇÃO ROBUSTA (SNAPSHOT) ---
                const container = document.createElement('div');
                container.innerHTML = pdfContent;
                
                // Forçar remoção de elementos de navegação
                container.querySelectorAll('.back-button, button, .no-print').forEach(el => el.remove());

                container.style.position = 'absolute';
                container.style.left = '-5000px'; 
                container.style.top = '0';
                container.style.width = '800px';
                container.style.height = 'auto';
                container.style.minHeight = 'auto';
                container.style.maxHeight = 'none';
                container.style.overflow = 'visible';
                container.style.background = 'white';
                container.style.opacity = '1';
                container.style.visibility = 'visible';
                document.body.appendChild(container);

                // Remover restrições de altura de elementos internos
                const pageEl = container.querySelector('.page') as HTMLElement;
                if (pageEl) {
                    pageEl.style.height = 'auto';
                    pageEl.style.minHeight = 'auto';
                    pageEl.style.maxHeight = 'none';
                    pageEl.style.flex = 'none'; // Importante para evitar que o flexbox limite a altura
                }

                // Forçar o browser a carregar as imagens do container
                const imgs = container.querySelectorAll('img');
                const imgPromises = Array.from(imgs).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                });

                // Aguardar imagens e fontes (1.5s total)
                await Promise.all([
                    ...imgPromises,
                    new Promise(resolve => setTimeout(resolve, 1500))
                ]);

                // @ts-ignore - Importar html2canvas e jsPDF que vêm com o html2pdf.js
                const html2canvas = (await import('html2canvas')).default;
                const { jsPDF } = await import('jspdf');

                const canvas = await html2canvas(container, {
                    scale: 2, // 2 é mais estável comercialmente para documentos longos
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width: 800,
                    windowWidth: 1024,
                    // Capturar a altura real total do container
                    windowHeight: container.offsetHeight || container.scrollHeight || 15000,
                });

                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const pxWidth = canvas.width;
                const pxPageHeight = Math.floor((pdfHeight * pxWidth) / pdfWidth);
                
                let currentY = 0;
                let isFirstPage = true;

                while (currentY < canvas.height) {
                    if (!isFirstPage) pdf.addPage();
                    
                    const remainingHeight = canvas.height - currentY;
                    const cropHeight = Math.min(pxPageHeight, remainingHeight);

                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = pxWidth;
                    pageCanvas.height = cropHeight;
                    
                    const ctx = pageCanvas.getContext('2d');
                    if (ctx) {
                        ctx.imageSmoothingEnabled = false; // Evitar borrão no recorte
                        ctx.drawImage(
                            canvas,
                            0, currentY, pxWidth, cropHeight, // Origem
                            0, 0, pxWidth, cropHeight         // Destino
                        );
                        
                        const pageData = pageCanvas.toDataURL('image/jpeg', 0.98);
                        const drawHeight = (cropHeight * pdfWidth) / pxWidth;
                        
                        // Forçar altura total do PDF se for uma página completa para evitar gaps de arredondamento
                        const finalDrawHeight = (cropHeight >= pxPageHeight - 2) ? pdfHeight : drawHeight;
                        
                        pdf.addImage(pageData, 'JPEG', 0, 0, pdfWidth, finalDrawHeight);
                    }
                    
                    currentY += cropHeight;
                    isFirstPage = false;
                }

                const pdfBase64 = pdf.output('datauristring').split(',')[1];
                
                document.body.removeChild(container);

                if (!pdfBase64 || pdfBase64.length < 1000) {
                    throw new Error("Falha ao processar captura do PDF. O documento resultou vazio.");
                }

                // Enviar para o servidor assinar
                const signRes = await fetch('/api/painel/fichas-tecnicas/sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pdfBase64,
                        choice: (a1Choice && a1Choice !== 'none') ? a1Choice : (signatures.company ? 'company' : signatures.technical ? 'technical' : 'prof'),
                        professionalId: selectedTechnicalId,
                        entryId: entry.id
                    })
                });

                if (!signRes.ok) {
                    const error = await signRes.json();
                    throw new Error(error.error || "Erro ao assinar PDF");
                }

                // Download do PDF assinado
                const blob = await signRes.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ficha_${docNumber}_assinada.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                toast.success("PDF assinado criptograficamente com sucesso!", {
                    description: "O arquivo foi baixado e já contém os metadados de autenticidade ICP-Brasil."
                });
                setPrintConfigModal(null);
            } catch (err: any) {
                console.error("Erro assinatura digital:", err);
                toast.error("Erro ao gerar assinatura real: " + err.message);
            } finally {
                setSigningPdf(false);
            }
            return;
        }

        // --- FALLBACK: Impressão normal (sem assinatura digital) ---
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Gestão de Clientes</h1>
                {userRole === "ADMIN" && (
                    <div className="flex gap-2">
                        <button onClick={() => setModalImportarAberto(true)} className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"><Download size={20} /> Importar</button>
                        <button onClick={() => setModalAberto(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg"><UserPlus size={20} /> Adicionar Cliente</button>
                    </div>
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
                <ModalPortal>
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
                            <div className="flex px-8 pt-6 gap-8 border-b dark:border-gray-800 bg-white dark:bg-gray-950 overflow-x-auto shrink-0 relative z-10 w-full custom-scrollbar">
                                <button onClick={() => setAbaAtiva("DADOS")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "DADOS" ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}>Geral</button>
                                <button onClick={() => setAbaAtiva("HISTORICO")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "HISTORICO" ? "border-b-4 border-orange-600 text-orange-600" : "text-gray-400 hover:text-gray-600"}`}>Histórico</button>
                                <button onClick={() => setAbaAtiva("FINANCEIRO")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "FINANCEIRO" ? "border-b-4 border-green-600 text-green-600" : "text-gray-400 hover:text-gray-600"}`}>Financeiro</button>
                                <button onClick={() => setAbaAtiva("ANEXOS")} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === "ANEXOS" ? "border-b-4 border-purple-600 text-purple-600" : "text-gray-400 hover:text-gray-600"}`}>Documentos</button>
                                {empresaInfo.plan && empresaInfo.plan.toUpperCase() !== "INDIVIDUAL" && empresaInfo.plan.toUpperCase() !== "PREMIUM" && (
                                    <button onClick={() => { setAbaAtiva("FICHAS"); carregarFichas(); }} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${abaAtiva === "FICHAS" ? "border-b-4 border-teal-600 text-teal-600" : "text-gray-400"}`}><ClipboardList size={14} /> Fichas Técnicas </button>
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
                                                            {clienteSelecionado.clientType === 'JURIDICA' && (
                                                                <>
                                                                    <div className="col-span-12 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Razão Social</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.corporateName || "---"}</p></div>
                                                                    <div className="col-span-6 lg:col-span-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Data de Abertura</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.openingDate || "---"}</p></div>
                                                                    <div className="col-span-6 lg:col-span-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">CNAE Principal</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.cnae || "---"}</p></div>
                                                                    <div className="col-span-12 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase">Responsável / Sócios</label><p className="font-bold dark:text-white text-xs">{clienteSelecionado.legalRepresentative || "---"}</p></div>
                                                                </>
                                                            )}
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

                                {abaAtiva === "HISTORICO" && (
                                    <div className="space-y-6 animate-in fade-in duration-500">
                                        <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl shadow-sm">
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Data Inicial</label>
                                                <input type="date" value={filtroHistorico.dataInicial} onChange={e => setFiltroHistorico(p => ({ ...p, dataInicial: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 transition-colors" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Data Final</label>
                                                <input type="date" value={filtroHistorico.dataFinal} onChange={e => setFiltroHistorico(p => ({ ...p, dataFinal: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 transition-colors" />
                                            </div>
                                            <div className="flex-[1.5]">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Buscar Serviço</label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                    <input type="text" placeholder="Nome do serviço" value={filtroHistorico.servico} onChange={e => setFiltroHistorico(p => ({ ...p, servico: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-orange-500 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="flex-[1.5]">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-1">Técnico / Profissional</label>
                                                <div className="relative">
                                                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                    <input type="text" placeholder="Nome do profissional" value={filtroHistorico.profissional} onChange={e => setFiltroHistorico(p => ({ ...p, profissional: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-orange-500 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="flex items-end shrink-0">
                                                <button onClick={() => setFiltroHistorico({ dataInicial: "", dataFinal: "", servico: "", profissional: "" })} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-black uppercase rounded-xl transition-colors">Limpar</button>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-white/5 rounded-[2.5rem] p-6 border dark:border-gray-800">
                                            <h4 className="text-sm font-black mb-6 uppercase text-orange-600 flex items-center gap-2"><History size={18} /> Histórico Completo de Visitas</h4>

                                            {loadingDetalhes && !clienteSelecionado.bookings ? (
                                                <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-orange-600 mb-2" size={24} /> <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Buscando histórico...</p></div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {(clienteSelecionado.bookings || [])
                                                        .filter((b: any) => {
                                                            let valid = true;
                                                            if (filtroHistorico.dataInicial && new Date(b.date) < new Date(filtroHistorico.dataInicial + "T00:00:00")) valid = false;
                                                            if (filtroHistorico.dataFinal && new Date(b.date) > new Date(filtroHistorico.dataFinal + "T23:59:59")) valid = false;
                                                            if (filtroHistorico.servico && !(b.service?.name || "").toLowerCase().includes(filtroHistorico.servico.toLowerCase())) valid = false;
                                                            if (filtroHistorico.profissional && !(b.professional?.name || "").toLowerCase().includes(filtroHistorico.profissional.toLowerCase())) valid = false;
                                                            return valid;
                                                        })
                                                        .map((b: any) => (
                                                            <div key={b.id} className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl shadow-sm border dark:border-gray-800 flex flex-col group hover:border-orange-500 transition-all gap-4">
                                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                                                                    <div className="flex items-center gap-4 md:gap-6 min-w-0 w-full md:w-auto">
                                                                        <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                                                                            <Calendar size={20} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="font-black text-sm md:text-base dark:text-white uppercase leading-none mb-2 truncate">{b.service?.name || "Serviço não especificado"}</p>
                                                                            <div className="flex flex-wrap items-center gap-3 md:gap-5">
                                                                                <p className="text-[10px] md:text-xs font-bold text-gray-500 flex items-center gap-1.5 whitespace-nowrap">
                                                                                    <Clock size={12} className="text-gray-400" /> {format(new Date(b.date), "dd 'de' MMM, yyyy 'às' HH:mm")}
                                                                                </p>
                                                                                <p className="text-[10px] md:text-xs font-bold text-orange-600 flex items-center gap-1.5 whitespace-nowrap bg-orange-50 dark:bg-orange-900/10 px-2 py-0.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                                                                    <UserCircle size={12} /> {b.professional?.name || 'Profissional não informado'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0 self-end md:self-auto w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100 dark:border-gray-800">
                                                                        <span className="font-black text-green-600 text-lg md:text-xl relative top-[-2px]">R$ {Number(b.service?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                        {(b.status === "FINALIZADO" || b.status === "CONCLUÍDO" || b.status === "CONCLUIDO") ? (
                                                                            <p className="text-[9px] font-black text-green-500 uppercase flex items-center justify-end gap-1 mt-0.5"><CheckCircle size={10} /> Concluído</p>
                                                                        ) : b.status === "CANCELADO" ? (
                                                                            <p className="text-[9px] font-black text-red-500 uppercase flex items-center justify-end gap-1 mt-0.5"><X size={10} /> Cancelado</p>
                                                                        ) : (
                                                                            <p className="text-[9px] font-black text-blue-500 uppercase flex items-center justify-end gap-1 mt-0.5"><Clock size={10} /> {b.status}</p>
                                                                        )}
                                                                    </div>
                                                                </div> {/* Close flex-row inner wrapper */}

                                                                {/* EXIBIÇÃO DA DESCRIÇÃO SE EXISTIR */}
                                                                {b.description && (
                                                                    <div className="w-full mt-3 pt-3 border-t border-dashed border-gray-100 dark:border-gray-800 flex-shrink-0">
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium italic"><span className="font-bold text-gray-400 not-italic uppercase text-[10px] mr-1">Observação:</span> {b.description}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    {(!clienteSelecionado.bookings || clienteSelecionado.bookings.length === 0) && (
                                                        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                                                            <History size={32} className="text-gray-300 mb-3" />
                                                            <p className="text-center text-xs text-gray-500 font-bold uppercase tracking-widest">Nenhuma visita registrada.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
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
                                                                <div className="flex flex-col items-end gap-1 mt-1">
                                                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{inv.status} • {inv.method || 'A DEFINIR'}</span>
                                                                    {inv.method === 'BOLETO' && inv.bankUrl && (
                                                                        <button
                                                                            onClick={() => window.open(inv.bankUrl, '_blank')}
                                                                            className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg"
                                                                        >
                                                                            <Printer size={12} /> Imprimir Boleto
                                                                        </button>
                                                                    )}
                                                                </div>
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

                                                {/* TERMOS DE CONSENTIMENTO */}
                                                <div className="mt-12">
                                                    <div className="flex justify-between items-center mb-6 pl-2">
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase text-gray-400 flex items-center gap-2"><ShieldCheck size={18} /> Termos de Consentimento / Assinatura</h4>
                                                            <p className="text-[10px] text-gray-500 font-bold mt-1">Gere links para o cliente assinar eletronicamente pelo celular.</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setModalTermoAberto(true)}
                                                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
                                                        >
                                                            <PenTool size={16} /> Gerar Termo
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {clienteSelecionado.consentTerms?.map((termo: any) => (
                                                            <div key={termo.id} className="p-5 bg-white dark:bg-gray-900 border-2 dark:border-gray-800 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-500 transition-all group">
                                                                <div className="flex items-start md:items-center gap-4 min-w-0">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${termo.status === 'ASSINADO' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                                                        {termo.status === 'ASSINADO' ? <CheckCircle size={24} /> : <Clock size={24} />}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-black text-sm uppercase dark:text-white truncate" title={termo.title}>{termo.title}</p>
                                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${termo.status === 'ASSINADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                                {termo.status}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Gerado em: {format(new Date(termo.createdAt), "dd/MM/yyyy")}</p>
                                                                        {termo.status === 'ASSINADO' && termo.signedAt && (
                                                                            <p className="text-[10px] font-bold text-green-600 uppercase mt-0.5">Assinado em: {format(new Date(termo.signedAt), "dd/MM/yyyy HH:mm")}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto">
                                                                    <button
                                                                        onClick={() => {
                                                                            const url = `${window.location.origin}/termos/${termo.id}`;
                                                                            navigator.clipboard.writeText(url);
                                                                            toast.success("Link copiado para a área de transferência!");
                                                                        }}
                                                                        className="flex-1 md:flex-none p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-blue-600 transition flex items-center justify-center gap-2 text-xs font-black uppercase text-gray-500"
                                                                        title="Copiar Link para o Cliente"
                                                                    >
                                                                        <Link2 size={16} /> Link
                                                                    </button>
                                                                    {termo.status === 'ASSINADO' && (
                                                                        <a
                                                                            href={`/termos/${termo.id}`}
                                                                            target="_blank"
                                                                            className="flex-1 md:flex-none p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-green-600 transition flex items-center justify-center text-gray-500"
                                                                            title="Ver Termo Assinado"
                                                                        >
                                                                            <Eye size={16} />
                                                                        </a>
                                                                    )}
                                                                    {userRole === "ADMIN" && (
                                                                        <button onClick={() => setConfirmarExclusao({ id: termo.id, tipo: 'TERMO' })} className="flex-1 md:flex-none p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:text-red-500 transition flex items-center justify-center text-gray-500" title="Excluir">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!clienteSelecionado.consentTerms || clienteSelecionado.consentTerms.length === 0) && (
                                                            <div className="py-10 text-center bg-gray-50 dark:bg-gray-800/20 rounded-3xl border border-dashed dark:border-gray-800">
                                                                <ShieldCheck size={32} className="mx-auto text-gray-300 mb-2" />
                                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Nenhum termo gerado</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {abaAtiva === "FICHAS" && (
                                    <div className="space-y-6 animate-in fade-in duration-500">
                                        {loadingFichas ? (
                                            <div className="flex flex-col items-center justify-center py-20">
                                                <Loader2 className="animate-spin text-teal-600 mb-2" size={30} />
                                                <p className="text-[10px] uppercase text-gray-400 font-bold">Carregando fichas...</p>
                                            </div>
                                        ) : fichaVisualizando ? (
                                            /* VISUALIZAÇÃO DA FICHA TÉCNICA PREENCHIDA */
                                            <div>
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                                    <button onClick={() => setFichaVisualizando(null)} className="text-sm text-blue-600 font-extrabold hover:underline flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl transition-all">
                                                        <ChevronDown className="rotate-90" size={16} /> Voltar para Lista
                                                    </button>
                                                    <button onClick={() => imprimirFicha(fichaVisualizando)} className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-teal-700 transition"><Printer size={14} /> Imprimir</button>
                                                </div>
                                                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-8">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div>
                                                            <h3 className="text-xl font-black dark:text-white mb-1">{fichaVisualizando.template?.name}</h3>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-6">Preenchido em {format(new Date(fichaVisualizando.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                                                        </div>
                                                        {fichaVisualizando.isLocked && (
                                                            <div className="flex flex-col items-end">
                                                                <span className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest pulse-fast">
                                                                    <ShieldCheck size={14} /> Registro Finalizado
                                                                </span>
                                                                <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase">Imutável e Autenticado</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-4">
                                                        {(fichaVisualizando.template?.fields as any[])?.map((field: any) => {
                                                            const valor = (fichaVisualizando.data as any)?.[field.id];
                                                            if (field.type === 'header') return <h4 key={field.id} className="text-sm font-black text-teal-600 uppercase tracking-widest pt-4 border-t dark:border-gray-800">{field.label}</h4>;
                                                            if (field.type === 'static') return (
                                                                <div key={field.id} className="col-span-1 sm:col-span-3 bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-2xl border-2 border-blue-100 dark:border-blue-900/20 my-2">
                                                                    <p className="text-gray-700 dark:text-gray-300 text-sm font-bold whitespace-pre-wrap leading-relaxed">
                                                                        {field.label}
                                                                    </p>
                                                                </div>
                                                            );
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
                                                                                        {valor && (fichaVisualizando.data as any)?.[field.id + "_details"] && (
                                                                                            <span className="text-gray-400 font-normal ml-2 italic">
                                                                                                ({field.detailsLabel || 'Justificativa'}: {(fichaVisualizando.data as any)[field.id + "_details"]})
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
                                                {fichaTemplates.length === 0 ? (
                                                    <div className="text-center py-16">
                                                        <ClipboardList size={40} className="text-gray-300 mx-auto mb-4" />
                                                        <p className="text-sm text-gray-500 font-bold">Nenhum modelo de ficha técnica criado.</p>
                                                        <p className="text-xs text-gray-400 mt-1">Vá em <b>Fichas Técnicas</b> no menu lateral para criar um modelo.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* BOTÃO NOVA FICHA TÉCNICA */}
                                                        <button
                                                            onClick={() => { setFichaTemplateSelecionado(""); setFichaFormData({}); setFichaEditId(null); setModalFichaAberto(true); }}
                                                            className="w-full border-2 border-dashed border-teal-300 dark:border-teal-800 p-5 rounded-2xl text-teal-600 font-bold text-sm hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition flex items-center justify-center gap-2"
                                                        >
                                                            <Plus size={18} /> Nova Ficha Técnica
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}



                                        {/* LISTA DE FICHAS PREENCHIDAS */}
                                        {fichaEntries.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-3 flex items-center gap-2"><History size={14} /> Fichas Preenchidas ({fichaEntries.length})</h4>
                                                <div className="space-y-2">
                                                    {fichaEntries.map((entry: any) => (
                                                        <div key={entry.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl hover:border-teal-500 transition group gap-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${entry.template?.requireSignature && entry.status === 'ASSINADO' ? 'bg-green-50 text-green-600' : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600'}`}>
                                                                    {entry.template?.requireSignature && entry.status === 'ASSINADO' ? <CheckCircle size={18} /> : <FileText size={18} />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-sm dark:text-white truncate" title={entry.template?.name}>{entry.template?.name}</p>
                                                                        {entry.template?.requireSignature && (
                                                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider ${entry.status === 'ASSINADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                                {entry.status || "PENDENTE"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-[10px] text-gray-400 font-bold">{format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                                                                        {entry.isLocked && (
                                                                            <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">
                                                                                <ShieldCheck size={10} /> Finalizado
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition justify-end">
                                                                {entry.template?.requireSignature && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const url = `${window.location.origin}/fichas/${entry.id}`;
                                                                            navigator.clipboard.writeText(url);
                                                                            toast.success("Link de assinatura copiado com sucesso!");
                                                                        }}
                                                                        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-blue-600 transition"
                                                                        title="Copiar Link para Cliente Assinar"
                                                                    ><Link2 size={14} /></button>
                                                                )}
                                                                <button onClick={() => setFichaVisualizando(entry)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-teal-600 transition" title="Visualizar / Preencher"><Eye size={14} /></button>

                                                                {entry.template?.requireSignature && entry.status === 'ASSINADO' && (
                                                                    <a
                                                                        href={`/fichas/${entry.id}`}
                                                                        target="_blank"
                                                                        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-green-600 transition flex items-center justify-center text-gray-500"
                                                                        title="Ver Ficha Assinada"
                                                                    >
                                                                        <CheckCircle size={14} />
                                                                    </a>
                                                                )}

                                                                {!entry.isLocked && (
                                                                    <button onClick={() => { setFichaTemplateSelecionado(entry.templateId); setFichaFormData(entry.data as any); setFichaEditId(entry.id); setModalFichaAberto(true); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-blue-600 transition" title="Editar Valores"><Pencil size={14} /></button>
                                                                )}
                                                                <button onClick={() => imprimirFicha(entry)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-indigo-600 transition" title="Imprimir PDF"><Printer size={14} /></button>
                                                                {userRole === "ADMIN" && (
                                                                    <button onClick={() => excluirFicha(entry.id)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:text-red-500 transition" title="Excluir"><Trash2 size={14} /></button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {fichaEntries.length === 0 && (
                                            <div className="text-center py-10 opacity-40">
                                                <ClipboardList size={30} className="mx-auto mb-2" />
                                                <p className="text-xs font-bold">Nenhuma ficha preenchida para este cliente.</p>
                                            </div>
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
                </ModalPortal>
            )
            }


            {
                modalAberto && (
                    <ModalPortal>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-5xl max-h-[90vh] relative shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border dark:border-gray-800">
                                {/* HEADER FIXO */}
                                <div className="p-8 pb-4 shrink-0 flex justify-between items-center">
                                    <h2 className="text-3xl font-black dark:text-white px-2 tracking-tighter">{isEditing ? "Editar Cliente" : "Novo Cliente"}</h2>
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
                                                            <div className="relative">
                                                                <input maxLength={18} className="w-full border-2 dark:border-gray-700 p-4 pr-10 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.cnpj} onChange={e => handleCNPJChange(e.target.value)} placeholder="00.000.000/0000-00" />
                                                                <Search className="absolute right-4 top-4 text-gray-400 pointer-events-none" size={18} />
                                                            </div>
                                                        </div>
                                                        <div className="md:col-span-6 space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Inscrição Estadual</label>
                                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.inscricaoEstadual} onChange={e => setForm({ ...form, inscricaoEstadual: e.target.value })} placeholder="Isento, ou nº IE" />
                                                        </div>
                                                        <div className="md:col-span-12 space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Razão Social</label>
                                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.corporateName} onChange={e => setForm({ ...form, corporateName: e.target.value })} placeholder="Nome oficial da empresa" />
                                                        </div>
                                                        <div className="md:col-span-4 space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Data de Abertura</label>
                                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.openingDate} onChange={e => setForm({ ...form, openingDate: e.target.value })} placeholder="DD/MM/AAAA" />
                                                        </div>
                                                        <div className="md:col-span-8 space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">CNAE Principal</label>
                                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.cnae} onChange={e => setForm({ ...form, cnae: e.target.value })} placeholder="Código ou descrição" />
                                                        </div>
                                                        <div className="md:col-span-12 space-y-1">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-3">Responsável Legal / Sócios</label>
                                                            <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 outline-none focus:border-blue-500 font-bold dark:text-white transition" value={form.legalRepresentative} onChange={e => setForm({ ...form, legalRepresentative: e.target.value })} placeholder="Nomes dos responsáveis" />
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
                    </ModalPortal>
                )
            }

            {/* MODAL DE CONFIRMAÇÃO ESTILIZADO */}
            {
                confirmarExclusao && (
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
                )
            }

            {/* MODAL FLUTUANTE DA FICHA TÉCNICA */}
            {
                modalFichaAberto && clienteSelecionado && (
                    <ModalPortal>
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[120] p-4">
                            <div className="bg-white dark:bg-gray-950 w-full max-w-3xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                                {/* HEADER DO MODAL */}
                                <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 shrink-0">
                                    <div>
                                        <h2 className="text-2xl font-black dark:text-white flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white"><ClipboardList size={20} /></div>
                                            {fichaEditId ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1 ml-[52px]">Paciente: <b className="text-gray-700 dark:text-gray-300">{clienteSelecionado.name}</b></p>
                                    </div>
                                    <button onClick={() => { setModalFichaAberto(false); setFichaFormData({}); setFichaEditId(null); setFichaTemplateSelecionado(""); }} className="p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 transition text-gray-400 shadow-sm">
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
                                            value={fichaTemplateSelecionado}
                                            onChange={e => { setFichaTemplateSelecionado(e.target.value); if (!fichaEditId) setFichaFormData({}); }}
                                        >
                                            <option value="">Selecione um modelo...</option>
                                            {fichaTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    {/* CAMPOS DINÂMICOS */}
                                    {fichaTemplateSelecionado && (() => {
                                        const template = fichaTemplates.find((t: any) => t.id === fichaTemplateSelecionado);
                                        if (!template) return null;
                                        return (
                                            <div className="flex flex-wrap flex-row w-full items-start -mx-2">
                                                {(template.fields as any[]).map((field: any) => {
                                                    // Lógica Condicional
                                                    if (field.conditional) {
                                                        const dependOnId = field.conditional.dependsOnId;
                                                        const requiredValue = field.conditional.dependsOnValue;
                                                        const actualValue = fichaFormData[dependOnId];

                                                        let shouldShow = false;
                                                        if (typeof requiredValue === 'boolean') {
                                                            shouldShow = requiredValue === true ? !!actualValue : !actualValue;
                                                        } else {
                                                            if (Array.isArray(actualValue)) {
                                                                shouldShow = actualValue.includes(requiredValue);
                                                            } else {
                                                                shouldShow = actualValue === requiredValue;
                                                            }
                                                        }
                                                        if (!shouldShow) return null;
                                                    }

                                                    const w = field.width || "100%";
                                                    const widthClass = w === "100%" ? "w-full" : w === "50%" ? "w-1/2" : w === "33%" ? "w-1/3" : w === "25%" ? "w-1/4" : w === "66%" ? "w-2/3" : "w-3/4";

                                                    return (
                                                        <div key={field.id} className={`p-2 ${widthClass} animate-in fade-in duration-300`}>
                                                            {field.type === 'header' && (
                                                                <div className="pt-6 pb-2 border-t-2 border-teal-200 dark:border-teal-800 mt-2">
                                                                    <h5 className="text-sm font-black text-teal-600 uppercase tracking-widest leading-tight">{field.label}</h5>
                                                                    {field.helpText && <p className="text-xs text-gray-500 mt-1 font-medium">{field.helpText}</p>}
                                                                </div>
                                                            )}
                                                            {field.type === 'static' && (
                                                                <div className="bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-3xl border-2 border-blue-100 dark:border-blue-900/20 my-2">
                                                                    <p className="text-gray-700 dark:text-gray-300 text-sm font-bold whitespace-pre-wrap leading-relaxed">
                                                                        {field.label}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {field.type !== 'header' && field.type !== 'static' && (
                                                                <div className="mb-1">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 block leading-tight">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                                                    {field.helpText && <p className="text-[9px] text-gray-500 font-medium ml-1 leading-tight italic">{field.helpText}</p>}
                                                                </div>
                                                            )}

                                                            {field.type === 'text' && (
                                                                <input className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={fichaFormData[field.id] || ''} onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: e.target.value })} />
                                                            )}
                                                            {field.type === 'textarea' && (
                                                                <textarea rows={4} className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={fichaFormData[field.id] || ''} onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: e.target.value })} />
                                                            )}
                                                            {field.type === 'number' && (
                                                                <input type="number" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={fichaFormData[field.id] || ''} onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: e.target.value })} />
                                                            )}
                                                            {field.type === 'currency' && (
                                                                <div className="relative flex items-center">
                                                                    <span className="absolute left-4 font-black text-gray-400">R$</span>
                                                                    <input type="number" step="0.01" className="w-full border-2 dark:border-gray-700 p-4 pl-12 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={fichaFormData[field.id] || ''} onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: e.target.value })} />
                                                                </div>
                                                            )}
                                                            {field.type === 'date' && (
                                                                <input type="date" className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={fichaFormData[field.id] || ''} onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: e.target.value })} />
                                                            )}
                                                            {field.type === 'time' && (
                                                                <div className="relative flex items-center">
                                                                    <Clock className="absolute left-4 text-gray-400" size={18} />
                                                                    <input type="time" className="w-full border-2 dark:border-gray-700 p-4 pl-12 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition" value={fichaFormData[field.id] || ''} onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: e.target.value })} />
                                                                </div>
                                                            )}
                                                            {field.type === 'image' && (
                                                                <label className="w-full border-2 border-dashed dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white hover:border-teal-500 transition cursor-pointer flex flex-col items-center justify-center gap-2 relative overflow-hidden group">
                                                                    {fichaFormData[field.id] ? (
                                                                        <>
                                                                            <img src={fichaFormData[field.id]} alt="Anexo" className="w-full h-40 object-contain rounded-xl" />
                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                <span className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded">Trocar Imagem</span>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ImageIcon className="text-gray-400" size={24} />
                                                                            <span className="text-gray-500 text-xs text-center uppercase tracking-widest">Clique para Anexar<br />(PNG, JPG)</span>
                                                                        </>
                                                                    )}
                                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            const reader = new FileReader();
                                                                            reader.onloadend = () => {
                                                                                setFichaFormData({ ...fichaFormData, [field.id]: reader.result });
                                                                            };
                                                                            reader.readAsDataURL(file);
                                                                        }
                                                                    }} />
                                                                </label>
                                                            )}
                                                            {field.type === 'slider' && (
                                                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 dark:border-gray-700 pt-6 mt-1">
                                                                    <div className="relative px-2">
                                                                        <input
                                                                            type="range"
                                                                            min={field.sliderConfig?.min ?? 0}
                                                                            max={field.sliderConfig?.max ?? 10}
                                                                            step={field.sliderConfig?.step ?? 1}
                                                                            className="w-full accent-teal-600 cursor-pointer h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
                                                                            value={fichaFormData[field.id] !== undefined ? fichaFormData[field.id] : (field.sliderConfig?.min ?? 0)}
                                                                            onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: Number(e.target.value) })}
                                                                        />
                                                                        <div className="flex justify-between w-full text-[10px] font-black text-gray-400 mt-3 relative -mx-2 px-2">
                                                                            <span>{field.sliderConfig?.min ?? 0}</span>
                                                                            <div className="absolute left-1/2 -translate-x-1/2 top-0 -mt-8">
                                                                                <span className="bg-teal-600 text-white px-2 py-1 rounded shadow-lg text-xs font-black">
                                                                                    {fichaFormData[field.id] !== undefined ? fichaFormData[field.id] : (field.sliderConfig?.min ?? 0)}
                                                                                </span>
                                                                            </div>
                                                                            <span>{field.sliderConfig?.max ?? 10}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {field.type === 'select' && (
                                                                <select className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition appearance-none" style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1em" }} value={fichaFormData[field.id] || ''} onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: e.target.value })}>
                                                                    <option value="">Selecione...</option>
                                                                    {field.options?.filter((o: string) => o.trim()).map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                                                                </select>
                                                            )}
                                                            {field.type === 'checkbox' && (
                                                                <div className="space-y-3">
                                                                    <label className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-2 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-500 transition">
                                                                        <input type="checkbox" className="w-5 h-5 accent-teal-600 rounded" checked={fichaFormData[field.id] || false} onChange={e => setFichaFormData({ ...fichaFormData, [field.id]: e.target.checked })} />
                                                                        <span className="text-sm font-bold dark:text-white">{field.label}</span>
                                                                    </label>

                                                                    {field.allowsDetails && fichaFormData[field.id] && (
                                                                        <div className="sm:ml-8 animate-in slide-in-from-top-2 duration-200">
                                                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">↳ {field.detailsLabel || 'Justificativa'}</label>
                                                                            <input
                                                                                className="w-full border-2 dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition"
                                                                                placeholder="Descreva aqui..."
                                                                                value={fichaFormData[field.id + "_details"] || ''}
                                                                                onChange={e => setFichaFormData({ ...fichaFormData, [field.id + "_details"]: e.target.value })}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {field.type === 'checkboxGroup' && (
                                                                <div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 relative">
                                                                        {field.options?.filter((o: string) => o.trim()).map((opt: string, i: number) => (
                                                                            <label key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-500 transition text-sm">
                                                                                <input type="checkbox" className="accent-teal-600 w-4 h-4" checked={(fichaFormData[field.id] || []).includes(opt)} onChange={e => {
                                                                                    const arr = fichaFormData[field.id] || [];
                                                                                    setFichaFormData({ ...fichaFormData, [field.id]: e.target.checked ? [...arr, opt] : arr.filter((v: string) => v !== opt) });
                                                                                }} />
                                                                                <span className="font-bold dark:text-gray-300 leading-tight">{opt}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {field.type === 'table' && (
                                                                <div className="space-y-2">
                                                                    <div className="overflow-x-auto border-2 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden">
                                                                        <table className="w-full text-left border-collapse text-sm">
                                                                            <thead>
                                                                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                                                    {field.options?.filter((o: string) => o.trim()).map((col: string, i: number) => <th key={i} className="p-3 font-black text-[10px] text-gray-500 uppercase tracking-widest border-b dark:border-gray-700 whitespace-nowrap">{col}</th>)}
                                                                                    <th className="p-3 border-b dark:border-gray-700 w-10"></th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {(fichaFormData[field.id] as string[][] || []).map((row: string[], ri: number) => (
                                                                                    <tr key={ri} className="border-b dark:border-gray-700/50 last:border-0 group hover:bg-gray-50 dark:hover:bg-gray-800/20 transition">
                                                                                        {field.options?.filter((o: string) => o.trim()).map((_: string, ci: number) => (
                                                                                            <td key={ci} className="p-2 border-r dark:border-gray-700/50 last:border-0 min-w-[120px]">
                                                                                                <textarea
                                                                                                    rows={1}
                                                                                                    className="w-full bg-transparent outline-none font-bold dark:text-white px-2 py-1 focus:bg-gray-100 dark:focus:bg-gray-800 rounded transition resize-y min-h-[40px]"
                                                                                                    value={row[ci] || ''}
                                                                                                    onChange={e => {
                                                                                                        const arr = [...(fichaFormData[field.id] as string[][] || [])];
                                                                                                        if (!arr[ri]) arr[ri] = [];
                                                                                                        arr[ri][ci] = e.target.value;
                                                                                                        setFichaFormData({ ...fichaFormData, [field.id]: arr });
                                                                                                    }}
                                                                                                    placeholder={`---`}
                                                                                                />
                                                                                            </td>
                                                                                        ))}
                                                                                        <td className="p-2 text-center">
                                                                                            <button onClick={() => {
                                                                                                const arr = [...(fichaFormData[field.id] as string[][] || [])];
                                                                                                arr.splice(ri, 1);
                                                                                                setFichaFormData({ ...fichaFormData, [field.id]: arr });
                                                                                            }} className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                        <div className="p-3 bg-gray-50 dark:bg-gray-800/30 border-t dark:border-gray-700">
                                                                            <button onClick={() => {
                                                                                const arr = [...(fichaFormData[field.id] as string[][] || [])];
                                                                                arr.push(new Array(field.options?.filter((o: string) => o.trim()).length || 0).fill(''));
                                                                                setFichaFormData({ ...fichaFormData, [field.id]: arr });
                                                                            }} className="text-[11px] font-black uppercase text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 px-3 py-2 rounded-xl transition flex items-center gap-2 inline-flex"><Plus size={14} /> Adicionar Linha</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* BOTÃO SALVAR FIXO NO RODAPÉ */}
                                {fichaTemplateSelecionado && (
                                    <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0">
                                        <button
                                            onClick={salvarFicha}
                                            disabled={fichaSalvando}
                                            className="w-full bg-teal-600 text-white p-5 rounded-2xl font-black text-base hover:bg-teal-700 transition flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-teal-600/20"
                                        >
                                            {fichaSalvando ? <Loader2 className="animate-spin" size={22} /> : <Save size={22} />}
                                            {fichaSalvando ? 'Salvando...' : (fichaEditId ? 'Atualizar Ficha' : 'Salvar Ficha')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ModalPortal>
                )
            }

            {/* MODAL DE IMPRESSÃO - OPÇÕES PERSONALIZADAS OBRIGATORIAS */}
            {
                printConfigModal && (
                    <ModalPortal>
                        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                                <div className="px-6 py-5 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20 shrink-0">
                                    <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                                        <Printer size={22} className="text-teal-600" /> Imprimir Ficha
                                    </h2>
                                    <button onClick={() => setPrintConfigModal(null)} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-500 transition text-gray-400">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                                    {/* Assinatura */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <FileIcon size={14} /> Bloco de Assinaturas
                                        </label>
                                        <div className="space-y-2">
                                            {[
                                                { id: 'client', label: 'Assinatura do Cliente' },
                                                { id: 'prof', label: 'Assinatura do Profissional' },
                                                { id: 'company', label: 'Assinatura da Empresa' },
                                                { id: 'technical', label: 'Assinatura do Resp. Técnico' },
                                                { id: 'digitalA1', label: 'Certificado Digital (A1)' },
                                            ].filter(opt => {
                                                if (opt.id === 'digitalA1') {
                                                    const hasProfA1 = printConfigModal.signatures.prof && !!printConfigModal.entry.professional?.certificadoA1Url;
                                                    const hasCompanyA1 = printConfigModal.signatures.company && !!empresaInfo.certificadoA1Url;
                                                    const hasTechA1 = printConfigModal.signatures.technical && !!technicalProfessionals.find(p => p.id === printConfigModal.selectedTechnicalId)?.certificadoA1Url;
                                                    return hasProfA1 || hasCompanyA1 || hasTechA1;
                                                }
                                                return true;
                                            }).map(opt => {
                                                const isChecked = printConfigModal.signatures[opt.id as keyof typeof printConfigModal.signatures];
                                                return (
                                                    <label key={opt.id} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'}`}>
                                                        <input
                                                            type="checkbox"
                                                            className="accent-teal-600 w-4 h-4"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                const newSignatures = { ...printConfigModal.signatures, [opt.id]: checked };
                                                                // Uncheck digitalA1 if no valid signers with A1 are selected anymore
                                                                if (opt.id !== 'digitalA1') {
                                                                 const stillHasA1 = (newSignatures.prof && !!printConfigModal.entry.professional?.certificadoA1Url) ||
                                                                                       (newSignatures.company && !!empresaInfo.certificadoA1Url) ||
                                                                                       (newSignatures.technical && !!technicalProfessionals.find(p => p.id === printConfigModal.selectedTechnicalId)?.certificadoA1Url);
                                                                    if (!stillHasA1) {
                                                                        newSignatures.digitalA1 = false;
                                                                    }
                                                                }
                                                                
                                                                // Lógica de auto-seleção do a1Choice (quem vai ser o assinante principal no selo do PDF)
                                                                let newA1Choice = printConfigModal.a1Choice;
                                                                if (opt.id === 'digitalA1' && checked) {
                                                                    if (newSignatures.company && empresaInfo.certificadoA1Url) newA1Choice = 'company';
                                                                    else if (newSignatures.technical && technicalProfessionals.find(p => p.id === printConfigModal.selectedTechnicalId)?.certificadoA1Url) newA1Choice = 'technical';
                                                                    else if (newSignatures.prof && printConfigModal.entry.professional?.certificadoA1Url) newA1Choice = 'prof';
                                                                } else if (!newSignatures.digitalA1) {
                                                                    newA1Choice = 'none';
                                                                }

                                                                setPrintConfigModal({ ...printConfigModal, signatures: newSignatures, a1Choice: newA1Choice });
                                                            }}
                                                        />
                                                        <span className={`font-bold text-sm ${isChecked ? 'text-teal-700 dark:text-teal-400' : 'text-gray-600 dark:text-gray-300'}`}>{opt.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {printConfigModal.signatures.technical && (
                                            <div className="pl-8 space-y-2 animate-in slide-in-from-left-2 duration-300">
                                                <label className="text-[9px] font-black text-orange-500 uppercase block tracking-widest">Selecionar Responsável Técnico</label>
                                                <select
                                                    className="w-full p-3 rounded-xl border-2 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold dark:text-white outline-none focus:border-orange-500 transition-all"
                                                    value={printConfigModal.selectedTechnicalId}
                                                    onChange={(e) => setPrintConfigModal({ ...printConfigModal, selectedTechnicalId: e.target.value })}
                                                >
                                                    <option value="">Selecione um profissional...</option>
                                                    {technicalProfessionals.map((p: any) => (
                                                        <option key={p.id} value={p.id}>{p.name} {p.councilNumber ? `(${p.councilNumber})` : ''}</option>
                                                    ))}
                                                </select>
                                                {technicalProfessionals.length === 0 && (
                                                    <p className="text-[10px] text-red-500 font-bold italic">Nenhum profissional marcado como Responsável Técnico na Equipe.</p>
                                                )}
                                            </div>
                                        )}

                                        {printConfigModal.signatures.digitalA1 && (
                                            <div className="pl-8 space-y-2 animate-in slide-in-from-left-2 duration-300">
                                                <label className="text-[9px] font-black text-blue-500 uppercase block tracking-widest">Assinante Digital (Principal)</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {printConfigModal.signatures.company && empresaInfo.certificadoA1Url && (
                                                        <button 
                                                            onClick={() => setPrintConfigModal({ ...printConfigModal, a1Choice: 'company' })}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${printConfigModal.a1Choice === 'company' ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-100 text-gray-400 hover:border-blue-200'}`}
                                                        >Empresa</button>
                                                    )}
                                                    {printConfigModal.signatures.technical && technicalProfessionals.find(p => p.id === printConfigModal.selectedTechnicalId)?.certificadoA1Url && (
                                                        <button 
                                                            onClick={() => setPrintConfigModal({ ...printConfigModal, a1Choice: 'technical' })}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${printConfigModal.a1Choice === 'technical' ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-100 text-gray-400 hover:border-orange-200'}`}
                                                        >R. Técnico</button>
                                                    )}
                                                    {printConfigModal.signatures.prof && printConfigModal.entry.professional?.certificadoA1Url && (
                                                        <button 
                                                            onClick={() => setPrintConfigModal({ ...printConfigModal, a1Choice: 'prof' })}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${printConfigModal.a1Choice === 'prof' ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-100 text-gray-400 hover:border-teal-200'}`}
                                                        >Profissional</button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(printConfigModal.signatures.prof || printConfigModal.signatures.company || printConfigModal.signatures.technical || printConfigModal.signatures.client) && (
                                            <div className="mt-4 animate-in slide-in-from-top-2">
                                                <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${!empresaInfo.hasDigitalSignatureModule ? 'opacity-60 cursor-not-allowed border-gray-100 bg-gray-50' : (printConfigModal.useDigitalSignature ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-teal-500 cursor-pointer')}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="accent-teal-600 w-4 h-4"
                                                        disabled={!empresaInfo.hasDigitalSignatureModule}
                                                        checked={empresaInfo.hasDigitalSignatureModule && printConfigModal.useDigitalSignature}
                                                        onChange={(e) => {
                                                            if (!empresaInfo.hasDigitalSignatureModule) {
                                                                toast.error("Assinatura Digital é um recurso opcional. Ative em Configurações > Plano.");
                                                                return;
                                                            }
                                                            setPrintConfigModal({ ...printConfigModal, useDigitalSignature: e.target.checked });
                                                        }}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className={`font-bold text-sm ${printConfigModal.useDigitalSignature ? 'text-teal-700 dark:text-teal-400' : 'text-gray-600 dark:text-gray-300'}`}>Aplicar Assinatura Digital</p>
                                                            {!empresaInfo.hasDigitalSignatureModule && (
                                                                <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Add-on</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-400">
                                                            {!empresaInfo.hasDigitalSignatureModule
                                                                ? "Este recurso requer o módulo de Assinatura Digital (R$ 14,90/mês)."
                                                                : "Insere automaticamente a imagem da assinatura cadastrada nos campos marcados acima."}
                                                        </p>
                                                    </div>
                                                </label>
                                                {!empresaInfo.hasDigitalSignatureModule && (
                                                    <button
                                                        onClick={() => window.location.href = '/painel/config/plano'}
                                                        className="mt-2 text-[10px] font-black text-blue-600 hover:underline uppercase flex items-center gap-1 mx-auto"
                                                    >
                                                        <Plus size={10} /> Ativar Assinatura Digital (Add-on)
                                                    </button>
                                                )}
                                            </div>
                                        )}
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

                                    {/* Autenticação */}
                                    <div className="space-y-3 pt-2 border-t dark:border-gray-800">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <ShieldCheck size={14} /> Autenticação Digital
                                        </label>
                                        <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer hover:border-teal-500 transition-all">
                                            <div className="relative flex items-center w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={printConfigModal.includeQR}
                                                    onChange={(e) => setPrintConfigModal({ ...printConfigModal, includeQR: e.target.checked })}
                                                />
                                                <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-teal-500 transition-all"></div>
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6"></div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-gray-600 dark:text-gray-300">Incluir QR Code e Hash</p>
                                                <p className="text-[10px] text-gray-400">Permite validar a veracidade do documento online.</p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Layout */}
                                    <div className="space-y-3 pt-2 border-t dark:border-gray-800">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <FileText size={14} /> Layout da Ficha
                                        </label>
                                        <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer hover:border-teal-500 transition-all">
                                            <div className="relative flex items-center w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={printConfigModal.twoColumns}
                                                    onChange={(e) => setPrintConfigModal({ ...printConfigModal, twoColumns: e.target.checked })}
                                                />
                                                <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-teal-500 transition-all"></div>
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-gray-600 dark:text-gray-300">Dividir campos em Duas Colunas</span>
                                                <span className="text-[10px] text-gray-400 font-bold">Ideal para conter mais informações por página</span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Número do Documento */}
                                    <div className="space-y-3 pt-4 border-t dark:border-gray-800">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <FileText size={14} /> Número do Documento (O.S.)
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full border-2 dark:border-gray-700 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition-all uppercase"
                                            placeholder={`Ex: ${printConfigModal.entry?.id.slice(-6).toUpperCase()}`}
                                            value={printConfigModal.docNumber}
                                            onChange={(e) => setPrintConfigModal({ ...printConfigModal, docNumber: e.target.value.toUpperCase() })}
                                        />
                                        <p className="text-[10px] text-gray-400 font-bold mt-1 ml-1 cursor-default">
                                            Se em branco, um número aleatório será gerado.
                                        </p>
                                    </div>

                                    {/* Rodapé Personalizado */}
                                    <div className="space-y-3 pt-4 border-t dark:border-gray-800">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Plus size={14} /> Informações Adicionais no Rodapé
                                        </label>
                                        <textarea
                                            className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:border-teal-500 transition-all resize-none"
                                            rows={3}
                                            placeholder="Insira observações gerais, termos de garantia, dados adicionais..."
                                            value={printConfigModal.customFooter}
                                            onChange={(e) => setPrintConfigModal({ ...printConfigModal, customFooter: e.target.value })}
                                        />
                                        <p className="text-[10px] text-gray-400 font-bold mt-1 ml-1 cursor-default">
                                            Este texto aparecerá acima da assinatura e da data automática.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 border-t dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                                    <button
                                        onClick={executarImpressaoDaFicha}
                                        disabled={signingPdf}
                                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        {signingPdf ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Gerando Assinatura Real...
                                            </>
                                        ) : (
                                            <>
                                                <Printer size={18} /> Gerar PDF {(printConfigModal.signatures.digitalA1 && empresaInfo.hasDigitalSignatureModule) ? 'Assinado' : '(Imprimir)'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )
            }

            {/* MODAL IMPORTAR PLANILHA */}
            {
                modalImportarAberto && (
                    <ModalPortal>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-lg max-h-[90vh] relative shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border dark:border-gray-800">
                                <div className="p-8 pb-6 shrink-0 flex justify-between items-center border-b dark:border-gray-800">
                                    <div>
                                        <h2 className="text-2xl font-black dark:text-white flex items-center gap-2">
                                            <Download className="text-blue-500" size={24} /> Importar Clientes
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">Adicione clientes em massa usando uma planilha Excel.</p>
                                    </div>
                                    <button onClick={() => { setModalImportarAberto(false); setImportErros([]); }} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-500 transition shadow-sm"><X size={20} /></button>
                                </div>

                                <div className="p-8 space-y-6 overflow-y-auto">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border dark:border-blue-800/30">
                                        <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2"><FileText size={18} /> 1. Baixe o Modelo</h3>
                                        <p className="text-sm text-blue-600/80 dark:text-blue-300/70 mb-4 leading-relaxed">Faça o download da nossa planilha modelo. Ela contém as colunas formatadas corretamente para que o sistema consiga ler as informações dos seus clientes.</p>
                                        <button onClick={baixarModeloExcel} className="w-full bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 p-3 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-blue-50 dark:hover:bg-gray-700 transition shadow-sm shadow-blue-100 dark:shadow-none">
                                            <Download size={18} /> Baixar Planilha Modelo
                                        </button>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border dark:border-gray-700">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-300 mb-2 flex items-center gap-2"><UploadCloud size={18} /> 2. Faça o Upload</h3>
                                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">Preencha a planilha modelo e, quando estiver com tudo pronto, faça o upload aqui para processar a importação.</p>
                                        <label className="w-full bg-blue-600 border-2 border-blue-600 text-white p-3 rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-700 hover:border-blue-700 transition shadow-lg cursor-pointer">
                                            <UploadCloud size={18} /> Escolher Arquivo Preenchido
                                            <input type="file" className="hidden" accept=".xlsx, .xls" onClick={(e: any) => e.target.value = null} onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    processarImportacao(e.target.files[0]);
                                                }
                                            }} />
                                        </label>
                                    </div>
                                    {importErros.length > 0 && (
                                        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl border border-red-100 dark:border-red-800/30 animate-in fade-in slide-in-from-top-2">
                                            <h3 className="font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Erros de Importação ({importErros.length})</h3>
                                            <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                                                {importErros.map((erro, i) => (
                                                    <div key={i} className="text-[11px] font-bold text-red-600/80 dark:text-red-300 bg-red-100/50 dark:bg-red-900/40 p-2 rounded-lg px-3 mb-1">{erro}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )
            }

            {/* MODAL GERAR TERMO DE CONSENTIMENTO */}
            {modalTermoAberto && (
                <ModalPortal>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-2xl relative shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border dark:border-gray-800">
                            <div className="p-8 pb-6 shrink-0 flex justify-between items-center border-b dark:border-gray-800">
                                <div>
                                    <h2 className="text-2xl font-black dark:text-white flex items-center gap-2">
                                        <ShieldCheck className="text-blue-500" size={24} /> Novo Termo
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">Gere um link para o cliente <b>{clienteSelecionado?.name}</b> assinar.</p>
                                </div>
                                <button onClick={() => setModalTermoAberto(false)} disabled={gerandoTermo} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-500 transition shadow-sm"><X size={20} /></button>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 max-h-[60vh]">
                                <div>
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Título do Termo</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Termo de Consentimento Livre e Esclarecido"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold dark:text-white focus:border-blue-500 outline-none transition"
                                        value={termoFormData.title}
                                        onChange={(e) => setTermoFormData({ ...termoFormData, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Conteúdo Legal</label>
                                    <textarea
                                        placeholder="Insira todo o texto do termo, os riscos do procedimento, responsabilidades..."
                                        className="w-full min-h-[250px] bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 rounded-2xl p-4 text-sm text-gray-600 dark:text-gray-300 focus:border-blue-500 outline-none transition resize-none custom-scrollbar"
                                        value={termoFormData.content}
                                        onChange={(e) => setTermoFormData({ ...termoFormData, content: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 px-2">A assinatura eletrônica possui validade jurídica. Certifique-se de ser claro no texto.</p>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-950 border-t dark:border-gray-800 shrink-0">
                                <button
                                    onClick={gerarTermo}
                                    disabled={gerandoTermo}
                                    className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                                >
                                    {gerandoTermo ? <Loader2 className="animate-spin" size={18} /> : <PenTool size={18} />}
                                    {gerandoTermo ? "Gerando link seguro..." : "Gerar Link de Assinatura"}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {confirmarExclusao && (
                <ModalPortal>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[300] p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-md relative shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border-4 border-white dark:border-gray-800">
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <Trash2 size={40} />
                                </div>
                                <h2 className="text-2xl font-black dark:text-white mb-2 tracking-tight">Confirmar Exclusão</h2>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                    Você tem certeza que deseja excluir este item? <br/>
                                    <span className="text-red-500 font-bold uppercase text-[10px] tracking-widest mt-2 block">Esta ação é irreversível e permanente.</span>
                                </p>
                            </div>

                            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
                                <button
                                    onClick={() => setConfirmarExclusao(null)}
                                    className="flex-1 bg-white dark:bg-gray-800 border-2 dark:border-gray-700 text-gray-400 p-4 rounded-2xl font-black text-xs uppercase hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={executarExclusao}
                                    className="flex-1 bg-red-600 text-white p-4 rounded-2xl font-black text-xs uppercase hover:bg-red-700 transition shadow-lg shadow-red-500/20 active:scale-95"
                                >
                                    Excluir Agora
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

        </div>
    );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Loader2, UploadCloud, CreditCard, FileText, CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";

export default function ConfigFaturamento() {
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // --- CAMPOS FISCAIS (FOCUS NFe) ---
    const [inscricaoMunicipal, setInscricaoMunicipal] = useState("");
    const [regimeTributario, setRegimeTributario] = useState("1");
    const [naturezaOperacao, setNaturezaOperacao] = useState("1");
    const [codigoServico, setCodigoServico] = useState("");
    const [itemListaServico, setItemListaServico] = useState("");
    const [codigoTributacao, setCodigoTributacao] = useState("");
    const [codigoNbs, setCodigoNbs] = useState("");
    const [cnae, setCnae] = useState("");
    const [aliquotaServico, setAliquotaServico] = useState("");
    const [cofinsTax, setCofinsTax] = useState("");
    const [pisTax, setPisTax] = useState("");
    const [csllTax, setCsllTax] = useState("");
    const [irTax, setIrTax] = useState("");
    const [inssTax, setInssTax] = useState("");
    const [issRetidoTomador, setIssRetidoTomador] = useState(false);
    const [fiscalPadraoDesc, setFiscalPadraoDesc] = useState("");
    const [descontarImpostos, setDescontarImpostos] = useState(false);
    const [construcaoCivil, setConstrucaoCivil] = useState(false);
    const [descontarDeducoes, setDescontarDeducoes] = useState(false);

    const [certificadoA1Url, setCertificadoA1Url] = useState("");
    const [certificadoSenha, setCertificadoSenha] = useState("");
    const [creditCardTax, setCreditCardTax] = useState("");
    const [debitCardTax, setDebitCardTax] = useState("");

    // --- CAMPOS CORA ---
    const [coraClientId, setCoraClientId] = useState("");
    const [coraCertUrl, setCoraCertUrl] = useState("");
    const [coraKeyUrl, setCoraKeyUrl] = useState("");
    const [coraFineRate, setCoraFineRate] = useState("2.0");
    const [coraInterestRate, setCoraInterestRate] = useState("1.0");
    const [coraDiscountRate, setCoraDiscountRate] = useState("0");

    const inputCertRef = useRef<HTMLInputElement>(null);
    const inputCoraCertRef = useRef<HTMLInputElement>(null);
    const inputCoraKeyRef = useRef<HTMLInputElement>(null);

    const [userRole, setUserRole] = useState<string>("PROFESSIONAL");

    useEffect(() => { carregarTudo(); }, []);

    async function carregarTudo() {
        try {
            const [resConfig, resCheckout] = await Promise.all([
                fetch('/api/painel/config'),
                fetch('/api/checkout')
            ]);
            const dataConfig = await resConfig.json();
            const dataCheckout = await resCheckout.json();
            setUserRole(dataCheckout.role || "PROFESSIONAL");

            if (dataConfig && dataConfig.id) {
                setInscricaoMunicipal(dataConfig.inscricaoMunicipal || "");
                setRegimeTributario(String(dataConfig.regimeTributario || "1"));
                setNaturezaOperacao(String(dataConfig.naturezaOperacao || "1"));
                setCodigoServico(dataConfig.codigoServico || "");
                setItemListaServico(dataConfig.itemListaServico || "");
                setCodigoTributacao(dataConfig.codigoTributacao || "");
                setCodigoNbs(dataConfig.codigoNbs || "");
                setCnae(dataConfig.cnae || "");
                setAliquotaServico(String(dataConfig.aliquotaServico || ""));
                setCofinsTax(String(dataConfig.cofinsTax || ""));
                setPisTax(String(dataConfig.pisTax || ""));
                setCsllTax(String(dataConfig.csllTax || ""));
                setIrTax(String(dataConfig.irTax || ""));
                setInssTax(String(dataConfig.inssTax || ""));
                setIssRetidoTomador(dataConfig.issRetidoTomador || false);
                setFiscalPadraoDesc(dataConfig.fiscalPadraoDesc || "");
                setDescontarImpostos(dataConfig.descontarImpostos || false);
                setConstrucaoCivil(dataConfig.construcaoCivil || false);
                setDescontarDeducoes(dataConfig.descontarDeducoes || false);

                setCertificadoA1Url(dataConfig.certificadoA1Url || "");
                setCertificadoSenha(dataConfig.certificadoSenha || "");
                setCreditCardTax(String(dataConfig.creditCardTax || "0"));
                setDebitCardTax(String(dataConfig.debitCardTax || "0"));

                setCoraClientId(dataConfig.coraClientId || "");
                setCoraCertUrl(dataConfig.coraCertUrl || "");
                setCoraKeyUrl(dataConfig.coraKeyUrl || "");
                setCoraFineRate(String(dataConfig.coraFineRate || "2.0"));
                setCoraInterestRate(String(dataConfig.coraInterestRate || "1.0"));
                setCoraDiscountRate(String(dataConfig.coraDiscountRate || "0"));
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false); }
    }

    async function handleCertUpload() {
        if (!inputCertRef.current?.files?.[0]) return;
        const file = inputCertRef.current.files[0];
        setIsUploading(true);
        try {
            const newBlob = await upload(`cert_${file.name}`, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
            });
            setCertificadoA1Url(newBlob.url);
            toast.success("Certificado enviado!");
        } catch (error) { toast.error("Falha ao enviar certificado."); }
        finally { setIsUploading(false); }
    }

    async function handleCoraFileUpload(type: 'CERT' | 'KEY') {
        const ref = type === 'CERT' ? inputCoraCertRef : inputCoraKeyRef;
        if (!ref.current?.files?.[0]) return;
        const file = ref.current.files[0];
        setIsUploading(true);
        try {
            const newBlob = await upload(`cora_${type.toLowerCase()}_${file.name}`, file, {
                access: 'public',
                handleUploadUrl: '/api/upload/token',
                contentType: 'application/octet-stream',
            });
            if (type === 'CERT') setCoraCertUrl(newBlob.url);
            else setCoraKeyUrl(newBlob.url);
            toast.success(`${type === 'CERT' ? 'Certificado' : 'Chave'} Cora enviada!`);
        } catch (error) { toast.error("Erro no upload Cora."); }
        finally { setIsUploading(false); }
    }

    async function salvarConfig() {
        try {
            const res = await fetch('/api/painel/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inscricaoMunicipal, regimeTributario: Number(regimeTributario), naturezaOperacao: Number(naturezaOperacao),
                    codigoServico, itemListaServico, cnae, codigoTributacao, codigoNbs,
                    fiscalPadraoDesc, issRetidoTomador,
                    cofinsTax: parseFloat(cofinsTax || "0"),
                    pisTax: parseFloat(pisTax || "0"),
                    csllTax: parseFloat(csllTax || "0"),
                    irTax: parseFloat(irTax || "0"),
                    inssTax: parseFloat(inssTax || "0"),
                    descontarImpostos, construcaoCivil, descontarDeducoes,
                    aliquotaServico: parseFloat(aliquotaServico || "0"),
                    certificadoA1Url, certificadoSenha,
                    creditCardTax: parseFloat(creditCardTax || "0"), debitCardTax: parseFloat(debitCardTax || "0"),
                    coraClientId, coraCertUrl, coraKeyUrl,
                    coraFineRate: parseFloat(coraFineRate || "0"),
                    coraInterestRate: parseFloat(coraInterestRate || "0"),
                    coraDiscountRate: parseFloat(coraDiscountRate || "0")
                })
            });
            if (res.ok) {
                toast.success("Dados de faturamento salvos!");
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || errData.details || "Erro ao salvar.");
            }
        } catch (error) { toast.error("Erro de conexão."); }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 font-sans animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Faturamento</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Configurações de nota fiscal, boletos e taxas.</p>
            </header>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                    <CreditCard className="text-blue-500" size={20} /> Taxas de Cartão
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50/50 dark:bg-gray-800/30 rounded-3xl border border-blue-100 dark:border-gray-800">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Taxa de Crédito (%)</label>
                        <input type="number" step="0.01" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={creditCardTax} onChange={e => setCreditCardTax(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Taxa de Débito (%)</label>
                        <input type="number" step="0.01" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500 font-bold dark:text-white" value={debitCardTax} onChange={e => setDebitCardTax(e.target.value)} />
                    </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-8 mt-10">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText className="text-emerald-500" size={20} /> Emissão Fiscal (NFS-e)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-white dark:bg-gray-800/30 rounded-[2.5rem] border dark:border-gray-800">
                        {/* Linha 1 */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Item Lista Serviço (LC 116)*</label>
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white shadow-sm transition focus:ring-2 focus:ring-emerald-500/20" placeholder="Ex: 07.13" value={itemListaServico} onChange={e => setItemListaServico(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">CNAE (Nacional)*</label>
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white shadow-sm transition focus:ring-2 focus:ring-emerald-500/20" placeholder="Ex: 8122200" value={cnae} onChange={e => setCnae(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Código NBS (Nacional)*</label>
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white shadow-sm transition focus:ring-2 focus:ring-emerald-500/20" placeholder="9 dígitos" value={codigoNbs} onChange={e => setCodigoNbs(e.target.value)} />
                        </div>

                        {/* Linha 2 */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cód. Tributação Municipal (ISS)*</label>
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white shadow-sm transition focus:ring-2 focus:ring-emerald-500/20" placeholder="Ex: 131307" value={codigoServico} onChange={e => setCodigoServico(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cód. IBGE Município (Incidência)*</label>
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white shadow-sm transition focus:ring-2 focus:ring-emerald-500/20" placeholder="Ex: 3131307" value={codigoTributacao} onChange={e => setCodigoTributacao(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">% Alíquota ISS</label>
                            <input type="number" step="0.01" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white shadow-sm transition focus:ring-2 focus:ring-emerald-500/20" placeholder="2.00" value={aliquotaServico} onChange={e => setAliquotaServico(e.target.value)} />
                        </div>

                        {/* Linha 3: Impostos Federais */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">% COFINS</label>
                            <input type="number" step="0.01" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white" value={cofinsTax} onChange={e => setCofinsTax(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">% PIS</label>
                            <input type="number" step="0.01" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white" value={pisTax} onChange={e => setPisTax(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">% CSLL</label>
                            <input type="number" step="0.01" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white" value={csllTax} onChange={e => setCsllTax(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">% IR</label>
                            <input type="number" step="0.01" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white" value={irTax} onChange={e => setIrTax(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">% INSS</label>
                            <input type="number" step="0.01" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white" value={inssTax} onChange={e => setInssTax(e.target.value)} />
                        </div>

                        {/* Linha 4 */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Descrição da Atividade (Padrão)*</label>
                            <textarea rows={2} className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white resize-none" placeholder="Descrição completa..." value={fiscalPadraoDesc} onChange={e => setFiscalPadraoDesc(e.target.value)} />
                        </div>

                        {/* Linha Checkboxes */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                            <div className="flex items-center gap-2">
                                <input id="checkDescontarConfig" type="checkbox" checked={descontarImpostos} onChange={e => setDescontarImpostos(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                <label htmlFor="checkDescontarConfig" className="font-bold text-[10px] text-gray-600 dark:text-gray-400 uppercase cursor-pointer">
                                    Descontar impostos do valor total
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="checkConstrucaoConfig" type="checkbox" checked={construcaoCivil} onChange={e => setConstrucaoCivil(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                <label htmlFor="checkConstrucaoConfig" className="font-bold text-[10px] text-gray-600 dark:text-gray-400 uppercase cursor-pointer">
                                    Serviços de Construção Civil
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="checkDeducoesConfig" type="checkbox" checked={descontarDeducoes} onChange={e => setDescontarDeducoes(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                <label htmlFor="checkDeducoesConfig" className="font-bold text-[10px] text-gray-600 dark:text-gray-400 uppercase cursor-pointer">
                                    Descontar deduções
                                </label>
                            </div>
                        </div>

                        {/* Linha Técnica */}
                        <div className="pt-4 border-t dark:border-gray-800">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Inscrição Municipal</label>
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white" value={inscricaoMunicipal} onChange={e => setInscricaoMunicipal(e.target.value)} />
                        </div>
                        <div className="pt-4 border-t dark:border-gray-800">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Natureza da Operação</label>
                            <select className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-900 font-bold dark:text-white" value={naturezaOperacao} onChange={e => setNaturezaOperacao(e.target.value)}>
                                <option value="1">Tributação no Município</option>
                                <option value="2">Tributação fora do Município</option>
                                <option value="3">Isenção</option>
                                <option value="4">Imune</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border dark:border-gray-800 p-4 rounded-2xl cursor-pointer md:col-span-2">
                            <input id="checkRetidoConfig" type="checkbox" checked={issRetidoTomador} onChange={e => setIssRetidoTomador(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                            <label htmlFor="checkRetidoConfig" className="font-bold text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                ISS Retido pelo Tomador?
                            </label>
                        </div>
                        <div className="md:col-span-2 p-6 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-3xl flex items-center justify-between gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block dark:text-gray-400">Certificado Digital (A1 .pfx)</label>
                                {certificadoA1Url && <div className="text-emerald-600 font-bold text-xs mt-1 flex items-center gap-1"><CheckCircle size={14} /> Instalado</div>}
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="file" accept=".pfx,.p12" ref={inputCertRef} onChange={handleCertUpload} className="hidden" />
                                <button onClick={() => inputCertRef.current?.click()} disabled={isUploading} className="bg-gray-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition text-sm">
                                    {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />} Upload
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Senha do Certificado</label>
                            <input type="password" className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 font-bold dark:text-white" value={certificadoSenha} onChange={e => setCertificadoSenha(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-8 mt-10">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                        <RotateCcw className="text-orange-500" size={20} /> Integração Cora (Bolero/PIX)
                    </h3>
                    <div className="grid grid-cols-1 gap-6 p-6 bg-orange-50/50 dark:bg-gray-800/30 rounded-3xl border border-orange-100 dark:border-gray-800">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block dark:text-gray-400">Client ID Cora</label>
                            <input className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-white dark:bg-gray-800 font-bold dark:text-white" value={coraClientId} onChange={e => setCoraClientId(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 bg-white dark:bg-gray-900 border-2 rounded-2xl flex items-center justify-between ${coraCertUrl ? 'border-emerald-400 dark:border-emerald-600' : 'border-gray-200 dark:border-gray-800'}`}>
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase block">Certificado .pem</span>
                                    {coraCertUrl && <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1 mt-0.5"><CheckCircle size={12} /> Instalado</span>}
                                </div>
                                <button onClick={() => inputCoraCertRef.current?.click()} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition ${coraCertUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>{coraCertUrl ? 'Trocar' : 'Upload'}</button>
                                <input type="file" accept=".pem" ref={inputCoraCertRef} onChange={() => handleCoraFileUpload('CERT')} className="hidden" />
                            </div>
                            <div className={`p-4 bg-white dark:bg-gray-900 border-2 rounded-2xl flex items-center justify-between ${coraKeyUrl ? 'border-emerald-400 dark:border-emerald-600' : 'border-gray-200 dark:border-gray-800'}`}>
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase block">Chave .key</span>
                                    {coraKeyUrl && <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1 mt-0.5"><CheckCircle size={12} /> Instalado</span>}
                                </div>
                                <button onClick={() => inputCoraKeyRef.current?.click()} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition ${coraKeyUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>{coraKeyUrl ? 'Trocar' : 'Upload'}</button>
                                <input type="file" accept=".key" ref={inputCoraKeyRef} onChange={() => handleCoraFileUpload('KEY')} className="hidden" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Multa (%)</label><input type="number" className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 font-bold dark:text-white" value={coraFineRate} onChange={e => setCoraFineRate(e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Juros (%)</label><input type="number" className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 font-bold dark:text-white" value={coraInterestRate} onChange={e => setCoraInterestRate(e.target.value)} /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Desconto (%)</label><input type="number" className="w-full border dark:border-gray-700 p-3 rounded-xl bg-white dark:bg-gray-950 font-bold dark:text-white" value={coraDiscountRate} onChange={e => setCoraDiscountRate(e.target.value)} /></div>
                        </div>
                    </div>
                </div>

                {userRole === "ADMIN" && (
                    <button onClick={salvarConfig} className="mt-8 bg-black dark:bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl hover:scale-[1.02] transition active:scale-95 flex items-center justify-center gap-2">
                        <Save size={18} /> Salvar Faturamento
                    </button>
                )}
            </div>
        </div>
    );
}

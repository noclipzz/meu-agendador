"use client";

import { useState, useEffect } from "react";
import {
  CreditCard, Banknote, Save, Loader2, AlertTriangle, ShieldCheck,
  CheckCircle2, Info, ExternalLink, HelpCircle, Wallet
} from "lucide-react";
import { toast } from "sonner";
import { useAgenda } from "@/contexts/AgendaContext";

export default function AsaasPaymentPage() {
  const { companyId } = useAgenda();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);

  const [form, setForm] = useState({
    bankCode: "",
    bankAgency: "",
    bankAccount: "",
    bankAccountDigit: "",
    // Informações da Empresa para o Asaas (Subconta)
    cnpj: "",
    name: "",
    email: "",
    phone: "",
    mobilePhone: ""
  });

  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch("/api/painel/config");
        const data = await res.json();
        setCompany(data);
        setForm({
          bankCode: data.asaasBankCode || "",
          bankAgency: data.asaasBankAgency || "",
          bankAccount: data.asaasBankAccount || "",
          bankAccountDigit: data.asaasBankAccountDigit || "",
          cnpj: data.cnpj || "",
          name: data.name || "",
          email: data.notificationEmail || "",
          phone: data.phone || "",
          mobilePhone: data.phone || ""
        });
      } catch (error) {
        toast.error("Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  async function handleSave() {
    if (!form.bankCode || !form.bankAgency || !form.bankAccount) {
      toast.error("Preencha os dados bancários para receber os pagamentos.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/painel/vitrine/pagamento/asaas-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Configurações salvas com sucesso!");
        setCompany(prev => ({ ...prev, ...data }));
        if (data.asaasSubaccountId) {
             toast.success("Conta de recebimento ativada no Asaas!");
        }
      } else {
        toast.error(data.error || "Erro ao salvar configurações");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CreditCard size={24} className="text-white" />
            </div>
            Recebimento (Pix e Cartão)
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">
            Configure como e onde você deseja receber os pagamentos das suas vendas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: EXPLICAÇÃO */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-[2rem] text-white shadow-xl">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
              <Info size={24} /> Como funciona?
            </h3>
            <ul className="space-y-4 text-sm font-medium opacity-95">
              <li className="flex gap-3">
                <div className="shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-black">1</div>
                O cliente paga via Pix ou Cartão diretamente na sua vitrine.
              </li>
              <li className="flex gap-3">
                <div className="shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-black">2</div>
                O valor cai na sua conta digital Nohud (Asaas) e é identificado na hora.
              </li>
              <li className="flex gap-3">
                <div className="shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-black">3</div>
                O repasse é feito automaticamente para a conta bancária que você cadastrar aqui.
              </li>
            </ul>
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Taxas Competitivas</p>
              <div className="flex justify-between items-center text-lg font-black">
                <span>Pix</span>
                <span>R$ 2,50 <span className="text-[10px] font-medium opacity-70">/transação</span></span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
              <ShieldCheck size={20} />
              <h4 className="font-black text-sm uppercase">Segurança Total</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Utilizamos a infraestrutura do **Asaas (Bank-as-a-Service)** para garantir que seus recebimentos sejam processados com segurança bancária e repassados pontualmente.
            </p>
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30">
              <p className="text-[10px] text-orange-700 dark:text-orange-400 font-black uppercase tracking-tight">
                Nota: A Nohud retém uma taxa fixa de **R$ 2,50** por transação aprovada para cobrir custos de processamento e manutenção da plataforma.
              </p>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.50rem] border dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Wallet size={20} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-black dark:text-white">Conta Bancária (Destino)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Banco</label>
                <input
                  className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold text-sm"
                  placeholder="Selecione ou digite o código do banco (ex: 341, 001)"
                  value={form.bankCode}
                  onChange={e => setForm({ ...form, bankCode: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Agência (Sem dígito)</label>
                <input
                  className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold text-sm"
                  placeholder="0001"
                  value={form.bankAgency}
                  onChange={e => setForm({ ...form, bankAgency: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Conta</label>
                  <input
                    className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold text-sm"
                    placeholder="12345"
                    value={form.bankAccount}
                    onChange={e => setForm({ ...form, bankAccount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Díg.</label>
                  <input
                    className="w-full border dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 ring-blue-500 font-bold text-sm text-center"
                    placeholder="0"
                    value={form.bankAccountDigit}
                    onChange={e => setForm({ ...form, bankAccountDigit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {company?.asaasSubaccountId ? (
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 size={14} /> Conta Ativada no Asaas
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle size={14} /> Conta não vinculada
                  </div>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full md:w-auto bg-blue-600 text-white font-black py-4 px-12 rounded-2xl shadow-xl hover:bg-blue-700 hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} /> Salvar Configuração</>}
              </button>
            </div>
          </div>

          {/* STATUS E INFO EXTRA */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
            <div className="flex gap-4">
              <HelpCircle className="text-blue-500 shrink-0" size={24} />
              <div>
                <h4 className="font-black text-sm dark:text-white mb-2 uppercase">Precisa de ajuda?</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  Os valores recebidos ficam disponíveis na sua conta digital e são transferidos para o seu banco em até 1 hora útil após a confirmação. 
                  Certifique-se de que a conta bancária cadastrada seja da **mesma titularidade (CPF/CNPJ)** cadastrada na Nohud.
                </p>
                <a href="#" className="inline-flex items-center gap-2 text-xs font-black text-blue-600 mt-4 hover:underline">
                  Ver Central de Ajuda <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

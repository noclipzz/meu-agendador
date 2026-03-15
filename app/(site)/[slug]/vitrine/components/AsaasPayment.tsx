"use client";

import { useState, useEffect } from "react";
import { Loader2, Copy, CheckCircle, Smartphone, QrCode } from "lucide-react";
import { toast } from "sonner";

interface AsaasPaymentProps {
  orderId: string;
  companyId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function AsaasPayment({ orderId, companyId, onSuccess, onError }: AsaasPaymentProps) {
  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function startPayment() {
      try {
        const res = await fetch("/api/checkout/asaas-process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            companyId,
            paymentMethod: "pix" // Por enquanto focado em Pix como o eGestor
          })
        });

        const data = await res.json();
        if (res.ok) {
          setPixData(data.pix);
          // Iniciar polling para verificar status
          startPolling(data.id);
        } else {
          onError(data.error || "Erro ao gerar PIX");
        }
      } catch (err) {
        onError("Erro de conexão com o servidor");
      } finally {
        setLoading(false);
      }
    }

    startPayment();
  }, [orderId, companyId]);

  async function startPolling(paymentId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/asaas-status?id=${paymentId}&companyId=${companyId}`);
        const data = await res.json();
        if (data.status === "RECEIVED" || data.status === "CONFIRMED") {
          clearInterval(interval);
          onSuccess();
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(interval);
  }

  function handleCopy() {
    navigator.clipboard.writeText(pixData.payload);
    setCopied(true);
    toast.success("Código Copiado!");
    setTimeout(() => setCopied(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Gerando seu PIX...</p>
      </div>
    );
  }

  if (!pixData) return null;

  return (
    <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-gray-50 flex items-center justify-center">
        <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="QR Code PIX" className="w-56 h-56" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-black text-gray-900 flex items-center justify-center gap-2">
           <QrCode size={20} className="text-blue-600" /> Pix Copia e Cola
        </h3>
        <p className="text-xs text-gray-500 font-medium">Copie o código abaixo para pagar no seu banco.</p>
      </div>

      <div className="w-full relative group">
        <textarea
          readOnly
          className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-[10px] font-mono font-bold text-gray-500 resize-none outline-none h-24"
          value={pixData.payload}
        />
        <button
          onClick={handleCopy}
          className="absolute bottom-3 right-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-blue-700 transition active:scale-95"
        >
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
          {copied ? "Copiado" : "Copiar Código"}
        </button>
      </div>

      <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl w-full border border-blue-100">
        <Smartphone className="text-blue-600 shrink-0" size={24} />
        <p className="text-[10px] text-blue-700 font-black leading-relaxed uppercase tracking-tighter">
          Após realizar o pagamento, você será redirecionado automaticamente. O processamento é instantâneo.
        </p>
      </div>
    </div>
  );
}

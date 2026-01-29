"use client";

import { useState } from "react";
import { X, CheckCircle, CreditCard, Banknote, QrCode, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ModalCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any; // O objeto do agendamento vindo da agenda
  onSuccess: () => void; // Função para atualizar a agenda após sucesso
}

export function ModalCheckout({ isOpen, onClose, booking, onSuccess }: ModalCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [metodo, setMetodo] = useState("PIX");
  const [valor, setValor] = useState(booking?.service?.price || booking?.price || "0");
  const [statusPagamento, setStatusPagamento] = useState("PAGO"); // PAGO ou PENDENTE

  if (!isOpen || !booking) return null;

  async function handleFinalizar() {
    setLoading(true);

    try {
      const payload = {
        bookingId: booking.id,
        clientId: booking.clientId,
        companyId: booking.companyId,
        description: `Serviço: ${booking.service?.name || "Atendimento"}`, // Pega nome do serviço ou genérico
        value: valor,
        dueDate: new Date(), // Data de hoje (cobrança imediata)
        status: statusPagamento,
        method: metodo,
      };

      const res = await fetch("/api/financeiro", { // Sua API fornecida
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Serviço concluído e faturamento gerado!");
        onSuccess(); // Atualiza a agenda
        onClose();   // Fecha modal
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erro ao finalizar.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl border dark:border-gray-800 animate-in fade-in zoom-in duration-200">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition">
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-black dark:text-white">Concluir Atendimento</h2>
          <p className="text-gray-500 text-sm font-bold mt-1">
            {booking.customerName} - {format(new Date(booking.date), "dd/MM 'às' HH:mm")}
          </p>
        </div>

        <div className="space-y-4">
          
          {/* VALOR */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Valor Final (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-4 text-gray-400" size={18}/>
              <input 
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full pl-10 pr-4 py-4 border-2 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-green-500 font-black text-lg dark:text-white"
              />
            </div>
          </div>

          {/* FORMA DE PAGAMENTO */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setMetodo("PIX")} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${metodo === "PIX" ? "border-green-500 bg-green-50 text-green-700 font-bold" : "border-gray-100 dark:border-gray-700 text-gray-400"}`}>
                <QrCode size={20}/> <span className="text-xs">Pix</span>
              </button>
              <button onClick={() => setMetodo("DINHEIRO")} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${metodo === "DINHEIRO" ? "border-green-500 bg-green-50 text-green-700 font-bold" : "border-gray-100 dark:border-gray-700 text-gray-400"}`}>
                <Banknote size={20}/> <span className="text-xs">Dinheiro</span>
              </button>
              <button onClick={() => setMetodo("CARTAO")} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${metodo === "CARTAO" ? "border-green-500 bg-green-50 text-green-700 font-bold" : "border-gray-100 dark:border-gray-700 text-gray-400"}`}>
                <CreditCard size={20}/> <span className="text-xs">Cartão</span>
              </button>
            </div>
          </div>

          {/* STATUS DO PAGAMENTO */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Situação</label>
            <select 
              value={statusPagamento} 
              onChange={(e) => setStatusPagamento(e.target.value)}
              className="w-full p-4 border-2 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none font-bold dark:text-white"
            >
              <option value="PAGO">Já Recebido (Pago)</option>
              <option value="PENDENTE">Fiado / Pagar depois</option>
            </select>
          </div>

          <button 
            onClick={handleFinalizar}
            disabled={loading}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-green-600/20 transition active:scale-95 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Confirmar e Receber"}
          </button>
        </div>

      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";

interface PaymentBrickProps {
  publicKey: string;
  amount: number;
  orderId: string;
  companyId: string;
  customerEmail: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export default function PaymentBrick({
  publicKey,
  amount,
  orderId,
  companyId,
  customerEmail,
  onSuccess,
  onError,
}: PaymentBrickProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initMercadoPago(publicKey, { locale: "pt-BR" });
    setLoading(false);
  }, [publicKey]);

  const initialization = {
    amount: amount,
    preferenceId: undefined, // Não usamos preferenceId para checkout transparente puro, mas o Brick pode pedir
    payer: {
      email: customerEmail,
    },
  };

  const customization = {
    paymentMethods: {
      ticket: "all",
      bankTransfer: "all",
      creditCard: "all",
      debitCard: "all",
      mercadoPago: "all",
    },
    visual: {
      style: {
        theme: "default", // ou 'dark'
      },
    },
  };

  const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const response = await fetch("/api/checkout/process-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formData,
            orderId,
            companyId,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          // Status podem ser: approved, in_process, rejected
          if (result.status === "approved") {
            onSuccess(result.id);
          } else if (result.status === "in_process" || result.status === "pending") {
            // Caso de Boleto ou Pix pendente (embora o Brick de Pix tenha um feedback próprio)
            onSuccess(result.id);
          } else {
            onError(result.error || "Pagamento recusado. Verifique os dados e tente novamente.");
          }
          resolve();
        } else {
          onError(result.error || "Erro ao processar pagamento.");
          reject();
        }
      } catch (error) {
        console.error("Erro no submit do brick:", error);
        onError("Erro de conexão. Tente novamente.");
        reject();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase">Iniciando Checkout Seguro...</p>
      </div>
    );
  }

  return (
    <div id="paymentBrick_container">
      <Payment
        initialization={initialization}
        customization={customization as any}
        onSubmit={onSubmit}
        onReady={() => console.log("Payment Brick is ready")}
        onError={(error) => {
          console.error("Payment Brick Error:", error);
          onError("Erro ao carregar o módulo de pagamento.");
        }}
      />
    </div>
  );
}

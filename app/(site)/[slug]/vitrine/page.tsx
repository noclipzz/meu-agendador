"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Phone, MapPin, ShoppingBag, Tag, Instagram, Facebook, Calendar as CalendarIcon, Store } from "lucide-react";
import { formatarTelefone } from "@/lib/validators";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VitrinePublica({ params }: { params: { slug: string } }) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [vitrineProducts, setVitrineProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch(`/api/empresa-publica?slug=${params.slug}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setEmpresa(data);
        setVitrineProducts(data.products || []);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    }
    carregarDados();
  }, [params.slug]);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast.success("Pagamento realizado com sucesso!");
    } else if (payment === 'failure') {
      toast.error("Ocorreu um erro no seu pagamento.");
    }
  }, [searchParams]);

  async function handleCheckout(product: any) {
    if (!empresa?.hasMercadoPagoModule || !empresa?.mercadopagoPublicKey) {
      return toast.error("Este estabelecimento ainda não aceita pagamentos online.");
    }
    
    setCheckingOut(true);
    try {
      const res = await fetch('/api/checkout/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId: product.id, 
          companyId: empresa.id,
          slug: params.slug
        })
      });
      const data = await res.json();
      
      if (data.id) {
        window.location.href = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${data.id}`;
      } else {
        toast.error(data.error || "Erro ao gerar link de pagamento.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao processar pagamento.");
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Carregando Vitrine...</p>
    </div>
  );

  if (!empresa) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">Empresa não encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      
      {/* CABEÇALHO */}
      <div className="text-center mb-10">
        <div className="relative inline-block mb-4">
          {empresa.logoUrl ? (
            <img src={empresa.logoUrl} alt={empresa.name} className="w-28 h-28 object-cover rounded-[2.5rem] mx-auto shadow-2xl border-4 border-white" />
          ) : (
            <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black mx-auto shadow-xl border-4 border-white">
              {empresa.name.substring(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">{empresa.name}</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Conheça nossos produtos</p>

        <div className="flex justify-center gap-3 mt-6">
          {empresa.instagramUrl && (
            <a href={empresa.instagramUrl} target="_blank" className="p-3 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white rounded-2xl shadow-lg transition hover:scale-110">
              <Instagram size={20} />
            </a>
          )}
          {empresa.facebookUrl && (
            <a href={empresa.facebookUrl} target="_blank" className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg transition hover:scale-110">
              <Facebook size={20} />
            </a>
          )}
        </div>

        {empresa.address && (
          <div className="mt-8 flex flex-col items-center">
             <div className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm">
                <MapPin size={18} className="text-blue-600" />
                <p className="text-[11px] font-black text-gray-900">{empresa.address}, {empresa.city}</p>
             </div>
          </div>
        )}
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex bg-gray-200 p-1.5 rounded-[2rem] w-full max-w-lg mb-8 shadow-inner">
        <Link 
          href={`/${params.slug}`}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-sm font-black transition-all text-gray-500 hover:bg-white/50"
        >
          <CalendarIcon size={18} /> Agendamento
        </Link>
        <button 
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-sm font-black transition-all bg-white text-violet-600 shadow-md"
        >
          <Store size={18} /> Vitrine
        </button>
      </div>

      {/* GRID DE PRODUTOS */}
      <div className="w-full max-w-lg">
        {vitrineProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-xl">
             <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
             <p className="text-gray-500 font-bold">Nenhum produto na vitrine no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {vitrineProducts.map((product: any) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-white rounded-[1.5rem] shadow-md border border-gray-100 overflow-hidden text-left hover:shadow-xl hover:scale-[1.02] transition-all group"
              >
                <div className="relative h-44 bg-gray-100">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ShoppingBag size={40} />
                    </div>
                  )}
                  {product.price && Number(product.price) > 0 && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-white/95 backdrop-blur-sm text-green-600 text-xs font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                        <Tag size={12} /> R$ {Number(product.price).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-black text-gray-900 text-sm truncate">{product.name}</h4>
                  <p className="text-gray-400 text-[10px] font-bold mt-1 line-clamp-2">{product.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DETALHE DO PRODUTO */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-gray-500 hover:text-red-500 transition"
            >
              <X size={20} />
            </button>

            {selectedProduct.imageUrl ? (
              <div className="relative h-64 bg-gray-100">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                {selectedProduct.price && Number(selectedProduct.price) > 0 && (
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-white/95 backdrop-blur-sm text-green-600 text-lg font-black px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2">
                      <Tag size={16} /> R$ {Number(selectedProduct.price).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-40 bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                <ShoppingBag size={48} className="text-violet-300" />
              </div>
            )}

            <div className="p-8">
              <h3 className="text-2xl font-black text-gray-900">{selectedProduct.name}</h3>
              {selectedProduct.description && (
                <p className="text-gray-500 mt-4 leading-relaxed font-medium">{selectedProduct.description}</p>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl transition active:scale-95"
                >
                  Fechar
                </button>
                {selectedProduct.price && Number(selectedProduct.price) > 0 && empresa.hasMercadoPagoModule && (
                  <button
                    onClick={() => handleCheckout(selectedProduct)}
                    disabled={checkingOut}
                    className="flex-[2] bg-gradient-to-r from-violet-600 to-pink-600 text-white font-black py-4 rounded-2xl shadow-xl hover:shadow-2xl transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    {checkingOut ? <Loader2 className="animate-spin" /> : <><Store size={18} /> Comprar Agora</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 text-gray-400 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest">Plataforma de Gestão NOHUD</p>
      </footer>
    </div>
  );
}

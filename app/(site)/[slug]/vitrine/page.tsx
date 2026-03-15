"use client";

import { useState, useEffect } from "react";
import {
  Loader2, X, Phone, MapPin, ShoppingBag, Tag, Instagram, Facebook,
  Calendar as CalendarIcon, Store, ChevronRight, Plus, Minus,
  Trash2, CheckCircle2, Truck, Package, CreditCard, Banknote, ShieldCheck
} from "lucide-react";
import PaymentBrick from "./components/PaymentBrick";
import { AsaasPayment } from "./components/AsaasPayment";
import { formatarTelefone, formatarCEP } from "@/lib/validators";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Step = "VITRINE" | "CART" | "CHECKOUT" | "PAYMENT_MODE_SELECT" | "PAYMENT_DETAIL" | "PAYMENT_GATEWAY" | "SUCCESS";

export default function VitrinePublica({ params }: { params: { slug: string } }) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [vitrineProducts, setVitrineProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [step, setStep] = useState<Step>("VITRINE");

  // Carrinho
  const [cart, setCart] = useState<any[]>([]);
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("Tudo");

  // Informações do Cliente
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    cep: "",
    address: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: ""
  });
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "DELIVERY" | "">("");
  
  // Detalhes do Pagamento na Entrega
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<"money" | "credit" | "debit" | "">("");
  const [needsChange, setNeedsChange] = useState<boolean | null>(null);
  const [changeAmount, setChangeAmount] = useState("");
  
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSubdomain(window.location.hostname.includes(params.slug));
    }
  }, [params.slug]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch(`/api/empresa-publica?slug=${params.slug}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setEmpresa(data);
        setVitrineProducts(data.vitrineProducts || []);

        const settings = data.vitrineSettings || {};
        if (!data.acceptsOnlinePayment && settings.acceptDeliveryPayment) {
          setPaymentMode("DELIVERY");
        } else if (data.acceptsOnlinePayment && !settings.acceptDeliveryPayment) {
          setPaymentMode("ONLINE");
        }

        // PERSISTÊNCIA: Carregar dados do cliente
        const savedInfo = localStorage.getItem('nohud_customer_info');
        if (savedInfo) {
          try {
            setCustomerInfo(prev => ({ ...prev, ...JSON.parse(savedInfo) }));
          } catch { /* ignora erro de parse */ }
        }

        const savedCart = localStorage.getItem(`nohud_cart_${params.slug}`);
        if (savedCart) {
          try {
            setCart(JSON.parse(savedCart));
          } catch { /* ignora erro de parse */ }
        }
        const savedPrefs = localStorage.getItem('nohud_checkout_prefs');
        if (savedPrefs) {
          try {
            const { delivery, payment } = JSON.parse(savedPrefs);
            if (delivery) setDeliveryMethod(delivery);
            if (payment) setPaymentMode(payment);
          } catch { /* ignora erro de parse */ }
        }
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    }
    carregarDados();
  }, [params.slug]);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('orderId');
    if (payment === 'success' && orderId) {
      setStep("SUCCESS");
      setCart([]);
      localStorage.removeItem(`nohud_cart_${params.slug}`);
      toast.success("Pagamento realizado com sucesso!");
    } else if (payment === 'failure') {
      toast.error("Ocorreu um erro no seu pagamento.");
    } else if (payment === 'pending' && orderId) {
      toast.info("Aguardando confirmação do pagamento...");
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/checkout/order-status?orderId=${orderId}`);
          const data = await res.json();
          if (data.isPaid || data.status === 'PAID') {
            clearInterval(interval);
            setStep("SUCCESS");
            setCart([]);
            localStorage.removeItem(`nohud_cart_${params.slug}`);
            toast.success("Pagamento confirmado com sucesso!");
          }
        } catch (e) {}
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [searchParams, params.slug]);

  // Salvar carrinho sempre que mudar
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`nohud_cart_${params.slug}`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`nohud_cart_${params.slug}`);
    }
  }, [cart, params.slug]);

  // Salvar informações do cliente sempre que mudar
  useEffect(() => {
    localStorage.setItem('nohud_customer_info', JSON.stringify(customerInfo));
  }, [customerInfo]);

  // Salvar preferências de entrega e pagamento
  useEffect(() => {
    localStorage.setItem('nohud_checkout_prefs', JSON.stringify({
      delivery: deliveryMethod,
      payment: paymentMode
    }));
  }, [deliveryMethod, paymentMode]);

  function addToCart(product: any, qty: number) {
    const variationString = Object.entries(selectedVariations)
      .map(([name, val]) => `${name}: ${val}`)
      .join(", ");

    const cartItemId = variationString ? `${product.id}-${variationString}` : product.id;

    const existing = cart.find(item => item.cartItemId === cartItemId);
    const qtyToAdd = product.showStock ? Math.min(qty, Number(product.quantity || 0)) : qty;

    if (existing) {
      setCart(cart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + qtyToAdd } : item));
    } else {
      setCart([...cart, {
        ...product,
        cartItemId,
        quantity: qtyToAdd,
        selectedVariations: { ...selectedVariations },
        variationLabel: variationString
      }]);
    }
    setSelectedProduct(null);
    setSelectedQty(1);
    setSelectedVariations({});
    toast.success("Adicionado ao carrinho!");
  }

  function removeFromCart(cartItemId: string) {
    setCart(cart.filter(item => item.cartItemId !== cartItemId));
  }

  function updateQty(cartItemId: string, delta: number) {
    setCart(cart.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }

  const cartSubtotal = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  const shippingCost = deliveryMethod === "DELIVERY"
    ? cart.reduce((max, item) => Math.max(max, Number(item.shippingCost || 0)), 0)
    : 0;

  const cartTotal = cartSubtotal + shippingCost;

  async function buscarCep(cep: string) {
    const value = cep.replace(/\D/g, "");
    setCustomerInfo(prev => ({ ...prev, cep: formatarCEP(value) }));

    if (value.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCustomerInfo(prev => ({
            ...prev,
            address: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  }

  async function handleProceedToPayment() {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      return toast.error("Por favor, preencha nome, e-mail e telefone.");
    }

    if (!customerInfo.email.includes("@")) {
      return toast.error("Por favor, insira um e-mail válido.");
    }

    if (deliveryMethod === "DELIVERY" && (!customerInfo.cep || !customerInfo.address || !customerInfo.number)) {
      return toast.error("Por favor, preencha o endereço de entrega completo.");
    }

    setCheckingOut(true);
    try {
      localStorage.setItem('nohud_customer_info', JSON.stringify(customerInfo));

      const res = await fetch("/api/checkout/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customerInfo,
          deliveryMethod,
          companyId: empresa.id,
          slug: params.slug,
          addressInfo: customerInfo,
          shippingCost,
          paymentMode,
          deliveryPaymentDetails: paymentMode === "DELIVERY" ? {
            method: deliveryPaymentMethod,
            needsChange,
            changeAmount: needsChange ? changeAmount : null
          } : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar pagamento");

      if (paymentMode === "DELIVERY") {
        setStep("SUCCESS");
        setCart([]);
        localStorage.removeItem(`nohud_cart_${params.slug}`);
      } else {
        // Checkout Transparente
        if (empresa.mercadopagoPublicKey || empresa.acceptsAsaas) {
            setActiveOrderId(data.orderId);
            setStep("PAYMENT_GATEWAY");
        } else {
            // Fallback para redirect
            window.location.href = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${data.id}`;
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Falha ao processar pagamento.");
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

  const categories = ["Tudo", ...Array.from(new Set(vitrineProducts.map(p => p.category).filter(Boolean)))];

  const filteredProducts = selectedCategory === "Tudo"
    ? vitrineProducts
    : vitrineProducts.filter(p => p.category === selectedCategory);

  if (step === "SUCCESS") {
    const hasProntaEntrega = cart.some(item => item.deliveryDeadline?.toLowerCase().includes("pronta entrega"));
    const isPayOnDelivery = paymentMode === "DELIVERY";

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {isPayOnDelivery ? "Pedido confirmado!" : "Pagamento confirmado!"}
          </h2>
          <p className="text-gray-500 font-medium mb-6">
            {isPayOnDelivery 
              ? "Recebemos seu pedido. Prepare o pagamento para o momento da entrega/retirada!"
              : (hasProntaEntrega
                  ? "Seu pedido já está te aguardando!"
                  : "Você receberá uma mensagem assim que seu pedido estiver disponível.")
            }
          </p>
          <button
            onClick={() => window.location.href = isSubdomain ? "/vitrine" : `/${params.slug}/vitrine`}
            className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black transition"
          >
            Voltar para a Vitrine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans pb-32">

      {/* CABEÇALHO */}
      <div className="text-center mb-10 w-full max-w-lg">
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
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Agendamento Online</p>

        <div className="flex justify-center gap-3 mt-6">
          {empresa.instagramUrl && (
            <a
              href={empresa.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white rounded-2xl hover:scale-110 active:scale-95 transition shadow-lg"
              title="Visitar Instagram"
            >
              <Instagram size={20} />
            </a>
          )}
          {empresa.facebookUrl && (
            <a
              href={empresa.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-blue-600 text-white rounded-2xl hover:scale-110 active:scale-95 transition shadow-lg"
              title="Visitar Facebook"
            >
              <Facebook size={20} />
            </a>
          )}
        </div>

        {(empresa.address || empresa.city) && (
          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm">
              <MapPin size={18} className="text-blue-600" />
              <div className="text-left">
                <p className="text-[11px] font-black text-gray-900 leading-tight">
                  {empresa.address ? `${empresa.address}${empresa.number ? `, ${empresa.number}` : ""}` : empresa.city}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                  {empresa.address ? (
                    <>{empresa.neighborhood && `${empresa.neighborhood}, `}{empresa.city}{empresa.state ? ` - ${empresa.state}` : ""}</>
                  ) : (
                    <>{empresa.state ? `Estado de ${empresa.state}` : "Localização da Empresa"}</>
                  )}
                </p>
              </div>
            </div>
            {empresa.phone && (
              <div className="mt-3 flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                <Phone size={10} /> {formatarTelefone(empresa.phone)}
              </div>
            )}
          </div>
        )}
      </div>

      {step === "VITRINE" && (
        <>
          {/* TABS DE NAVEGAÇÃO */}
          <div className="flex bg-gray-200 p-1.5 rounded-[2rem] w-full max-w-lg mb-8 shadow-inner">
            <Link
              href={isSubdomain ? "/" : `/${params.slug}`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-sm font-black transition-all text-gray-500 hover:bg-white/50"
            >
              <CalendarIcon size={18} /> Agendamento
            </Link>
            <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-sm font-black transition-all bg-white text-violet-600 shadow-md">
              <Store size={18} /> Vitrine
            </button>
          </div>

          <div className="w-full max-w-lg">
            {categories.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat ? "bg-violet-600 text-white shadow-violet-200" : "bg-white text-gray-400 hover:bg-gray-100 border border-gray-100"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-xl">
                <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-500 font-bold">Nenhum produto encontrado nesta categoria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setSelectedQty(1);
                      const initialVars: any = {};
                      if (Array.isArray(product.variations)) {
                        product.variations.forEach((v: any) => {
                          if (v.options?.length > 0) initialVars[v.name] = v.options[0];
                        });
                      }
                      setSelectedVariations(initialVars);
                    }}
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
                      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
                        {product.unitValue > 1 && (
                          <span className="bg-violet-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                            {product.unitValue} un
                          </span>
                        )}
                        {product.showStock && product.quantity !== undefined && (
                          <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                            Estoque: {product.quantity}
                          </span>
                        )}
                        <span className="bg-white/95 backdrop-blur-sm text-green-600 text-xs font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                          <Tag size={12} /> R$ {Number(product.price).toFixed(2)}
                        </span>
                      </div>
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
        </>
      )}

      {step === "CART" && (
        <div className="w-full max-w-lg animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep("VITRINE")} className="p-2 bg-white rounded-xl shadow-sm"><X size={20} /></button>
            <h2 className="text-2xl font-black text-gray-900">Meu Carrinho</h2>
          </div>

          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.cartItemId} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
                <img src={item.imageUrl} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex-1">
                  <h4 className="font-black text-sm">{item.name}</h4>
                  <div className="flex flex-wrap gap-x-2 mt-0.5">
                    {item.variationLabel && <p className="text-[10px] text-gray-400 font-bold uppercase">{item.variationLabel}</p>}
                    {item.unitValue > 1 && <p className="text-[10px] text-blue-500 font-bold uppercase">Pacote c/ {item.unitValue} un</p>}
                  </div>
                  <p className="text-green-600 font-black text-xs mt-1">R$ {Number(item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl">
                  <button onClick={() => updateQty(item.cartItemId, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm"><Minus size={14} /></button>
                  <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.cartItemId, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm"><Plus size={14} /></button>
                </div>
                <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-400 hover:text-red-600 transition p-2"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="mt-8 bg-white p-6 rounded-3xl shadow-xl space-y-4">
              <div className="space-y-2 border-b pb-4">
                <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                  <span>Subtotal</span>
                  <span>R$ {cartSubtotal.toFixed(2)}</span>
                </div>
                {deliveryMethod === "DELIVERY" && (
                  <div className="flex justify-between items-center text-blue-600 font-bold uppercase text-[10px] tracking-widest">
                    <span className="flex items-center gap-1"><Truck size={12} /> Frete</span>
                    <span>{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : "Grátis"}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center text-gray-900 dark:text-white font-black text-xl pt-2">
                <span>Total</span>
                <span>R$ {cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setStep("CHECKOUT")}
                className="w-full bg-violet-600 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
              >
                Continuar <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {step === "CHECKOUT" && (
        <div className="w-full max-w-lg animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep("CART")} className="p-2 bg-white rounded-xl shadow-sm"><X size={20} /></button>
            <h2 className="text-2xl font-black text-gray-900">Finalizar Pedido</h2>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Seus Dados</h3>
              <input
                placeholder="Nome Completo"
                className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                value={customerInfo.name}
                onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              />
              <input
                placeholder="E-mail"
                className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                value={customerInfo.email}
                onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              />
              <input
                placeholder="WhatsApp"
                className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                value={formatarTelefone(customerInfo.phone)}
                maxLength={15}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, "").substring(0, 11);
                  setCustomerInfo({ ...customerInfo, phone: val });
                }}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Forma de Recebimento</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeliveryMethod("PICKUP")}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${deliveryMethod === "PICKUP" ? "border-violet-600 bg-violet-50 text-violet-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                >
                  <Package size={24} />
                  <span className="font-black text-xs">Retirada na Loja</span>
                </button>
                <button
                  onClick={() => setDeliveryMethod("DELIVERY")}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative ${deliveryMethod === "DELIVERY" ? "border-violet-600 bg-violet-50 text-violet-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                >
                  <Truck size={24} />
                  <span className="font-black text-xs">Entrega</span>
                  {deliveryMethod === "DELIVERY" && shippingCost > 0 && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-in zoom-in">
                      +{shippingCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                  {deliveryMethod === "DELIVERY" && shippingCost === 0 && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-in zoom-in">
                      Grátis
                    </div>
                  )}
                </button>
              </div>

              {deliveryMethod === "DELIVERY" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Endereço de Entrega</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="CEP"
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                      value={customerInfo.cep}
                      onChange={e => buscarCep(e.target.value)}
                    />
                    <input
                      placeholder="Número"
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                      value={customerInfo.number}
                      onChange={e => setCustomerInfo({ ...customerInfo, number: e.target.value })}
                    />
                  </div>
                  <input
                    placeholder="Logradouro"
                    className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                    value={customerInfo.address}
                    onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Bairro"
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                      value={customerInfo.neighborhood}
                      onChange={e => setCustomerInfo({ ...customerInfo, neighborhood: e.target.value })}
                    />
                    <input
                      placeholder="Complemento"
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                      value={customerInfo.complement}
                      onChange={e => setCustomerInfo({ ...customerInfo, complement: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      placeholder="Cidade"
                      className="col-span-2 w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                      value={customerInfo.city}
                      onChange={e => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                    />
                    <input
                      placeholder="UF"
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold uppercase"
                      maxLength={2}
                      value={customerInfo.state}
                      onChange={e => setCustomerInfo({ ...customerInfo, state: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-2 border border-gray-100">
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span>Produtos</span>
                <span>R$ {cartSubtotal.toFixed(2)}</span>
              </div>
              {deliveryMethod === "DELIVERY" && (
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>Entrega</span>
                  <span>{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'Grátis'}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black text-gray-900 border-t pt-2">
                <span>Total</span>
                <span>R$ {cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => {
                  if (!customerInfo.name || !customerInfo.phone) {
                    return toast.error("Por favor, preencha nome e telefone");
                  }
                  if (deliveryMethod === "DELIVERY" && !customerInfo.address) {
                    return toast.error("Por favor, preencha o endereço de entrega");
                  }
                  
                  if (empresa.acceptsOnlinePayment && !empresa.vitrineSettings?.acceptDeliveryPayment) {
                      setPaymentMode("ONLINE");
                      handleProceedToPayment();
                      return;
                  }

                  if (!empresa.acceptsOnlinePayment && empresa.vitrineSettings?.acceptDeliveryPayment) {
                      setPaymentMode("DELIVERY");
                      setStep("PAYMENT_DETAIL");
                      return;
                  }

                  setStep("PAYMENT_MODE_SELECT");
                }}
                className="w-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-black py-5 rounded-2xl shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-2"
              >
                <ChevronRight size={20} /> {!empresa.vitrineSettings?.acceptDeliveryPayment && empresa.acceptsOnlinePayment ? "Finalizar Pedido" : "Próximo Passo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "PAYMENT_MODE_SELECT" && (
        <div className="w-full max-w-lg animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep("CHECKOUT")} className="p-2 bg-white rounded-xl shadow-sm"><X size={20} /></button>
            <h2 className="text-2xl font-black text-gray-900">Como deseja pagar?</h2>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl space-y-6">
            <div className="grid grid-cols-1 gap-3">
              {empresa.acceptsOnlinePayment && (
                <button
                  onClick={() => setPaymentMode(paymentMode === "ONLINE" ? "" as any : "ONLINE")}
                  className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${paymentMode === "ONLINE" ? "border-violet-600 bg-violet-50 text-violet-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                >
                  <CreditCard size={32} />
                  <div className="text-left">
                    <p className="font-black text-sm uppercase">Pagar Online</p>
                    <p className="text-xs opacity-70">Cartão ou Pix</p>
                  </div>
                </button>
              )}
              {empresa.vitrineSettings?.acceptDeliveryPayment && (
                <button
                  onClick={() => setPaymentMode(paymentMode === "DELIVERY" ? "" as any : "DELIVERY")}
                  className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${paymentMode === "DELIVERY" ? "border-violet-600 bg-violet-50 text-violet-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                >
                  <Banknote size={32} />
                  <div className="text-left">
                    <p className="font-black text-sm uppercase">Pagar na Entrega</p>
                    <p className="text-xs opacity-70">Pague pessoalmente ao receber</p>
                  </div>
                </button>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={() => {
                  if (!paymentMode) return toast.error("Selecione uma forma de pagamento");
                  if (paymentMode === "DELIVERY") {
                    setStep("PAYMENT_DETAIL");
                  } else {
                    handleProceedToPayment();
                  }
                }}
                disabled={checkingOut || !paymentMode}
                className={`w-full font-black py-5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 ${checkingOut || !paymentMode ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" : "bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:shadow-2xl"}`}
              >
                {checkingOut ? <Loader2 className="animate-spin" /> : <><ChevronRight size={20} /> {paymentMode === "DELIVERY" ? "Próximo Passo" : "Finalizar Pedido"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "PAYMENT_DETAIL" && (
        <div className="w-full max-w-lg animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep("PAYMENT_MODE_SELECT")} className="p-2 bg-white rounded-xl shadow-sm"><ChevronRight className="rotate-180" size={20} /></button>
            <h2 className="text-2xl font-black text-gray-900">Detalhes do Recebimento</h2>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Método de pagamento na entrega</h3>
              <div className="grid grid-cols-1 gap-3">
                {(empresa.vitrineSettings?.deliveryMethods || ["money", "credit", "debit"]).map((method: string) => {
                  const labels: Record<string, string> = { money: "Dinheiro", credit: "Cartão de Crédito", debit: "Cartão de Débito" };
                  return (
                    <button
                      key={method}
                      onClick={() => setDeliveryPaymentMethod(deliveryPaymentMethod === method ? "" as any : method as any)}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${deliveryPaymentMethod === method ? "border-emerald-600 bg-emerald-50 text-emerald-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                    >
                      {method === 'money' ? <Banknote size={24} /> : <CreditCard size={24} />}
                      <span className="font-black text-xs uppercase">{labels[method] || method}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {deliveryPaymentMethod === "money" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Precisa de troco?</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setNeedsChange(true)} className={`p-4 rounded-2xl border-2 transition-all font-black text-xs ${needsChange === true ? "border-emerald-600 bg-emerald-50 text-emerald-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}>Sim</button>
                  <button onClick={() => { setNeedsChange(false); setChangeAmount(""); }} className={`p-4 rounded-2xl border-2 transition-all font-black text-xs ${needsChange === false ? "border-emerald-600 bg-emerald-50 text-emerald-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}>Não</button>
                </div>
                {needsChange && (
                  <input
                    placeholder="Troco para quanto?"
                    className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-emerald-200 focus:bg-white transition font-bold"
                    value={changeAmount}
                    onChange={e => setChangeAmount(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={handleProceedToPayment}
                disabled={checkingOut || !deliveryPaymentMethod || (deliveryPaymentMethod === "money" && needsChange === null)}
                className={`w-full font-black py-5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 ${checkingOut || !deliveryPaymentMethod || (deliveryPaymentMethod === "money" && needsChange === null) ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-2xl"}`}
              >
                {checkingOut ? <Loader2 className="animate-spin" /> : <><Store size={20} /> Finalizar Pedido</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "PAYMENT_GATEWAY" && (
        <div className="w-full max-w-lg animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setStep("PAYMENT_MODE_SELECT")} className="p-2 bg-white rounded-xl shadow-sm"><ChevronRight className="rotate-180" size={20} /></button>
            <div className="flex-1">
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Pagamento Seguro</h2>
                <div className="flex items-center gap-1.5 text-emerald-600">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Ambiente Criptografado</span>
                </div>
              {empresa.acceptsAsaas ? (
               <AsaasPayment 
                orderId={activeOrderId!}
                companyId={empresa.id}
                onSuccess={() => {
                    toast.success("Pagamento confirmado!");
                    setStep("SUCCESS");
                    setCart([]);
                    localStorage.removeItem(`nohud_cart_${params.slug}`);
                }}
                onError={(err) => {
                    toast.error(err);
                }}
             />
             ) : (
             <PaymentBrick 
                publicKey={empresa.mercadopagoPublicKey}
                amount={cartTotal}
                orderId={activeOrderId!}
                companyId={empresa.id}
                customerEmail={customerInfo.email}
                onSuccess={() => {
                    toast.success("Pagamento confirmado!");
                    setStep("SUCCESS");
                    setCart([]);
                    localStorage.removeItem(`nohud_cart_${params.slug}`);
                }}
                onError={(err) => {
                    toast.error(err);
                }}
             />
             )}
            </div>
          </div>
        </div>
      )}

      {step === "VITRINE" && cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50">
          <button
            onClick={() => setStep("CART")}
            className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-black text-xs">{cart.length}</div>
              <span className="font-black text-sm uppercase tracking-tighter">Ver Carrinho</span>
            </div>
            <span className="font-black text-sm">R$ {cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-gray-500 hover:text-red-500 transition">
              <X size={20} />
            </button>

            {selectedProduct.imageUrl ? (
              <div className="relative h-64 bg-gray-100">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2">
                  <span className="bg-white/95 backdrop-blur-sm text-green-600 text-lg font-black px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2">
                    <Tag size={16} /> R$ {Number(selectedProduct.price).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-40 bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                <ShoppingBag size={48} className="text-violet-300" />
              </div>
            )}

            <div className="p-8">
              <h3 className="text-2xl font-black text-gray-900">{selectedProduct.name}</h3>
              <p className="text-gray-500 mt-4 leading-relaxed font-medium">{selectedProduct.description}</p>

              <div className="mt-8 space-y-4">
                {Array.isArray(selectedProduct.variations) && selectedProduct.variations.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {selectedProduct.variations.map((v: any, i: number) => (
                      <div key={i}>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">{v.name}</label>
                        <div className="flex flex-wrap gap-2">
                          {v.options.map((opt: string) => (
                            <button
                              key={opt}
                              onClick={() => setSelectedVariations({ ...selectedVariations, [v.name]: opt })}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${selectedVariations[v.name] === opt ? "border-violet-600 bg-violet-600 text-white shadow-lg" : "border-gray-100 bg-gray-50 text-gray-500"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                  <span className="font-black text-sm text-gray-400 uppercase tracking-widest">Quantidade</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm"><Minus size={18} /></button>
                    <span className="font-black text-xl w-6 text-center">{selectedQty}</span>
                    <button onClick={() => setSelectedQty(selectedQty + 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm"><Plus size={18} /></button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setSelectedProduct(null)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl transition">Voltar</button>
                  <button onClick={() => addToCart(selectedProduct, selectedQty)} className="flex-[2] bg-violet-600 text-white font-black py-4 rounded-2xl shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-2">
                    <ShoppingBag size={18} /> Adicionar
                  </button>
                </div>
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

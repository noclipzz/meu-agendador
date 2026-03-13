"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, X, Phone, MapPin, ShoppingBag, Tag, Instagram, Facebook, 
  Calendar as CalendarIcon, Store, ChevronRight, Plus, Minus, 
  Trash2, CheckCircle2, Truck, Package, CreditCard, Banknote 
} from "lucide-react";
import { formatarTelefone, formatarCEP } from "@/lib/validators";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Step = "VITRINE" | "CART" | "CHECKOUT" | "SUCCESS";

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
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "DELIVERY">("ONLINE");

  const searchParams = useSearchParams();

  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch(`/api/empresa-publica?slug=${params.slug}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setEmpresa(data);
        setVitrineProducts(data.vitrineProducts || []);

        // Se a empresa não aceitar pagamento online (ex: sem token MP), mas aceitar na entrega, muda o padrão
        const settings = data.vitrineSettings || {};
        if (!data.mercadopagoAccessToken && settings.acceptDeliveryPayment) {
          setPaymentMode("DELIVERY");
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
    if (payment === 'success') {
      setStep("SUCCESS");
      setCart([]);
      localStorage.removeItem(`nohud_cart_${params.slug}`);
      toast.success("Pagamento realizado com sucesso!");
    } else if (payment === 'failure') {
      toast.error("Ocorreu um erro no seu pagamento.");
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
    if (existing) {
      setCart(cart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + qty } : item));
    } else {
      setCart([...cart, { 
        ...product, 
        cartItemId,
        quantity: qty, 
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
  
  // FRETE: O valor do frete agora é somado se for entrega. Pegamos o frete do produto ou o maior se houver vários.
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
      // PERSISTÊNCIA: Salvar dados para a próxima compra
      localStorage.setItem('nohud_customer_info', JSON.stringify(customerInfo));

      const res = await fetch('/api/checkout/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart,
          customerInfo,
          deliveryMethod,
          shippingCost,
          paymentMode,
          addressInfo: { 
            cep: customerInfo.cep,
            address: customerInfo.address,
            number: customerInfo.number,
            neighborhood: customerInfo.neighborhood,
            city: customerInfo.city,
            state: customerInfo.state,
            complement: customerInfo.complement
          },
          companyId: empresa.id,
          slug: params.slug
        })
      });
      const data = await res.json();
      
      if (data.id) {
        window.location.href = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${data.id}`;
      } else if (data.success) {
        setStep("SUCCESS");
        toast.success("Pedido realizado com sucesso!");
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

  // Categorias únicas
  const categories = ["Tudo", ...Array.from(new Set(vitrineProducts.map(p => p.category).filter(Boolean)))];

  const filteredProducts = selectedCategory === "Tudo" 
    ? vitrineProducts 
    : vitrineProducts.filter(p => p.category === selectedCategory);

  // TELA DE SUCESSO
  if (step === "SUCCESS") {
    const hasProntaEntrega = cart.some(item => item.deliveryDeadline?.toLowerCase().includes("pronta entrega"));
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Pagamento confirmado!</h2>
          <p className="text-gray-500 font-medium mb-6">
            {hasProntaEntrega 
              ? "Seu pedido já está te aguardando!" 
              : "Você receberá uma mensagem assim que seu pedido estiver disponível."}
          </p>
          <button 
            onClick={() => window.location.href = `/${params.slug}/vitrine`}
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
              href={`/${params.slug}`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-sm font-black transition-all text-gray-500 hover:bg-white/50"
            >
              <CalendarIcon size={18} /> Agendamento
            </Link>
            <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-sm font-black transition-all bg-white text-violet-600 shadow-md">
              <Store size={18} /> Vitrine
            </button>
          </div>

          <div className="w-full max-w-lg">
            {/* FILTRO DE CATEGORIAS */}
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
                          <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                            {product.unitValue} UNIDADES
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
                  {item.variationLabel && <p className="text-[10px] text-gray-400 font-bold uppercase">{item.variationLabel}</p>}
                  <p className="text-green-600 font-bold text-xs">R$ {Number(item.price).toFixed(2)}</p>
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
              <div className="flex justify-between items-center text-gray-900 font-black text-xl pt-2">
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
                onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
              />
              <input 
                placeholder="E-mail" 
                className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                value={customerInfo.email}
                onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
              />
              <input 
                placeholder="WhatsApp" 
                className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                value={formatarTelefone(customerInfo.phone)}
                maxLength={15}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, "").substring(0, 11);
                  setCustomerInfo({...customerInfo, phone: val});
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
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${deliveryMethod === "DELIVERY" ? "border-violet-600 bg-violet-50 text-violet-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                >
                  <Truck size={24} />
                  <span className="font-black text-xs">Entrega</span>
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
                      onChange={e => setCustomerInfo({...customerInfo, number: e.target.value})}
                    />
                  </div>

                  <input 
                    placeholder="Logradouro (Rua/Avenida)" 
                    className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                    value={customerInfo.address}
                    onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder="Bairro" 
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                      value={customerInfo.neighborhood}
                      onChange={e => setCustomerInfo({...customerInfo, neighborhood: e.target.value})}
                    />
                    <input 
                      placeholder="Complemento (Opcional)" 
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                      value={customerInfo.complement}
                      onChange={e => setCustomerInfo({...customerInfo, complement: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <input 
                      placeholder="Cidade" 
                      className="col-span-2 w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold"
                      value={customerInfo.city}
                      onChange={e => setCustomerInfo({...customerInfo, city: e.target.value})}
                    />
                    <input 
                      placeholder="UF" 
                      maxLength={2}
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 outline-none focus:border-violet-200 focus:bg-white transition font-bold uppercase"
                      value={customerInfo.state}
                      onChange={e => setCustomerInfo({...customerInfo, state: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
              )}
            </div>

            {((empresa.mercadopagoAccessToken) || (empresa.vitrineSettings?.acceptDeliveryPayment)) && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Pagamento</h3>
                <div className="grid grid-cols-1 gap-3">
                  {empresa.mercadopagoAccessToken && (
                    <button 
                      onClick={() => setPaymentMode("ONLINE")}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${paymentMode === "ONLINE" ? "border-violet-600 bg-violet-50 text-violet-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                    >
                      <CreditCard size={24} />
                      <div className="text-left">
                        <p className="font-black text-xs uppercase">Pagar Online</p>
                        <p className="text-[10px] opacity-70">Cartão, Pix ou Boleto</p>
                      </div>
                    </button>
                  )}
                  {empresa.vitrineSettings?.acceptDeliveryPayment && (
                    <button 
                      onClick={() => setPaymentMode("DELIVERY")}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${paymentMode === "DELIVERY" ? "border-violet-600 bg-violet-50 text-violet-600" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                    >
                      <Banknote size={24} />
                      <div className="text-left">
                        <p className="font-black text-xs uppercase">Pagar na Entrega/Retirada</p>
                        <p className="text-[10px] opacity-70">Pague pessoalmente ao receber</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4">
              <button 
                onClick={handleProceedToPayment}
                disabled={checkingOut}
                className="w-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-black py-5 rounded-2xl shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-2"
              >
                {checkingOut ? <Loader2 className="animate-spin" /> : <><Store size={20} /> Finalizar Pedido</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOAT CART BUTTON */}
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
                <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2">
                  {selectedProduct.unitValue > 1 && (
                    <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-xl shadow-lg">
                      {selectedProduct.unitValue} UNIDADES
                    </span>
                  )}
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
              {selectedProduct.description && (
                <p className="text-gray-500 mt-4 leading-relaxed font-medium">{selectedProduct.description}</p>
              )}

              <div className="mt-8 space-y-4">
                {/* VARIAÇÕES */}
                {Array.isArray(selectedProduct.variations) && selectedProduct.variations.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {selectedProduct.variations.map((v: any, i: number) => (
                      <div key={i}>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">{v.name}</label>
                        <div className="flex flex-wrap gap-2">
                          {v.options.map((opt: string) => {
                            const isActive = selectedVariations[v.name] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => setSelectedVariations({ ...selectedVariations, [v.name]: opt })}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                                  isActive 
                                    ? "border-violet-600 bg-violet-600 text-white shadow-lg" 
                                    : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
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
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl transition active:scale-95"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => addToCart(selectedProduct, selectedQty)}
                    className="flex-[2] bg-violet-600 text-white font-black py-4 rounded-2xl shadow-xl hover:shadow-2xl transition active:scale-95 flex items-center justify-center gap-2"
                  >
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

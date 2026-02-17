"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Loader2, Plus, Trash2, Megaphone, Calendar, AlertTriangle,
    PartyPopper, Image as ImageIcon, X, Send
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export default function MuralPage() {
    const { user } = useUser();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);

    // Form
    const [novoPost, setNovoPost] = useState({
        title: "",
        content: "",
        type: "AVISO",
        imageUrl: ""
    });

    async function carregarPosts() {
        setLoading(true);
        try {
            const res = await fetch('/api/painel/mural');
            const data = await res.json();
            if (Array.isArray(data)) setPosts(data);
        } catch (error) {
            toast.error("Erro ao carregar mural.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarPosts();
    }, []);

    async function criarPost() {
        if (!novoPost.title || !novoPost.content) return toast.error("Preencha título e conteúdo.");
        setSalvando(true);

        try {
            const res = await fetch('/api/painel/mural', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoPost)
            });

            if (res.ok) {
                toast.success("Aviso publicado!");
                setModalAberto(false);
                setNovoPost({ title: "", content: "", type: "AVISO", imageUrl: "" });
                carregarPosts();
            } else {
                toast.error("Erro ao publicar.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setSalvando(false);
        }
    }

    async function deletarPost(id: string) {
        if (!confirm("Remover este aviso?")) return;
        try {
            const res = await fetch('/api/painel/mural', {
                method: 'DELETE',
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== id));
                toast.success("Removido.");
            } else {
                toast.error("Erro ao remover.");
            }
        } catch { }
    }

    const getIconeTipo = (tipo: string) => {
        switch (tipo) {
            case 'URGENTE': return <AlertTriangle className="text-red-500" />;
            case 'CELEBRACAO': return <PartyPopper className="text-purple-500" />;
            case 'EVENTO': return <Calendar className="text-blue-500" />;
            default: return <Megaphone className="text-gray-500" />;
        }
    }

    const getCorBorda = (tipo: string) => {
        switch (tipo) {
            case 'URGENTE': return 'border-l-4 border-l-red-500';
            case 'CELEBRACAO': return 'border-l-4 border-l-purple-500';
            case 'EVENTO': return 'border-l-4 border-l-blue-500';
            default: return 'border-l-4 border-l-gray-400';
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <Megaphone className="text-blue-600" /> Mural da Equipe
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Avisos, novidades e comunicados importantes.</p>
                </div>
                <button
                    onClick={() => setModalAberto(true)}
                    className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <Plus size={20} /> Novo Aviso
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                    <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Atualizando mural...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Megaphone size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Mural vazio</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Nenhum comunicado por enquanto. Que tal dar as boas-vindas à equipe?
                    </p>
                    <button
                        onClick={() => setModalAberto(true)}
                        className="mt-6 text-blue-600 font-black hover:underline"
                    >
                        Criar primeiro post
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {posts.map((post) => (
                        <div key={post.id} className={`bg-white dark:bg-gray-800 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative group overflow-hidden ${getCorBorda(post.type)}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                        {getIconeTipo(post.type)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-gray-800 dark:text-white leading-tight">{post.title}</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase">
                                            {post.authorName || "Anônimo"} • {formatDistanceToNow(new Date(post.createdAt), { locale: ptBR, addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                {(user?.id === post.authorId || user?.publicMetadata?.role === 'admin') && (
                                    <button
                                        onClick={() => deletarPost(post.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                        title="Excluir post"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                {post.content}
                            </div>

                            {post.imageUrl && (
                                <div className="mt-4 rounded-xl overflow-hidden shadow-sm border dark:border-gray-700">
                                    <img src={post.imageUrl} alt="Anexo" className="w-full h-auto max-h-[400px] object-cover" />
                                </div>
                            )}

                            <div className="mt-4 flex gap-2">
                                <span className="text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-900 text-gray-500 px-3 py-1 rounded-full">
                                    #{post.type}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL NOVO POST */}
            {modalAberto && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 relative border dark:border-gray-800">
                        <button onClick={() => setModalAberto(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition">
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <Send className="text-blue-600" /> Novo Comunicado
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-black text-gray-400 ml-2 mb-1 block">Título do Aviso</label>
                                <input
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-bold dark:text-white transition"
                                    placeholder="Ex: Reunião Geral de Sexta"
                                    value={novoPost.title}
                                    onChange={e => setNovoPost({ ...novoPost, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-gray-400 ml-2 mb-1 block">Tipo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['AVISO', 'URGENTE', 'EVENTO', 'CELEBRACAO'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setNovoPost({ ...novoPost, type: t })}
                                            className={`p-3 rounded-xl text-xs font-black uppercase border-2 transition ${novoPost.type === t ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 dark:border-gray-700 text-gray-400 hover:border-blue-200'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-gray-400 ml-2 mb-1 block">Mensagem</label>
                                <textarea
                                    className="w-full border-2 dark:border-gray-700 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 font-medium text-sm dark:text-white transition resize-none h-32"
                                    placeholder="Escreva aqui seu comunicado para toda a equipe..."
                                    value={novoPost.content}
                                    onChange={e => setNovoPost({ ...novoPost, content: e.target.value })}
                                />
                            </div>

                            {/* Campo de Imagem (Simplificado por URL por enquanto) */}
                            <div>
                                <label className="text-[10px] uppercase font-black text-gray-400 ml-2 mb-1 block flex items-center gap-1"><ImageIcon size={12} /> Imagem (URL Opcional)</label>
                                <input
                                    className="w-full border-2 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:border-blue-500 text-xs font-bold dark:text-white transition"
                                    placeholder="https://..."
                                    value={novoPost.imageUrl}
                                    onChange={e => setNovoPost({ ...novoPost, imageUrl: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={criarPost}
                                disabled={salvando}
                                className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                            >
                                {salvando ? <Loader2 className="animate-spin" /> : "Publicar Agora"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


import { X, Loader2, Edit3 } from "lucide-react";
import { ModalPortal } from "./ModalPortal";
import { useEffect, useState } from "react";

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

export function PromptModal({
    isOpen, onClose, onConfirm, title, message,
    defaultValue = "",
    placeholder = "Digite aqui...",
    confirmText = "Confirmar", cancelText = "Cancelar",
    isLoading = false
}: PromptModalProps) {
    const [value, setValue] = useState(defaultValue);
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setValue(defaultValue);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsRendered(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen, defaultValue]);

    if (!isRendered) return null;

    return (
        <ModalPortal>
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-md flex justify-center items-center z-[9999] p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            >
                <div
                    className={`bg-white dark:bg-[#0f172a] p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-white/20 dark:border-white/5 transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col items-center text-center relative">
                        <button
                            onClick={onClose}
                            className="absolute -top-4 -right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        >
                            <X size={16} className="text-gray-500" />
                        </button>

                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 ring-[12px] ring-blue-50/50 dark:ring-blue-900/10 shadow-lg shadow-black/5">
                            <Edit3 size={32} className="text-blue-500" />
                        </div>

                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight leading-tight">
                            {title}
                        </h3>

                        <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-6 leading-relaxed">
                            {message}
                        </p>

                        <div className="w-full mb-8">
                            <textarea
                                className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition min-h-[100px] text-gray-800 dark:text-gray-200"
                                placeholder={placeholder}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => onConfirm(value)}
                                disabled={isLoading || !value.trim()}
                                className="w-full py-4 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    confirmText
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="w-full py-4 rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-95"
                            >
                                {cancelText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

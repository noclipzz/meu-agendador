
import { AlertTriangle, Trash2, CheckCircle, Info, X, Loader2 } from "lucide-react";
import { ModalPortal } from "./ModalPortal";
import { useEffect, useState } from "react";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: 'danger' | 'info' | 'success';
}

export function ConfirmationModal({
    isOpen, onClose, onConfirm, title, message,
    confirmText = "Confirmar", cancelText = "Cancelar",
    isLoading = false,
    variant = 'danger'
}: ConfirmationModalProps) {
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsRendered(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isRendered) return null;

    const variantStyles = {
        danger: {
            icon: <Trash2 size={40} className="text-red-500" />,
            bgIcon: "bg-red-50 dark:bg-red-900/20",
            ring: "ring-red-50/50 dark:ring-red-900/10",
            button: "bg-red-600 hover:bg-red-700 shadow-red-500/20",
            title: "text-red-800 dark:text-red-200"
        },
        info: {
            icon: <Info size={40} className="text-blue-500" />,
            bgIcon: "bg-blue-50 dark:bg-blue-900/20",
            ring: "ring-blue-50/50 dark:ring-blue-900/10",
            button: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
            title: "text-blue-800 dark:text-blue-200"
        },
        success: {
            icon: <CheckCircle size={40} className="text-emerald-500" />,
            bgIcon: "bg-emerald-50 dark:bg-emerald-900/20",
            ring: "ring-emerald-50/50 dark:ring-emerald-900/10",
            button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
            title: "text-emerald-800 dark:text-emerald-200"
        }
    };

    const style = variantStyles[variant];

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

                        <div className={`w-24 h-24 ${style.bgIcon} rounded-full flex items-center justify-center mb-6 ring-[12px] ${style.ring} shadow-lg shadow-black/5`}>
                            {style.icon}
                        </div>

                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight leading-tight">
                            {title}
                        </h3>

                        <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-8 leading-relaxed max-w-[280px]">
                            {message}
                        </p>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${style.button} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
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

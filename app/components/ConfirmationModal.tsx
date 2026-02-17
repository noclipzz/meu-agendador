"use client";

import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'success' | 'info';
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = 'info',
    isLoading = false
}: ConfirmationModalProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible) return null;

    const variantStyles = {
        danger: {
            icon: <AlertTriangle size={32} className="text-red-500" />,
            bgIcon: "bg-red-50 dark:bg-red-900/20",
            button: "bg-red-500 hover:bg-red-600 shadow-red-500/20",
            text: "text-red-600"
        },
        success: {
            icon: <CheckCircle size={32} className="text-green-500" />,
            bgIcon: "bg-green-50 dark:bg-green-900/20",
            button: "bg-green-500 hover:bg-green-600 shadow-green-500/20",
            text: "text-green-600"
        },
        info: {
            icon: <Info size={32} className="text-blue-500" />,
            bgIcon: "bg-blue-50 dark:bg-blue-900/20",
            button: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
            text: "text-blue-600"
        }
    };

    const style = variantStyles[variant];

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? "bg-black/60 backdrop-blur-sm opacity-100" : "bg-black/0 opacity-0 pointer-events-none"}`}
            onClick={onClose}
        >
            <div
                className={`w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300 transform ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-8"}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 text-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${style.bgIcon} ring-8 ring-white dark:ring-gray-900 shadow-lg`}>
                        {style.icon}
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight leading-tight">
                        {title}
                    </h3>

                    {description && (
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-relaxed mb-8">
                            {description}
                        </p>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-4 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95 disabled:opacity-50 text-sm uppercase tracking-wide"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 py-4 px-6 text-white font-bold rounded-2xl transition active:scale-95 shadow-lg flex items-center justify-center gap-2 text-sm uppercase tracking-wide ${style.button} disabled:opacity-50`}
                        >
                            {isLoading ? "Processando..." : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

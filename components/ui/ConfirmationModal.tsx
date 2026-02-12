
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDeleting?: boolean;
}

export function ConfirmationModal({
    isOpen, onClose, onConfirm, title, message,
    confirmText = "Excluir Permanentemente", cancelText = "Cancelar",
    isDeleting = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl border dark:border-gray-800 scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50 dark:ring-red-900/10">
                        <Trash2 size={40} className="text-red-500" />
                    </div>

                    <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">{title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="w-full py-4 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 transition flex items-center justify-center gap-2 active:scale-95"
                        >
                            {confirmText}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition active:scale-95"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

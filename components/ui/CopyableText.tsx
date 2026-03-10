"use client";

import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

export function CopyableText({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="group flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md text-sm font-semibold"
            data-testid="copy-button"
        >
            <span className="truncate max-w-[150px] font-mono">{text}</span>
            {copied ? <CheckCircle2 size={14} className="text-emerald-500" data-testid="check-icon" /> : <Copy size={14} data-testid="copy-icon" />}
        </button>
    );
}

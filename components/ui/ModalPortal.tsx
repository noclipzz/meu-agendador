"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function ModalPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || typeof document === 'undefined') return null;
    const target = document.getElementById('modal-root') || document.body;
    return createPortal(children, target);
}

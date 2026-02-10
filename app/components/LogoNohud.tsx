import { LayoutDashboard } from "lucide-react";

export function LogoNohud({ className = "", light = false }: { className?: string, light?: boolean }) {

    // light = true -> Texto Branco (para fundos escuros)
    // light = false -> Texto Escuro (padrão)

    return (
        <div className={`flex items-center gap-2 select-none ${className}`}>
            <div className={`
                p-1.5 rounded-lg transition-transform hover:scale-105 duration-300
                ${light ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}
            `}>
                <LayoutDashboard size={22} strokeWidth={2.5} />
            </div>
            <span className={`text-xl font-black tracking-tighter leading-none ${light ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                NOHUD<span className="text-blue-500">.</span>
            </span>
        </div>
    )
}

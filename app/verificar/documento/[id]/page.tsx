import { db } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, ShieldCheck, FileText, User, Building2, Calendar } from "lucide-react";

export default async function VerificarDocumentoPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const entry = await db.formEntry.findUnique({
        where: { id },
        include: {
            client: { select: { name: true } },
            template: { select: { name: true } },
        }
    });

    if (!entry) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-md w-full text-center border-2 border-red-50">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle size={40} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-800 mb-2">Documento Inválido</h1>
                    <p className="text-gray-500 mb-6 font-medium">Este código de autenticação não foi encontrado em nossa base de dados ou o documento foi removido.</p>
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Código Consultaddo</p>
                        <p className="font-mono text-sm text-red-600 font-bold break-all">{id}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verificado pelo Sistema NoHud</p>
                </div>
            </div>
        );
    }

    // Pegar nome da empresa e responsável legal
    const company = await db.company.findUnique({
        where: { id: entry.companyId },
    }) as any;

    // Buscar o profissional que preencheu
    let professionalName = "Não identificado";
    if (entry.filledBy) {
        const pro = await db.professional.findFirst({
            where: { userId: entry.filledBy },
            select: { name: true }
        });
        if (pro) professionalName = pro.name;
        else if (company) {
            // Se não for profissional, é o dono/responsável legal
            professionalName = company.legalRepresentative || `Proprietário (${company.name})`;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-lg w-full border-2 border-teal-50 relative overflow-hidden">
                {/* Efeito de fundo */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-50 rounded-full blur-3xl opacity-50" />

                <div className="relative">
                    <div className="w-20 h-20 bg-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
                        <ShieldCheck size={44} className="text-teal-600" />
                    </div>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
                            <CheckCircle2 size={12} /> Autenticidade Confirmada
                        </div>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight leading-none mb-2">Documento Autêntico</h1>
                        <p className="text-gray-500 font-medium">As informações abaixo conferem com o registro original em nosso sistema.</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-start gap-4 hover:bg-white hover:border-teal-200 transition group">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-110 transition shrink-0">
                                <FileText size={20} className="text-gray-400 group-hover:text-teal-500" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Tipo de Documento</p>
                                <p className="font-bold text-gray-800">{entry.template.name}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-start gap-4 hover:bg-white hover:border-teal-200 transition group">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-110 transition shrink-0">
                                <User size={20} className="text-gray-400 group-hover:text-teal-500" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Emitido para (Cliente)</p>
                                <p className="font-bold text-gray-800">{entry.client.name}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:bg-white hover:border-teal-200 transition group">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <Calendar size={10} /> Data de Emissão
                                </p>
                                <p className="font-bold text-gray-800 text-sm">{format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:bg-white hover:border-teal-200 transition group">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <ShieldCheck size={10} /> Assinado por
                                </p>
                                <p className="font-bold text-gray-800 text-sm leading-tight">{professionalName}</p>
                            </div>
                        </div>

                        <div className="bg-teal-900 p-5 rounded-2xl border border-teal-800 flex items-start gap-4">
                            <div className="w-10 h-10 bg-teal-800 rounded-xl flex items-center justify-center shrink-0">
                                <Building2 size={20} className="text-teal-200" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-0.5">Empresa Responsável</p>
                                <p className="font-bold text-white leading-tight">{company?.corporateName || company?.name}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-2xl border border-gray-200 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hash de Autenticação</p>
                        <p className="font-mono text-[11px] text-gray-600 font-bold break-all">{id.toUpperCase()}</p>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-4 pt-6 border-t border-gray-100">
                        {company?.logoUrl && <img src={company.logoUrl} className="h-6 object-contain grayscale opacity-50" />}
                        <div className="h-4 w-[1px] bg-gray-200" />
                        <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase italic">Validado via NoHud Cloud</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

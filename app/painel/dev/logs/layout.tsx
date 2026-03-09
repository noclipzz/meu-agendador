import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DevLogsLayout({ children }: { children: React.ReactNode }) {
    const { userId } = await auth();

    if (userId !== "user_39S9qNrKwwgObMZffifdZyNKUKm") {
        redirect("/painel"); // Redireciona qualquer outro usuário de volta pro painel normal
    }

    return <>{children}</>;
}

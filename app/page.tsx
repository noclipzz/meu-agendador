import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      
      {/* Cabeçalho (Header) */}
      <header className="flex justify-between items-center p-6 border-b border-gray-100">
        <div className="text-2xl font-bold text-blue-600">AgendaFácil</div>
        <nav className="space-x-4">
          <button className="text-gray-600 hover:text-blue-600">Login</button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
            Criar Conta Grátis
          </button>
        </nav>
      </header>

      {/* Conteúdo Principal (Hero Section) */}
      <main className="flex flex-col items-center justify-center text-center mt-20 px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
          Agendamento online <br />
          <span className="text-blue-600">simplificado.</span>
        </h1>
        
        <p className="text-lg text-gray-600 max-w-2xl mb-10">
          O sistema perfeito para barbearias, clínicas, consultores e muito mais.
          Seus clientes agendam sozinhos e você ganha tempo.
        </p>

        <div className="flex gap-4">
          <Link href="/agendamento" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition">
            Quero Agendar (Demo)
          </Link>
          <button className="px-8 py-4 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">
            Sou Profissional
          </button>
        </div>
      </main>

      {/* Rodapé simples */}
      <footer className="absolute bottom-0 w-full text-center p-4 text-gray-400 text-sm">
        © 2024 AgendaFácil - Todos os direitos reservados.
      </footer>
    </div>
  );
}
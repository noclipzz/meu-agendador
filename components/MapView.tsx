interface MapViewProps {
    locations: any[];
}

export default function MapView({ locations = [] }: MapViewProps) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
            <p className="font-bold text-lg mb-2">Ambiente de Mapa (Debug)</p>
            <p className="text-sm uppercase tracking-widest font-black">
                Profissionais online detectados: {locations.length}
            </p>
            <div className="mt-4 space-y-1">
                {locations.length > 0 ? locations.map(l => (
                    <div key={l.id} className="text-[10px] bg-white dark:bg-gray-700 p-2 rounded-lg border dark:border-gray-600">
                        {l.professional?.name} - {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}
                    </div>
                )) : <p className="text-[10px]">Aguardando dados...</p>}
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

interface MapViewProps {
    locations: any[];
}

export default function MapView({ locations = [] }: MapViewProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Fix for default marker icons in Leaflet with Webpack/Next.js
        if (typeof window !== "undefined") {
            // @ts-ignore
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
        }
    }, []);

    if (!mounted) {
        return <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">Iniciando mapa...</div>;
    }

    // Defensive check to ensure we have an array
    const locs = Array.isArray(locations) ? locations : [];

    // Center map on the first active location or a default (Brazil center approx)
    const center: [number, number] = locs.length > 0
        ? [locs[0].latitude, locs[0].longitude]
        : [-15.7801, -47.9292];

    return (
        <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locs.map((loc) => (
                <Marker
                    key={loc.id}
                    position={[loc.latitude, loc.longitude]}
                >
                    <Popup>
                        <div className="p-1">
                            <p className="font-bold text-sm">{loc.professional?.name}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                                SINAL: {new Date(loc.lastUpdate).toLocaleTimeString()}
                            </p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet with Webpack/Next.js
// We use a check for window because Leaflet is client-side only
if (typeof window !== "undefined") {
    const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });

    L.Marker.prototype.options.icon = DefaultIcon;
}

interface MapViewProps {
    locations: any[];
}

export default function MapView({ locations = [] }: MapViewProps) {
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

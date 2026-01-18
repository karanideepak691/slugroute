'use client';

import { useState, useRef, useEffect } from 'react';
import { Route, Buddy, Trail } from '@/types';
import Map, { Source, Layer, Marker, Popup, MapRef, ViewStateChangeEvent } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
    routes: Route[];
    trails?: Trail[];
    selectedRouteId: string | null;
    windDirection: number;
    windSpeed: number;
    onMapClick?: (lat: number, lng: number) => void;
    customMarkers?: { start: [number, number] | null; end: [number, number] | null };
    buddies?: Buddy[];
    userLocation?: [number, number];
}

export default function MapComponent({ routes, trails = [], buddies = [], selectedRouteId, onMapClick, customMarkers, userLocation }: MapProps) {
    const mapRef = useRef<MapRef>(null);
    const [popupInfo, setPopupInfo] = useState<Trail | null>(null);

    // Initial View State
    const [viewState, setViewState] = useState({
        longitude: -122.0600,
        latitude: 36.9960,
        zoom: 13.5
    });

    // Update view when selectedRouteId changes
    useEffect(() => {
        if (selectedRouteId) {
            const route = routes.find(r => r.id === selectedRouteId);
            if (route && route.path.length > 0) {
                // Mapbox uses [lng, lat], our data is [lat, lng]
                const [lat, lng] = route.path[0];
                mapRef.current?.flyTo({
                    center: [lng, lat],
                    zoom: 15,
                    duration: 2000
                });
            }
        }
    }, [selectedRouteId, routes]);

    // Handle Map Click
    const handleMapClick = (event: mapboxgl.MapLayerMouseEvent) => {
        if (onMapClick) {
            const { lng, lat } = event.lngLat;
            onMapClick(lat, lng);
        }
        // Deselect popup if clicking elsewhere
        if (popupInfo) {
            setPopupInfo(null);
        }
    };

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
        return <div className="flex items-center justify-center h-full text-red-500 font-bold">Mapbox Token Missing</div>;
    }

    return (
        <div className="w-full h-full relative z-0">


            <Map
                ref={mapRef}
                {...viewState}
                onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/outdoors-v12"
                mapboxAccessToken={token}
                onClick={handleMapClick}
            >
                {/* Routes */}
                {routes.map(route => {
                    const isSelected = selectedRouteId === route.id || route.id === 'custom';
                    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: route.path.map(([lat, lng]) => [lng, lat]) // Flip to [lng, lat]
                        }
                    };

                    return (
                        <Source key={route.id} id={`route-${route.id}`} type="geojson" data={geojson}>
                            <Layer
                                id={`layer-${route.id}`}
                                type="line"
                                layout={{
                                    'line-join': 'round',
                                    'line-cap': 'round'
                                }}
                                paint={{
                                    'line-color': route.color,
                                    'line-width': isSelected ? 6 : 4,
                                    'line-opacity': isSelected ? 1 : 0.4
                                }}
                            />
                        </Source>
                    );
                })}

                {/* Start Marker */}
                {customMarkers?.start && (
                    <Marker longitude={customMarkers.start[1]} latitude={customMarkers.start[0]} anchor="bottom">
                        <div style={{ fontSize: '30px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>📍</div>
                    </Marker>
                )}

                {/* End Marker */}
                {customMarkers?.end && (
                    <Marker longitude={customMarkers.end[1]} latitude={customMarkers.end[0]} anchor="bottom">
                        <div style={{ fontSize: '30px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🏁</div>
                    </Marker>
                )}

                {/* Buddy Markers (Find My Style) */}
                {buddies.map(buddy => (
                    <Marker key={buddy.id} longitude={buddy.coords[1]} latitude={buddy.coords[0]} anchor="center">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg relative overflow-hidden bg-gray-200">
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-600 bg-gray-100 text-sm">
                                    {buddy.name.substring(0, 2).toUpperCase()}
                                </div>
                            </div>
                            <div className="mt-1 px-2 py-0.5 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold shadow-sm border border-gray-200 text-gray-700 whitespace-nowrap">
                                {buddy.name}
                            </div>
                        </div>
                    </Marker>
                ))}

                {/* Trail Markers */}
                {trails.map(trail => (
                    <Marker
                        key={trail.id}
                        longitude={trail.longitude}
                        latitude={trail.latitude}
                        anchor="bottom"
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            setPopupInfo(trail);
                        }}
                    >
                        <div style={{ fontSize: '30px', cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🌲</div>
                    </Marker>
                ))}

                {/* Popup */}
                {popupInfo && (
                    <Popup
                        anchor="top"
                        longitude={popupInfo.longitude}
                        latitude={popupInfo.latitude}
                        onClose={() => setPopupInfo(null)}
                        closeButton={false}
                        className="rounded-xl overflow-hidden"
                    >
                        <div className="p-1 max-w-[200px]">
                            <h3 className="font-bold text-sm mb-1">{popupInfo.name}</h3>
                            <div className="text-xs text-green-600 font-bold mb-1">
                                {popupInfo.difficulty} • {popupInfo.stars}★
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                {popupInfo.summary}
                            </p>
                        </div>
                    </Popup>
                )}
                {/* User Live Location Marker */}
                {userLocation && (
                    <Marker longitude={userLocation[1]} latitude={userLocation[0]} anchor="center">
                        <div className="relative flex items-center justify-center w-6 h-6">
                            <div className="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-ping"></div>
                            <div className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>
                        </div>
                    </Marker>
                )}
            </Map>
        </div>
    );
}

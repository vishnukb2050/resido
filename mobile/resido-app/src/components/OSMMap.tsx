import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface Marker {
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
}

interface OSMMapProps {
    region: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    markers?: Marker[];
    onPress?: (coordinate: { latitude: number, longitude: number }) => void;
    circle?: {
        center: { latitude: number, longitude: number };
        radius: number; // in meters
    };
    draggableMarker?: { latitude: number, longitude: number };
    onMarkerDragEnd?: (coordinate: { latitude: number, longitude: number }) => void;
    onRegionChangeComplete?: (region: { latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number }) => void;
    style?: any;
}

const OSMMap: React.FC<OSMMapProps> = ({ region, markers = [], onPress, circle, draggableMarker, onMarkerDragEnd, onRegionChangeComplete, style }) => {
    const webViewRef = useRef<WebView>(null);
    const lastRegionRef = useRef(region);
    const isLoaded = useRef(false);

    useEffect(() => {
        if (!isLoaded.current) return;
        
        // Update map view via JS to avoid full WebView reload
        if (
            region.latitude !== lastRegionRef.current.latitude ||
            region.longitude !== lastRegionRef.current.longitude
        ) {
            const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
            const js = `
                if (typeof map !== 'undefined') {
                    map.setView([${region.latitude}, ${region.longitude}], ${zoom});
                }
            `;
            webViewRef.current?.injectJavaScript(js);
            lastRegionRef.current = region;
        }
    }, [region.latitude, region.longitude, region.latitudeDelta]);

    useEffect(() => {
        if (!isLoaded.current) return;

        if (draggableMarker && webViewRef.current) {
            const js = `
                if (window.dragMarker) {
                    window.dragMarker.setLatLng([${draggableMarker.latitude}, ${draggableMarker.longitude}]);
                } else if (typeof map !== 'undefined') {
                    const redIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    window.dragMarker = L.marker([${draggableMarker.latitude}, ${draggableMarker.longitude}], {
                        draggable: true,
                        icon: redIcon
                    }).addTo(map);

                    window.dragMarker.on('dragend', function(event) {
                        const marker = event.target;
                        const position = marker.getLatLng();
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'onMarkerDragEnd',
                            coordinate: {
                                latitude: position.lat,
                                longitude: position.lng
                            }
                        }));
                    });
                }
            `;
            webViewRef.current.injectJavaScript(js);
        } else if (!draggableMarker && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                if (window.dragMarker) {
                    map.removeLayer(window.dragMarker);
                    window.dragMarker = null;
                }
            `);
        }
    }, [draggableMarker?.latitude, draggableMarker?.longitude]);

    useEffect(() => {
        if (!isLoaded.current) return;

        if (circle && webViewRef.current) {
            const js = `
                if (window.radiusCircle) {
                    window.radiusCircle.setLatLng([${circle.center.latitude}, ${circle.center.longitude}]);
                    window.radiusCircle.setRadius(${circle.radius});
                } else if (typeof map !== 'undefined') {
                    window.radiusCircle = L.circle([${circle.center.latitude}, ${circle.center.longitude}], {
                        color: '#6366f1',
                        fillColor: '#6366f1',
                        fillOpacity: 0.1,
                        radius: ${circle.radius}
                    }).addTo(map);
                }
            `;
            webViewRef.current.injectJavaScript(js);
        } else if (!circle && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                if (window.radiusCircle) {
                    map.removeLayer(window.radiusCircle);
                    window.radiusCircle = null;
                }
            `);
        }
    }, [circle?.center.latitude, circle?.center.longitude, circle?.radius]);

    useEffect(() => {
        if (!isLoaded.current) return;

        const js = `
            if (typeof map !== 'undefined') {
                if (window.staticMarkers) {
                    window.staticMarkers.forEach(m => map.removeLayer(m));
                }
                window.staticMarkers = [];
                ${markers.map(m => {
                    const title = (m.title || '').replace(/'/g, "\\'");
                    const desc = (m.description || '').replace(/'/g, "\\'");
                    return `
                        window.staticMarkers.push(
                            L.marker([${m.latitude}, ${m.longitude}])
                                .addTo(map)
                                .bindPopup('<b>${title}</b><br>${desc}')
                        );
                    `;
                }).join('')}
            }
        `;
        webViewRef.current?.injectJavaScript(js);
    }, [markers]);

    const html = React.useMemo(() => {
        const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=10.0, user-scalable=yes" />
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                    body { margin: 0; padding: 0; }
                    #map { height: 100vh; width: 100vw; background: #f0f0f0; }
                    .leaflet-control-attribution { display: none; }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <script>
                    const map = L.map('map', {
                        zoomControl: false,
                        pinchZoom: true,
                        touchZoom: true,
                        doubleClickZoom: true,
                        scrollWheelZoom: true
                    }).setView([${region.latitude}, ${region.longitude}], ${zoom});

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                    map.on('click', function(e) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'onPress',
                            coordinate: {
                                latitude: e.latlng.lat,
                                longitude: e.latlng.lng
                            }
                        }));
                    });

                    map.on('moveend', function() {
                        const center = map.getCenter();
                        const bounds = map.getBounds();
                        const latDelta = Math.abs(bounds.getNorth() - bounds.getSouth());
                        const lngDelta = Math.abs(bounds.getEast() - bounds.getWest());
                        
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'onRegionChangeComplete',
                            region: {
                                latitude: center.lat,
                                longitude: center.lng,
                                latitudeDelta: latDelta,
                                longitudeDelta: lngDelta
                            }
                        }));
                    });

                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'onLoad' }));
                </script>
            </body>
            </html>
        `;
    }, []); // Totally static HTML structure

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'onLoad') {
                isLoaded.current = true;
                // Force initial updates
                const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
                webViewRef.current?.injectJavaScript(`map.setView([${region.latitude}, ${region.longitude}], ${zoom});`);
            } else if (data.type === 'onPress' && onPress) {
                onPress(data.coordinate);
            } else if (data.type === 'onRegionChangeComplete' && onRegionChangeComplete) {
                onRegionChangeComplete(data.region);
            } else if (data.type === 'onMarkerDragEnd' && onMarkerDragEnd) {
                onMarkerDragEnd(data.coordinate);
            }
        } catch (e) {
            console.error('Error parsing WebView message', e);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html }}
                onMessage={handleMessage}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    webview: {
        flex: 1,
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default OSMMap;

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
    onRegionChangeComplete?: (region: { latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number }) => void;
    style?: any;
}

const OSMMap: React.FC<OSMMapProps> = ({ region, markers = [], onPress, circle, onRegionChangeComplete, style }) => {
    const webViewRef = useRef<WebView>(null);

    const getHtml = () => {
        const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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
                        zoomControl: false
                    }).setView([${region.latitude}, ${region.longitude}], ${zoom});

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                    ${circle ? `
                        L.circle([${circle.center.latitude}, ${circle.center.longitude}], {
                            color: '#6366f1',
                            fillColor: '#6366f1',
                            fillOpacity: 0.1,
                            radius: ${circle.radius}
                        }).addTo(map);
                    ` : ''}

                    ${markers.map(m => {
                        const title = (m.title || '').replace(/'/g, "\\'");
                        const desc = (m.description || '').replace(/'/g, "\\'");
                        return `
                            L.marker([${m.latitude}, ${m.longitude}])
                                .addTo(map)
                                .bindPopup('<b>${title}</b><br>${desc}');
                        `;
                    }).join('')}

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
                        const zoom = map.getZoom();
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

                    // Update markers/circle when props change would go here
                    // For now we just recreate the HTML on each render which is fine for simple use
                </script>
            </body>
            </html>
        `;
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'onPress' && onPress) {
                onPress(data.coordinate);
            } else if (data.type === 'onRegionChangeComplete' && onRegionChangeComplete) {
                onRegionChangeComplete(data.region);
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
                source={{ html: getHtml() }}
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

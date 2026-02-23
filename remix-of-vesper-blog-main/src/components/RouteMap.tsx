import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ShipmentDocument } from "@/services/shipmentService";

// Fix Leaflet default icon paths (broken by bundlers)
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pickupIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface RouteMapProps {
    /** The single shipment to display (selected route) */
    shipment: ShipmentDocument | null;
    height?: string;
}

export default function RouteMap({ shipment, height = "350px" }: RouteMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<L.LayerGroup | null>(null);

    // Initialize map once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        mapRef.current = L.map(containerRef.current, {
            center: [20.5937, 78.9629],
            zoom: 5,
            scrollWheelZoom: true,
            attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 18,
        }).addTo(mapRef.current);

        layerGroupRef.current = L.layerGroup().addTo(mapRef.current);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                layerGroupRef.current = null;
            }
        };
    }, []);

    // Update markers/polyline when selected shipment changes
    useEffect(() => {
        const map = mapRef.current;
        const layerGroup = layerGroupRef.current;
        if (!map || !layerGroup) return;

        // Clear previous layers
        layerGroup.clearLayers();

        if (!shipment || !shipment.pickupCoordinates || !shipment.deliveryCoordinates) {
            // Reset to India overview
            map.setView([20.5937, 78.9629], 5);
            return;
        }

        const pickup = shipment.pickupCoordinates;
        const delivery = shipment.deliveryCoordinates;

        // Pickup marker (green)
        const pickupMarker = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
            .bindPopup(
                `<strong>📍 Pickup</strong><br/>${shipment.pickupLocation || "Origin"}<br/><em>${shipment.cropName} · ${shipment.quantity} kg</em>`
            );
        layerGroup.addLayer(pickupMarker);

        // Delivery marker (red)
        const deliveryMarker = L.marker([delivery.lat, delivery.lng], { icon: deliveryIcon })
            .bindPopup(
                `<strong>📍 Delivery</strong><br/>${shipment.deliveryLocation || "Destination"}<br/>${shipment.distanceKm ? `~${shipment.distanceKm} km` : ""}`
            );
        layerGroup.addLayer(deliveryMarker);

        // Route polyline
        if (shipment.routePolyline && shipment.routePolyline.length > 0) {
            const latlngs: L.LatLngExpression[] = shipment.routePolyline.map(
                (pt) => [pt.lat, pt.lng] as L.LatLngExpression
            );
            const polyline = L.polyline(latlngs, {
                color: "#2d6a4f",
                weight: 4,
                opacity: 0.9,
                dashArray: "10 6",
            });
            layerGroup.addLayer(polyline);
        } else {
            // Straight dashed line fallback
            const fallbackLine = L.polyline(
                [
                    [pickup.lat, pickup.lng],
                    [delivery.lat, delivery.lng],
                ],
                { color: "#2d6a4f", weight: 3, dashArray: "8 5", opacity: 0.7 }
            );
            layerGroup.addLayer(fallbackLine);
        }

        // Fit map to show both markers with padding
        const bounds = L.latLngBounds(
            [pickup.lat, pickup.lng],
            [delivery.lat, delivery.lng]
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });

    }, [shipment]);

    return (
        <div
            ref={containerRef}
            style={{ height, width: "100%", borderRadius: "0.75rem", zIndex: 0 }}
        />
    );
}

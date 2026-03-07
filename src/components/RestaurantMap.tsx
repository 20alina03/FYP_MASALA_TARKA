import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor:  [12, 41]
});

L.Marker.prototype.options. icon = DefaultIcon;

interface RestaurantMapProps {
  restaurants: any[];
  userLocation: { lat: number; lng: number } | null;
  onRestaurantClick: (restaurant: any) => void;
}

const RestaurantMap = ({ restaurants, userLocation, onRestaurantClick }: RestaurantMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L. Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      const center:  [number, number] = userLocation 
        ? [userLocation.lat, userLocation.lng] 
        : [40.7128, -74.0060]; // Default to NYC

      mapInstanceRef.current = L.map(mapRef.current).setView(center, 13);

      // Add OpenStreetMap tiles (free!)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current. remove();
        mapInstanceRef. current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef. current.forEach(marker => marker. remove());
    markersRef.current = [];

    // Add user location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('<b>Your Location</b>');
      
      markersRef.current.push(userMarker);
    }

    // Add restaurant markers
    restaurants.forEach(restaurant => {
      if (! restaurant.latitude || !restaurant.longitude || !mapInstanceRef.current) return;

      const restaurantIcon = L. divIcon({
        className: 'restaurant-marker',
        html: '<div style="background-color: #E11D48; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow:  0 0 10px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([restaurant.latitude, restaurant.longitude], { icon: restaurantIcon })
        .addTo(mapInstanceRef. current);

      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${restaurant.name}</h3>
          <p style="margin: 0 0 4px 0; color: #666; font-size:  14px;">${restaurant.city}</p>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="color: #fbbf24; font-size: 18px;">★</span>
            <span style="margin-left: 4px; font-weight: 600;">${restaurant.rating?. toFixed(1) || '0.0'}</span>
            <span style="margin-left: 4px; color: #666;">(${restaurant.review_count || 0})</span>
          </div>
          ${restaurant.distance ?  `<p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">${restaurant.distance} km away</p>` : ''}
          <button 
            onclick="window.restaurantClickHandler('${restaurant._id}')"
            style="margin-top: 8px; padding: 6px 12px; background-color: #E11D48; color: white; border: none; border-radius:  4px; cursor: pointer; font-size: 14px; width: 100%;"
          >
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Store click handler
      marker.on('click', () => {
        onRestaurantClick(restaurant);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [restaurants, userLocation, onRestaurantClick]);

  // Global click handler for popup buttons
  useEffect(() => {
    (window as any).restaurantClickHandler = (restaurantId: string) => {
      const restaurant = restaurants.find(r => r._id === restaurantId);
      if (restaurant) {
        onRestaurantClick(restaurant);
      }
    };

    return () => {
      delete (window as any).restaurantClickHandler;
    };
  }, [restaurants, onRestaurantClick]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-[500px] rounded-lg border border-gray-200"
      style={{ minHeight: '500px' }}
    />
  );
};

export default RestaurantMap;
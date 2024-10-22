import React, { useEffect, useRef, useState } from 'react';
import { Map as OLMap, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Icon } from 'ol/style';
import Overlay from 'ol/Overlay';
import { ParkingSpot } from '../types';
import { getAddressFromCoordinates } from '../utils/api';
import { Parking, User } from 'lucide-react';

import 'ol/ol.css';

interface MapProps {
  parkingSpots: ParkingSpot[];
  userLocation: [number, number] | null;
}

const parkingIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>
</svg>
`;

const Map: React.FC<MapProps> = ({ parkingSpots, userLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<OLMap | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      const initialCenter = userLocation ? fromLonLat([userLocation[1], userLocation[0]]) : fromLonLat([2.3522, 48.8566]);

      mapInstanceRef.current = new OLMap({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM()
          })
        ],
        view: new View({
          center: initialCenter,
          zoom: 13
        })
      });

      mapInstanceRef.current.on('click', async (event) => {
        const feature = mapInstanceRef.current?.forEachFeatureAtPixel(event.pixel, (feature) => feature);
        if (feature) {
          const geometry = feature.getGeometry();
          if (geometry instanceof Point) {
            const coords = toLonLat(geometry.getCoordinates());
            const spot = parkingSpots.find(s => s.longitude === coords[0] && s.latitude === coords[1]);
            if (spot) {
              setSelectedSpot(spot);
              try {
                const address = await getAddressFromCoordinates(spot.latitude, spot.longitude);
                setSelectedAddress(address);
              } catch (error) {
                console.error('Error fetching address:', error);
                setSelectedAddress('Address not available');
              }
            }
          }
        } else {
          setSelectedSpot(null);
          setSelectedAddress(null);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [userLocation, parkingSpots]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      const vectorSource = new VectorSource();
      const vectorLayer = new VectorLayer({
        source: vectorSource
      });

      parkingSpots.forEach(spot => {
        const feature = new Feature({
          geometry: new Point(fromLonLat([spot.longitude, spot.latitude]))
        });

        feature.setStyle(new Style({
          image: new Icon({
            src: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(parkingIcon),
            scale: 1,
            color: '#4CAF50'
          })
        }));

        vectorSource.addFeature(feature);
      });

      if (userLocation) {
        const userFeature = new Feature({
          geometry: new Point(fromLonLat([userLocation[1], userLocation[0]]))
        });

        userFeature.setStyle(new Style({
          image: new Icon({
            src: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(User),
            scale: 1.5,
            color: 'blue'
          })
        }));

        vectorSource.addFeature(userFeature);
      }

      mapInstanceRef.current.addLayer(vectorLayer);

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(vectorLayer);
        }
      };
    }
  }, [parkingSpots, userLocation]);

  useEffect(() => {
    if (mapInstanceRef.current && popupRef.current) {
      const overlay = new Overlay({
        element: popupRef.current,
        positioning: 'bottom-center',
        stopEvent: false,
      });

      mapInstanceRef.current.addOverlay(overlay);

      if (selectedSpot) {
        overlay.setPosition(fromLonLat([selectedSpot.longitude, selectedSpot.latitude]));
      } else {
        overlay.setPosition(undefined);
      }
    }
  }, [selectedSpot]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div ref={popupRef} className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 bg-white p-2 rounded shadow-md">
        {selectedSpot && selectedAddress && (
          <div>
            <p>{selectedAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;
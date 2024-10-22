import { ParkingSpot } from '../types';

const STORAGE_KEY = 'parkingSpots';

export function saveParkingSpots(spots: ParkingSpot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
  window.dispatchEvent(new CustomEvent('parkingSpotsUpdated', { detail: spots }));
}

export function loadParkingSpots(): ParkingSpot[] {
  const spotsJson = localStorage.getItem(STORAGE_KEY);
  return spotsJson ? JSON.parse(spotsJson) : [];
}

export function subscribeToUpdates(callback: (spots: ParkingSpot[]) => void): () => void {
  const handler = (event: CustomEvent<ParkingSpot[]>) => callback(event.detail);
  window.addEventListener('parkingSpotsUpdated', handler as EventListener);
  return () => window.removeEventListener('parkingSpotsUpdated', handler as EventListener);
}
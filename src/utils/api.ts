import { ParkingSpot } from '../types';

export async function fetchParkingSpots(): Promise<ParkingSpot[]> {
  // This function will now return an empty array as we're not using mock data
  return [];
}

export async function addParkingSpot(spot: Omit<ParkingSpot, 'id'>): Promise<ParkingSpot> {
  // Simulate adding a spot with a random ID
  return { ...spot, id: Math.floor(Math.random() * 1000000) };
}

export async function updateParkingSpot(id: number, spot: Partial<ParkingSpot>): Promise<ParkingSpot> {
  // Simulate updating a spot
  return { ...spot, id } as ParkingSpot;
}

export async function getAddressFromCoordinates(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await response.json();
    return data.display_name || 'Address not found';
  } catch (error) {
    console.error('Error getting address:', error);
    throw new Error('Failed to get address');
  }
}
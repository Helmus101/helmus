import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import ParkingList from './components/ParkingList';
import AddSpotButton from './components/AddSpotButton';
import ReservationPage from './components/ReservationPage';
import RewardsPage from './components/RewardsPage';
import { ParkingSpot } from './types';
import { getDistance } from './utils/distance';
import { addParkingSpot, updateParkingSpot, getAddressFromCoordinates } from './utils/api';
import { saveParkingSpots, loadParkingSpots, subscribeToUpdates } from './utils/cloudSync';

function App() {
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [reservedSpot, setReservedSpot] = useState<ParkingSpot | null>(null);
  const [rewardsPoints, setRewardsPoints] = useState<number>(0);
  const [showRewards, setShowRewards] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.error("Error getting user location:", error);
        setError("Unable to get your location. Please enable location services and try again.");
      }
    );

    // Load initial parking spots
    const initialSpots = loadParkingSpots();
    setParkingSpots(initialSpots);
    setIsLoading(false);

    // Subscribe to updates
    const unsubscribe = subscribeToUpdates((updatedSpots) => {
      setParkingSpots(updatedSpots);
    });

    return () => unsubscribe();
  }, []);

  const handleAddSpot = async () => {
    if (userLocation) {
      try {
        const address = await getAddressFromCoordinates(userLocation[0], userLocation[1]);
        const newSpot = await addParkingSpot({
          latitude: userLocation[0],
          longitude: userLocation[1],
          available: true,
          address: address,
        });
        const updatedSpots = [...parkingSpots, newSpot];
        setParkingSpots(updatedSpots);
        setRewardsPoints(points => points + 1);
        saveParkingSpots(updatedSpots);
      } catch (error) {
        console.error("Error adding new spot:", error);
        setError("Unable to add a new parking spot. Please try again.");
      }
    } else {
      setError("User location is not available. Please enable location services and try again.");
    }
  };

  const handleReservation = async (id: number) => {
    const spot = parkingSpots.find(spot => spot.id === id);
    if (spot) {
      try {
        const updatedSpot = await updateParkingSpot(id, { ...spot, available: false });
        setReservedSpot(updatedSpot);
        const updatedSpots = parkingSpots.map(s => s.id === id ? updatedSpot : s);
        setParkingSpots(updatedSpots);
        saveParkingSpots(updatedSpots);
      } catch (error) {
        console.error("Error reserving spot:", error);
        setError("Unable to reserve the spot. Please try again.");
      }
    }
  };

  const handleUnreserve = async () => {
    if (reservedSpot) {
      try {
        const updatedSpot = await updateParkingSpot(reservedSpot.id, { ...reservedSpot, available: true });
        const updatedSpots = parkingSpots.map(s => s.id === reservedSpot.id ? updatedSpot : s);
        setParkingSpots(updatedSpots);
        setReservedSpot(null);
        saveParkingSpots(updatedSpots);
      } catch (error) {
        console.error("Error unreserving spot:", error);
        setError("Unable to unreserve the spot. Please try again.");
      }
    }
  };

  const handleMarkUnavailable = async (id: number) => {
    try {
      const spot = parkingSpots.find(s => s.id === id);
      if (spot) {
        const updatedSpot = await updateParkingSpot(id, { ...spot, available: false });
        const updatedSpots = parkingSpots.map(s => s.id === id ? updatedSpot : s);
        setParkingSpots(updatedSpots);
        setRewardsPoints(points => points + 1);
        saveParkingSpots(updatedSpots);
      }
    } catch (error) {
      console.error("Error marking spot as unavailable:", error);
      setError("Unable to mark the spot as unavailable. Please try again.");
    }
  };

  const availableSpots = parkingSpots.filter(spot => 
    spot.available && 
    userLocation && 
    getDistance(userLocation[0], userLocation[1], spot.latitude, spot.longitude) <= 10
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  if (showRewards) {
    return <RewardsPage points={rewardsPoints} onClose={() => setShowRewards(false)} />;
  }

  if (reservedSpot) {
    return (
      <ReservationPage
        spot={reservedSpot}
        userLocation={userLocation}
        onUnreserve={handleUnreserve}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Parking Spot Reservation</h1>
        <button 
          onClick={() => setShowRewards(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
        >
          Rewards ({rewardsPoints})
        </button>
      </header>
      <main className="flex-grow flex flex-col md:flex-row">
        <div className="w-full md:w-2/3 h-1/2 md:h-full relative">
          <Map parkingSpots={availableSpots} userLocation={userLocation} />
          <AddSpotButton onAddSpot={handleAddSpot} disabled={!userLocation} />
        </div>
        <div className="w-full md:w-1/3 h-1/2 md:h-full overflow-y-auto">
          <ParkingList 
            parkingSpots={availableSpots} 
            onReserve={handleReservation} 
            onMarkUnavailable={handleMarkUnavailable}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
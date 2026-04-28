export async function getCityFromCoords(lat: number, lon: number): Promise<string | null> {
  // Round to ~3 decimal places to reduce precision/privacy concerns when hitting external APIs
  const rLat = Math.round(lat * 1000) / 1000;
  const rLon = Math.round(lon * 1000) / 1000;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${rLat}&lon=${rLon}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CallMe-SolidHackathon-MVP/1.0',
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    // Nominatim returns city, town, village, or municipality
    const address = data.address;
    return address.city || address.town || address.village || address.municipality || null;
  } catch (e) {
    console.error("Nominatim geocoding failed", e);
    return null;
  }
}

export function getCurrentCoordinates(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  });
}

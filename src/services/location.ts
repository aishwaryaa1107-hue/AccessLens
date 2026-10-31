export interface Position { latitude: number; longitude: number; accuracy: number; }
export function locateUser(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available in this browser.'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(error.code === 1 ? 'Location permission was denied. You can enter coordinates manually.' : 'Could not get a GPS fix. Try again or enter coordinates manually.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

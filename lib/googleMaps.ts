// Singleton promise to ensure Maps loads only once
let loaderPromise: Promise<typeof google> | null = null;

/**
 * Load Google Maps JavaScript API
 * This function ensures the Maps API is loaded only once across the entire app
 * 
 * @returns Promise that resolves to the google object when Maps API is ready
 * @throws Error if API key is not configured
 */
export async function loadGoogleMaps(): Promise<typeof google> {
  // Return existing promise if Maps is already loading or loaded
  if (loaderPromise) {
    return loaderPromise;
  }

  // Check if already loaded
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    return Promise.resolve(google);
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured in environment variables');
  }

  // Create and store the loading promise
  loaderPromise = new Promise<typeof google>((resolve, reject) => {
    // Check again in case script was added between checks
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      resolve(google);
      return;
    }

    // Create a unique callback name
    const callbackName = `googleMapsCallback_${Date.now()}`;
    
    // Define the callback on window that Google Maps will call when ready
    (window as any)[callbackName] = () => {
      // Cleanup the callback
      delete (window as any)[callbackName];
      
      // Verify places library is available
      if (window.google?.maps?.places) {
        resolve(google);
      } else {
        loaderPromise = null;
        reject(new Error('Google Maps loaded but places library not available'));
      }
    };

    const script = document.createElement('script');
    // Use callback parameter - Google Maps will call this when fully loaded
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      // Cleanup callback on error
      delete (window as any)[callbackName];
      loaderPromise = null; // Reset on error so it can be retried
      reject(new Error('Failed to load Google Maps JavaScript API'));
    };
    
    document.head.appendChild(script);
  });
  
  return loaderPromise;
}

/**
 * Check if Google Maps is already loaded
 * Useful for conditional logic
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && 
         typeof google !== 'undefined' && 
         typeof google.maps !== 'undefined' &&
         typeof google.maps.places !== 'undefined';
}

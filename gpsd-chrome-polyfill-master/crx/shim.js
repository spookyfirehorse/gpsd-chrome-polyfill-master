// shim.js - Läuft in der MAIN world (direkter Zugriff auf navigator)
(function() {
    let currentFakeCoords = {
        latitude: 0,
        longitude: 0,
        accuracy: 10,
        altitude: null,
        speed: null,
        heading: null
    };

    // Höre auf das Event vom content_script.js
    window.addEventListener("GPSD_UPDATE_EVENT", (event) => {
        const data = event.detail.coords;
        currentFakeCoords = {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy || 20,
            altitude: data.altitude || null,
            speed: data.speed || null,
            heading: data.heading || null
        };
    });

    const wrapSuccess = (successCallback) => {
        return (pos) => {
            successCallback({
                coords: currentFakeCoords,
                timestamp: Date.now()
            });
        };
    };

    // 1. Geolocation API überschreiben
    navigator.geolocation.getCurrentPosition = (success, error, options) => {
        setTimeout(() => wrapSuccess(success)(), 10);
    };

    navigator.geolocation.watchPosition = (success, error, options) => {
        setInterval(() => wrapSuccess(success)(), 1000);
        return Math.floor(Math.random() * 10000);
    };

    // 2. Permissions API faken (WICHTIG für Browserleaks!)
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = (parameters) => {
        if (parameters && parameters.name === 'geolocation') {
            return Promise.resolve({
                state: 'granted',
                onchange: null
            });
        }
        return originalQuery(parameters);
    };

    console.log("GPSD Shield: API überschrieben & Permissions auf 'granted' gesetzt.");
})();

(function() {
    let lastPosition = null;
    let pendingRequests = [];

    // Empfange Daten vom Python-Proxy (via Content Script Brücke)
    window.addEventListener("GPSD_UPDATE_EVENT", (event) => {
        // Formatiere die Daten so, dass sie exakt dem W3C-Standard entsprechen
        lastPosition = {
            coords: {
                latitude: event.detail.coords.latitude,
                longitude: event.detail.coords.longitude,
                altitude: event.detail.coords.altitude || null,
                accuracy: event.detail.coords.accuracy || 10,
                altitudeAccuracy: event.detail.coords.altitudeAccuracy || null,
                heading: event.detail.coords.heading || null,
                speed: event.detail.coords.speed || null
            },
            timestamp: event.detail.timestamp || Date.now()
        };

        if (pendingRequests.length > 0) {
            console.log("Shim: Verarbeite geparkte Anfragen mit neuen Echtzeit-Daten.");
            while (pendingRequests.length > 0) {
                const request = pendingRequests.shift();
                request.success(lastPosition);
            }
        }
    });

    const geolocationShim = {
        getCurrentPosition: function(success, error, options) {
            if (lastPosition) {
                // Sofort senden, wenn Daten da sind
                success(lastPosition);
            } else {
                // Anfrage parken, falls der Proxy noch lädt
                console.log("Shim: Warte auf erste Daten vom Python-Proxy...");
                pendingRequests.push({ success, error });

                // Timeout nach 10 Sek
                setTimeout(() => {
                    const idx = pendingRequests.findIndex(r => r.success === success);
                    if (idx !== -1) {
                        pendingRequests.splice(idx, 1);
                        if (typeof error === 'function') {
                            error({ code: 3, message: "Python-Proxy antwortet nicht zeitgerecht." });
                        }
                    }
                }, 10000);
            }
        },

        watchPosition: function(success, error, options) {
            const id = Math.floor(Math.random() * 10000);

            // Falls schon Daten da sind, sofort einmal feuern
            if (lastPosition) {
                success(lastPosition);
            }

            // Bei jedem neuen Event vom Content-Script die success-Funktion aufrufen
            const updateHandler = (e) => {
                // Wir nutzen hier das global aktualisierte lastPosition Objekt
                if (lastPosition) success(lastPosition);
            };

                window.addEventListener("GPSD_UPDATE_EVENT", updateHandler);

                // Speichere den Handler irgendwo, falls clearWatch implementiert werden soll
                return id;
        },

        clearWatch: function(id) {
            console.log("Shim: Watch gestoppt für ID:", id);
        }
    };

    // Die echte Geolocation-API überschreiben
    Object.defineProperty(navigator, 'geolocation', {
        value: geolocationShim,
        configurable: true
    });

    console.log("Shim: Geolocation Polyfill erfolgreich injiziert.");
})();

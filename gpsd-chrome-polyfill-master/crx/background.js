async function updateGPS() {
    try {
        // Fragt den Python-Proxy auf deinem PC ab
        const response = await fetch("http://127.0.0.1:8888", { method: "POST" });
        const data = await response.json();

        if (data.location) {
            const gpsMessage = {
                type: "GPS_UPDATE",
                data: {
                    coords: {
                        latitude: data.location.lat,   // Echte Lat von Python
                        longitude: data.location.lng,  // Echte Lng von Python
                        accuracy: data.accuracy || 10,
                        altitude: null,
                        heading: null,
                        speed: null
                    },
                    timestamp: Date.now()
                }
            };

            // Sende die echten Daten an alle Tabs
            const tabs = await chrome.tabs.query({});
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, gpsMessage).catch(() => {});
            });

            console.log("GPS-Daten an Tabs gesendet:", data.location);
        }
    } catch (err) {
        console.error("Verbindung zum Python-Proxy fehlgeschlagen:", err);
    }
}

// Alle 2 Sekunden aktualisieren
setInterval(updateGPS, 2000);
// Einmal sofort beim Start ausführen
updateGPS();

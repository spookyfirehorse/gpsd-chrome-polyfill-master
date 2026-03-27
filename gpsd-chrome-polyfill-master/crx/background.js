let socket = null;
let lastGpsData = null;

function connectGPS() {
    // Falls ein alter Socket existiert, schließen
    if (socket) {
        try { socket.close(); } catch(e) {}
    }

    socket = new WebSocket("ws://127.0.0.1:9999");

    socket.onopen = () => {
        updateIconStatus(true);
        console.log("WebSocket verbunden");
    };

    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data?.location?.lat && data?.location?.lng) {
                lastGpsData = data;

                const gpsMessage = {
                    type: "GPS_UPDATE",
                    data: {
                        coords: {
                            latitude: data.location.lat,
                            longitude: data.location.lng,
                            accuracy: data.accuracy || 10,
                            timestamp: Date.now()
                        }
                    }
                };

                // An alle Tabs senden
                const tabs = await chrome.tabs.query({});
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, gpsMessage).catch(() => {});
                });
            }
        } catch (e) {
            console.error("JSON Error", e);
        }
    };

    socket.onclose = () => {
        updateIconStatus(false);
        // Nach 3 Sekunden neu versuchen
        setTimeout(connectGPS, 3000);
    };

    socket.onerror = () => {
        if (socket) socket.close();
    };
}

// Kommunikation mit dem Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_LAST_GPS") {
        sendResponse(lastGpsData);
    }
});

function updateIconStatus(success) {
    chrome.action.setBadgeBackgroundColor({ color: success ? "#4CAF50" : "#F44336" });
    chrome.action.setBadgeText({ text: success ? "ON" : "ERR" });
}

// Start
connectGPS();

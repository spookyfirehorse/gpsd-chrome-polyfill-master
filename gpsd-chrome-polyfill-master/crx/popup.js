// popup.js
function updateUI() {
    // Fragt die background.js nach den letzten Daten
    chrome.runtime.sendMessage({type: "GET_LAST_GPS"}, (response) => {
        if (chrome.runtime.lastError) {
            console.log("Fehler beim Abrufen:", chrome.runtime.lastError);
            return;
        }

        if (response && response.location) {
            document.getElementById('lat').textContent = response.location.lat.toFixed(6);
            document.getElementById('lng').textContent = response.location.lng.toFixed(6);
        } else {
            console.log("Noch keine GPS-Koordinaten im Speicher.");
        }
    });
}

// Alle 1 Sekunde aktualisieren
setInterval(updateUI, 1000);
updateUI();

// Der Button startet die ganze Extension neu
document.getElementById('refresh').addEventListener('click', () => {
    chrome.runtime.reload();
});

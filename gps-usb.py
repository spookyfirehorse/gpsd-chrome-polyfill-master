import socket
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

# Globaler Speicher für den letzten Fix
last_gps_data = {"error": "no data yet"}

def gpsd_worker():
    global last_gps_data
    while True:
        try:
            # Jetzt Verbindung zu LOCALHOST, da das USB-GPS lokal am Rechner hängt
            print("Verbinde zu lokalem GPSD (USB)...")
            with socket.create_connection(("127.0.0.1", 2947), timeout=10) as s:
                s.sendall(b'?WATCH={"enable":true,"json":true};\n')
                f = s.makefile()
                while True:
                    line = f.readline()
                    if not line: break
                    if '"class":"TPV"' in line:
                        tpv = json.loads(line)
                        if "lat" in tpv and "lon" in tpv:
                            last_gps_data = {
                                "location": {"lat": tpv["lat"], "lng": tpv["lon"]},
                                "accuracy": tpv.get("eph", 10.0),
                                "speed": tpv.get("speed", 0.0), # Geschwindigkeit mitnehmen
                                "heading": tpv.get("track", 0.0), # Richtung mitnehmen
                                "timestamp": tpv.get("time", time.time())
                            }
        except Exception as e:
            print(f"GPSD-USB-Fehler: {e}")
            last_gps_data = {"error": "connection lost"}
            time.sleep(5) 

class GPSHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args): return
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(last_gps_data).encode())

if __name__ == "__main__":
    threading.Thread(target=gpsd_worker, daemon=True).start()
    print("GPS-USB-Proxy aktiv auf http://127.0.0.1:8888")
    HTTPServer(('127.0.0.1', 8888), GPSHandler).serve_forever()

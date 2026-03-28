import asyncio
import json
import websockets
import time

# Konfiguration
GPSD_HOST = "10.0.0.32"
GPSD_PORT = 2947
LISTEN_HOST = "127.0.0.1"
LISTEN_PORT = 9999

connected_clients = set()

async def gpsd_reader():
    while True:
        try:
            print(f"Verbinde zu GPSD ({GPSD_HOST})...")
            reader, writer = await asyncio.open_connection(GPSD_HOST, GPSD_PORT)
            writer.write(b'?WATCH={"enable":true,"json":true};\n')
            await writer.drain()

            while True:
                line = await reader.readline()
                if not line: break
                data = line.decode().strip()
                if '"class":"TPV"' in data:
                    tpv = json.loads(data)
                    if "lat" in tpv and "lon" in tpv:
                        # GENAUIGKEIT: eph ist der horizontale Fehler
                        accuracy = max(1.0, float(tpv.get("eph", 10.0)))

                        # HÖHEN-FIX: altMSL (Meereshöhe) zuerst, um die ~44m Abweichung zu korrigieren
                        # altHAE ist nur der mathematische Fallback
                        altitude = tpv.get("altMSL") or tpv.get("altHAE") or tpv.get("alt") or 0

                        payload = json.dumps({
                            "location": {"lat": tpv["lat"], "lng": tpv["lon"]},
                            "accuracy": accuracy,
                            "altitude": altitude,
                            "altitudeAccuracy": max(1.0, float(tpv.get("epv", 5.0))),
                            "speed": tpv.get("speed", 0),
                            "heading": tpv.get("track", 0),
                            "timestamp": time.time()
                        })

                        if connected_clients:
                            # Daten an alle Browser-Extensions (Chromium/Firefox) pushen
                            await asyncio.gather(*[asyncio.create_task(client.send(payload)) for client in connected_clients], return_exceptions=True)
        except Exception as e:
            print(f"GPSD-Fehler: {e}. Neustart in 5s...")
            await asyncio.sleep(5)

async def ws_handler(websocket):
    connected_clients.add(websocket)
    print(f"Extension verbunden. Clients: {len(connected_clients)}")
    try:
        async for message in websocket:
            pass
    finally:
        connected_clients.discard(websocket)
        print(f"Extension getrennt. Clients: {len(connected_clients)}")

async def main():
    asyncio.create_task(gpsd_reader())
    print(f"WebSocket-Proxy aktiv auf ws://{LISTEN_HOST}:{LISTEN_PORT}")
    async with websockets.serve(ws_handler, LISTEN_HOST, LISTEN_PORT):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

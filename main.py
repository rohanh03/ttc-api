from fastapi import FastAPI
import requests
import xml.etree.ElementTree as ET
from datetime import datetime

app = FastAPI()

def get_eta_for_stop(stop_id):
    """
    Fetch real-time TTC predictions (ETAs) for a given stop using UMOIQ (NextBus) API.
    
    Args:
        stop_id (str or int): TTC stop ID (from ttc_stops.csv).
    
    Returns:
        List[dict]: List of dictionaries, each containing route, direction, arrival time, and vehicle info.
    """

    url = f"https://retro.umoiq.com/service/publicXMLFeed?command=predictions&a=ttc&stopId={stop_id}"

    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        return {"error": f"Error fetching data for stopId {stop_id}: {e}"}

    try:
        root = ET.fromstring(response.content)
    except ET.ParseError as e:
        return {"error": f"XML Parsing error for stopId {stop_id}: {e}"}

    eta_list = []

    for predictions_block in root.findall('.//predictions'):
        route_tag = predictions_block.attrib.get('routeTag') or "Unknown"
        stop_title = predictions_block.attrib.get('stopTitle')

    for direction in predictions_block.findall('.//direction'):
        direction_title = direction.attrib.get('title', 'Unknown Direction')

    
        for prediction in direction.findall('prediction'):
            try:
                minutes_str = prediction.attrib.get('minutes')
                seconds_str = prediction.attrib.get('seconds')
                epoch_str = prediction.attrib.get('epochTime')
                stop_title = predictions_block.attrib.get('stopTitle')

                minutes = int(minutes_str) if minutes_str and minutes_str.isdigit() else 0
                seconds = int(seconds_str) if seconds_str and seconds_str.isdigit() else 0
                epoch_time = int(epoch_str) if epoch_str and epoch_str.isdigit() else 0

                eta_entry = {
                    'routeTag': route_tag if route_tag else "Unknown",
                    'stopTitle': stop_title,
                    'vehicle': prediction.attrib.get('vehicle'),
                    'minutes': minutes,
                    'seconds': seconds,
                    'epochTime': epoch_time,
                    'isDeparture': prediction.attrib.get('isDeparture') == 'true',
                    'affectedByLayover': prediction.attrib.get('affectedByLayover') == 'true',
                    'tripTag': prediction.attrib.get('tripTag'),
                    'block': prediction.attrib.get('block'),
                    'dirTag': prediction.attrib.get('dirTag'),
                    'direction': direction_title,
                    'timestamp': datetime.fromtimestamp(epoch_time / 1000).strftime('%Y-%m-%d %H:%M:%S') if epoch_time else None
                }

                eta_list.append(eta_entry)

            except Exception as e:
                print(f"Failed to parse one of the prediction entries: {e}")

    return eta_list

@app.get("/")
def root():
    return {"message": "TTC ETA API is running"}

@app.get("/eta/{stop_id}")
def eta(stop_id: int):
    return get_eta_for_stop(stop_id)

@app.get("/route-stops/{route_tag}")
def get_route_stops(route_tag: str):
    url = f"https://retro.umoiq.com/service/publicXMLFeed?command=routeConfig&a=ttc&r={route_tag}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        root = ET.fromstring(response.content)

        stops = []
        for stop in root.findall('.//stop'):
            stop_id = stop.attrib.get("stopId")
            if stop_id:
                stops.append({
                    "title": stop.attrib.get("title"),
                    "stopId": stop_id
                })

        return stops
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/debug/test-route-tags")
def debug_test_route_tags():
    import time
    route_list_url = "https://retro.umoiq.com/service/publicXMLFeed?command=routeList&a=ttc"
    try:
        route_resp = requests.get(route_list_url)
        route_resp.raise_for_status()
        route_root = ET.fromstring(route_resp.content)
    except Exception as e:
        return {"error": f"Failed to fetch route list: {str(e)}"}

    route_tags = [r.attrib['tag'] for r in route_root.findall('.//route')]
    results = []

    for tag in route_tags[:10]:  # Test only first 10 routes for speed
        route_result = {"routeTag": tag, "status": "not found"}

        # Get route config to find a stopId
        config_url = f"https://retro.umoiq.com/service/publicXMLFeed?command=routeConfig&a=ttc&r={tag}"
        try:
            config_resp = requests.get(config_url)
            config_root = ET.fromstring(config_resp.content)
            stop_elements = config_root.findall('.//stop')
        except Exception as e:
            route_result["status"] = f"routeConfig failed: {str(e)}"
            results.append(route_result)
            continue

        if not stop_elements:
            route_result["status"] = "no stops found"
            results.append(route_result)
            continue

        stop_id = stop_elements[0].attrib.get("stopId")
        if not stop_id:
            route_result["status"] = "stopId missing"
            results.append(route_result)
            continue

        # Try predictions
        pred_url = f"https://retro.umoiq.com/service/publicXMLFeed?command=predictions&a=ttc&stopId={stop_id}"
        try:
            pred_resp = requests.get(pred_url)
            pred_root = ET.fromstring(pred_resp.content)
            predictions = pred_root.findall('.//prediction')
            found_tag = None
            for pred in predictions:
                rt = pred.attrib.get('routeTag')
                if rt:
                    found_tag = rt
                    break

            if found_tag:
                route_result["status"] = f"✅ routeTag found: {found_tag}"
            else:
                route_result["status"] = "❌ routeTag missing"
        except Exception as e:
            route_result["status"] = f"predictions failed: {str(e)}"

        results.append(route_result)
        time.sleep(0.25)  # small delay to avoid hammering server

    return {"tested": len(results), "results": results}


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
        route_tag = predictions_block.attrib.get('routeTag')
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
                    'routeTag': prediction.attrib.get('routeTag'),
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

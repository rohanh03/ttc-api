# main.py

from fastapi import FastAPI
import requests
import xml.etree.ElementTree as ET
from datetime import datetime

app = FastAPI()

def get_eta_for_stop(stop_id: int):
    url = f"https://retro.umoiq.com/service/publicXMLFeed?command=predictions&a=ttc&stopId={stop_id}"

    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        return {"error": f"Failed to fetch data: {str(e)}"}

    try:
        root = ET.fromstring(response.content)
    except ET.ParseError as e:
        return {"error": f"XML Parsing error: {str(e)}"}

    eta_list = []
    for direction in root.findall('.//direction'):
        direction_title = direction.attrib.get('title', 'Unknown Direction')
        for prediction in direction.findall('prediction'):
            try:
                minutes_str = prediction.attrib.get('minutes')
                epoch_str = prediction.attrib.get('epochTime')
                eta_list.append({
                    'routeTag': prediction.attrib.get('routeTag'),
                    'vehicle': prediction.attrib.get('vehicle'),
                    'minutes': int(minutes_str) if minutes_str is not None else None,
                    'direction': direction_title,
                    'timestamp': datetime.fromtimestamp(int(epoch_str)).isoformat() if epoch_str is not None else None
                })
            except Exception:
                continue

    return eta_list

@app.get("/")
def root():
    return {"message": "TTC ETA API is running"}

@app.get("/eta/{stop_id}")
def eta(stop_id: int):
    return get_eta_for_stop(stop_id)

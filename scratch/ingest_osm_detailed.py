import requests
import json
import time
import os

def fetch_all_places_by_district(district_name, state_name, retries=3):
    print(f"  - Fetching EVERY place in {district_name}, {state_name}...")
    overpass_url = "https://overpass.kumi.systems/api/interpreter"
    # No filter on place type, get every "place" node/way
    overpass_query = f"""
    [out:json][timeout:300];
    area["name"="{state_name}"]["admin_level"="4"]->.state;
    area["name"="{district_name}"]["admin_level"="5"](area.state)->.district;
    (
      node["place"](area.district);
      way["place"](area.district);
    );
    out center;
    """
    
    for attempt in range(retries):
        try:
            response = requests.post(overpass_url, data={'data': overpass_query}, timeout=350)
            if response.status_code == 200:
                data = response.json()
                results = []
                for element in data.get('elements', []):
                    tags = element.get('tags', {})
                    name = tags.get('name')
                    if not name: continue
                    lat = element.get('lat') or element.get('center', {}).get('lat')
                    lon = element.get('lon') or element.get('center', {}).get('lon')
                    if lat and lon:
                        results.append({
                            "placeName": name,
                            "pincode": tags.get('addr:postcode') or tags.get('postal_code') or '000000',
                            "district": district_name,
                            "state": state_name.upper(),
                            "latitude": lat,
                            "longitude": lon,
                            "type": tags.get('place')
                        })
                return results
            time.sleep(5)
        except:
            time.sleep(5)
    return []

kerala_districts = ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"]
tn_districts = ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Tirunelveli", "Kanchipuram", "Kanyakumari", "Thanjavur"]
karnataka_districts = ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Hubballi", "Dharwad", "Mangaluru", "Belagavi", "Kalaburagi"]

output_file = "/home/vishnu/socwhiz/resido/apps/auth-service/src/assets/osm_detailed_geo.json"
all_results = []

def save_data(results):
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

for d in kerala_districts:
    res = fetch_all_places_by_district(d, "Kerala")
    all_results.extend(res)
    save_data(all_results)
    time.sleep(1)

for d in tn_districts:
    res = fetch_all_places_by_district(d, "Tamil Nadu")
    all_results.extend(res)
    save_data(all_results)
    time.sleep(1)

for d in karnataka_districts:
    res = fetch_all_places_by_district(d, "Karnataka")
    all_results.extend(res)
    save_data(all_results)
    time.sleep(1)

print(f"✅ FINISHED: {len(all_results)} total points found.")

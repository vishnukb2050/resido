import requests
import json
import time
import os

def fetch_osm_places_by_district(district_name, state_name, retries=3):
    print(f"  - Fetching {district_name}, {state_name}...")
    overpass_url = "https://overpass.kumi.systems/api/interpreter"
    overpass_query = f"""
    [out:json][timeout:180];
    area["name"="{state_name}"]["admin_level"="4"]->.state;
    area["name"="{district_name}"]["admin_level"="5"](area.state)->.district;
    (
      node["place"~"suburb|neighbourhood|village|town|city"](area.district);
      way["place"~"suburb|neighbourhood|village|town|city"](area.district);
    );
    out center;
    """
    
    for attempt in range(retries):
        try:
            response = requests.post(overpass_url, data={'data': overpass_query}, timeout=200)
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
                            "pincode": tags.get('addr:postcode', '000000'),
                            "district": district_name,
                            "state": state_name.upper(),
                            "latitude": lat,
                            "longitude": lon
                        })
                return results
            elif response.status_code == 429: # Rate limit
                print(f"    ! Rate limited. Waiting 10s (Attempt {attempt+1}/{retries})...")
                time.sleep(10)
            else:
                print(f"    ! Error {response.status_code}. Retrying in 5s...")
                time.sleep(5)
        except Exception as e:
            print(f"    ! Attempt {attempt+1} failed: {e}")
            time.sleep(5)
    return []

kerala_districts = [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", 
    "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", 
    "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
]

tn_districts = [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", 
    "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Tirunelveli",
    "Kanchipuram", "Kanyakumari", "Thanjavur", "Virudhunagar", "Dindigul"
]

karnataka_districts = [
    "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Hubballi", "Dharwad",
    "Mangaluru", "Belagavi", "Kalaburagi", "Davanagere", "Ballari",
    "Vijayapura", "Shivamogga", "Tumakuru", "Udupi", "Hassan", "Kolar"
]

output_file = "/home/vishnu/socwhiz/resido/apps/auth-service/src/assets/osm_detailed_geo.json"
all_results = []

print("🚀 Starting Granular OSM Data Collection...")

for d in kerala_districts:
    all_results.extend(fetch_osm_places_by_district(d, "Kerala"))
    time.sleep(1)

for d in tn_districts:
    all_results.extend(fetch_osm_places_by_district(d, "Tamil Nadu"))
    time.sleep(1)

for d in karnataka_districts:
    all_results.extend(fetch_osm_places_by_district(d, "Karnataka"))
    time.sleep(1)

print(f"✅ Total OSM places collected: {len(all_results)}")

with open(output_file, 'w') as f:
    json.dump(all_results, f, indent=2)

print(f"📦 Saved to {output_file}")

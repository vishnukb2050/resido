# Resido Internal Geospatial Documentation

This document explains the architecture and data management for the internal geospatial search used in the Resido application.

## 🚀 Overview
To improve performance and eliminate reliance on third-party APIs (like Nominatim/Google Maps), Resido uses a dedicated internal geospatial database (`resido_geodata`) hosted on RDS.

## 📂 Data Sources
The system combines three data layers to provide comprehensive coverage for **Kerala, Tamil Nadu, and Karnataka**:

1.  **Base Layer (Pincodes)**:
    *   **Source**: India Post official directory.
    *   **Purpose**: Provides 100% accurate Pincode-to-District mapping for address forms.
    *   **File**: `src/assets/pincodes.json`

2.  **Regional Layer (Major Cities)**:
    *   **Source**: Curated high-precision city dataset.
    *   **Purpose**: Ensures fast jumps to major cities in South India with high accuracy.
    *   **File**: `src/assets/south_india_geo.json`

3.  **Granular Layer (OSM Detailed)**:
    *   **Source**: OpenStreetMap (OSM) via Overpass API.
    *   **Content**: **14,000+ points** including neighborhoods (suburbs), villages, and small localities (e.g., Vazhakkala, Aluva).
    *   **Purpose**: Powers the Map Search with high-resolution red-pin coordinates.
    *   **File**: `src/assets/osm_detailed_geo.json`

## 🔍 Search Ranking Logic
The `ProfileService` implements a tiered search algorithm to ensure the most useful results appear first:

1.  **Coordinate Priority (Highest)**: Places with Latitude/Longitude (OSM/Major Cities) are always pushed to the top.
2.  **Exact Match**: Results that exactly match the user's input.
3.  **Prefix Match**: Results starting with the search string.
4.  **Fallback**: Pincode-only results appear at the bottom for reference.

## 🔄 Automatic Ingestion
Ingestion happens automatically on server startup via `ProfileService.onModuleInit()`. 
*   It checks if data is already present.
*   It performs bulk inserts (batches of 5,000) for high performance.
*   **Total Records**: ~40,000 searchable locations.

## 🛠️ Management Commands

### Check Database Counts
```bash
docker run --rm -it postgres:15 psql "[GEO_READ_URL]" \
-c "SELECT state, COUNT(*) as total, COUNT(latitude) as with_coords FROM location_master GROUP BY state;"
```

### Search for a Specific Place
```bash
docker run --rm -it postgres:15 psql "[GEO_READ_URL]" \
-c "SELECT * FROM location_master WHERE \"placeName\" ILIKE '%SearchTerm%';"
```

### Force Re-sync
To force a full re-sync of the JSON assets into the database:
1.  Clear the `location_master` table.
2.  Restart the `auth-service` container.

## 📦 File Locations
*   **Service Logic**: `src/modules/profile/profile.service.ts`
*   **Data Assets**: `src/assets/*.json`
*   **Prisma Schema**: `prisma/geo/schema.prisma`

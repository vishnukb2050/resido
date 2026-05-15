#!/bin/bash

# Configuration - Change this to your server IP if not local
API_URL="${1:-http://localhost:3001}/clients"
USER_PHONE="9645859194"

echo "------------------------------------------------"
echo "RESIDO COMMUNITY SEEDING TOOL"
echo "Targeting: $API_URL"
echo "Target User: $USER_PHONE"
echo "------------------------------------------------"

# Community A (Cleaning Staff)
echo "Creating Community A..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Community A\",
    \"adminEmail\": \"admin_a@resido.com\",
    \"adminPhone\": \"1111111111\",
    \"cleaningPhones\": [\"$USER_PHONE\"]
  }" | grep -q "success" || echo "Failed to create Community A"

# Community B (Security Staff)
echo "Creating Community B..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Community B\",
    \"adminEmail\": \"admin_b@resido.com\",
    \"adminPhone\": \"2222222222\",
    \"securityPhones\": [\"$USER_PHONE\"]
  }" | grep -q "success" || echo "Failed to create Community B"

# Community C (Admin)
echo "Creating Community C..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Community C\",
    \"adminEmail\": \"admin_c@resido.com\",
    \"adminPhone\": \"$USER_PHONE\"
  }" | grep -q "success" || echo "Failed to create Community C"

echo -e "\n------------------------------------------------"
echo "Provisioning Complete!"
echo "User $USER_PHONE now has access to:"
echo "1. Community A (Role: CLEANING_STAFF)"
echo "2. Community B (Role: SECURITY_STAFF)"
echo "3. Community C (Role: APARTMENT_ADMIN)"
echo "------------------------------------------------"
echo "NOTE: Please restart your mobile app to see the new workspaces."

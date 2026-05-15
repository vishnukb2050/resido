#!/bin/bash

# Configuration
API_URL="http://localhost:3001/clients"
USER_PHONE="9645859194"

echo "Creating Demo Communities for user $USER_PHONE..."

# Community A (Cleaning Staff)
echo "Creating Community A..."
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Community A\",
    \"adminEmail\": \"admin_a@resido.com\",
    \"adminPhone\": \"1111111111\",
    \"cleaningPhones\": [\"$USER_PHONE\"]
  }"
echo -e "\n"

# Community B (Security Staff)
echo "Creating Community B..."
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Community B\",
    \"adminEmail\": \"admin_b@resido.com\",
    \"adminPhone\": \"2222222222\",
    \"securityPhones\": [\"$USER_PHONE\"]
  }"
echo -e "\n"

# Community C (Admin)
echo "Creating Community C..."
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Community C\",
    \"adminEmail\": \"admin_c@resido.com\",
    \"adminPhone\": \"$USER_PHONE\"
  }"
echo -e "\n"

echo "Done! User $USER_PHONE is now:"
echo "- Cleaning Staff at Community A"
echo "- Security Staff at Community B"
echo "- Admin at Community C"

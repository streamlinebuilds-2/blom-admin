# Easy variant addition script for Core Acrylics
curl -X POST "https://blom-admin.netlify.app/.netlify/functions/save-product" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "core-acrylics-product-id",
    "partial_update": true,
    "variants": [
      {
        "name": "Sweet Peach",
        "image": "https://res.cloudinary.com/dnlgohkcc/image/upload/v1763740353/peach-cuticile_pd063t.jpg"
      }
    ]
  }'
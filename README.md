# COSMOS Space Dashboard

Open `index.html` in the browser (or use VS Code Live Server).
Internet connection is required for the APIs.

## Structure
```
index.html
assets/
  css/style.css    (formatted)
  js/index.js      (NASA APOD + SpaceDevs Launches + Solar System OpenData)
  images/          (planets, favicon, placeholders)
```

## Config (top of assets/js/index.js)
- `NASA_API_KEY`: replace `DEMO_KEY` with your own key from https://api.nasa.gov
- `LAUNCHES_URL`, `PLANETS_URL`: API endpoints

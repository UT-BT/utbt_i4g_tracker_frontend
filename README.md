# Frontend (planned)

A lightweight viewer that shows BunnyTrack maps where i4G leaderboard records are faster than UTBT world records.

## Files

- `index.html` — root page
- `app.js` — React-compatible frontend logic
- `styles.css` — simple UI styling

## Usage

1. Run the scraper in the sibling repository `../i4g_utbt_recs` to generate `frontend/resources/data/unbeaten_i4g_records.csv`.
2. Serve this frontend repo with a local web server or publish it to GitHub Pages.
3. The app loads the CSV from `./resources/data/unbeaten_i4g_records.csv`.

If you use the GitHub Actions workflow from the main repo, it checks out this frontend repository under `frontend/`, generates updated `resources/data` files, commits those changes back to this repo, and deploys the static frontend.

### If browser fetch fails

Some browsers block `fetch()` on local `file://` pages. To avoid this, run a local web server and open the page via `http://`.

### Recommended local server setup

Serve this repository and open the page from `http://localhost:8000`.

- Python 3:
  ```bash
  python -m http.server 8000
  ```
  Then open `http://localhost:8000`.

- PowerShell on Windows:
  ```powershell
  python -m http.server 8000
  ```
  Then open `http://localhost:8000`.

The app loads CSV from `./resources/data/unbeaten_i4g_records.csv` when the generated data exists in `frontend/resources/data`.

For GitHub Pages, publish the static frontend and ensure the CSV is available at one of the expected paths.

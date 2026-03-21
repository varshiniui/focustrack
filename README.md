# FocusTrack

A Chrome extension that tracks time spent on websites, classifies activity as productive or unproductive, blocks distracting sites, and surfaces analytics through a full dashboard. 
---

## Overview

FocusTrack runs silently in the background while you browse. Every tab switch and page visit is timed and logged to a PostgreSQL database through a local Node.js server. The extension popup gives you a quick snapshot of your day, while the dashboard provides deeper weekly analytics and settings.

---

## Features

- Automatic time tracking across all websites
- Productive vs unproductive site classification
- Site blocker with a custom blocked page
- Daily productive time goal with progress tracking
- Full analytics dashboard with weekly bar chart and top sites table
- Per-user data isolation
- Auto-saves every 30 seconds, retries if server is unreachable

---

## Project Structure

```
task4/
├── .gitignore
├── README.md
├── server/
│   ├── server.js          REST API and PostgreSQL integration
│   ├── setup.sql          Database creation script
│   └── package.json
└── extension/
    ├── manifest.json      Chrome Manifest V3 configuration
    ├── background.js      Service worker — tracks active tab time
    ├── popup.html         Extension toolbar popup
    ├── popup.js           Popup data fetching and rendering
    ├── dashboard.html     Full analytics dashboard page
    ├── dashboard.js       Dashboard charts and settings logic
    ├── blocked.html       Page shown when visiting a blocked site
    ├── block_rules.json   Declarative net request placeholder
    └── icons/             Extension icons at 16, 48, and 128px
```

> Note: `chart.min.js` (Chart.js v4.4.0) is excluded from version control. Download it from `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js` and place it in the `extension/` folder before loading the extension.

---

## Prerequisites

- Google Chrome
- Node.js v16 or higher
- PostgreSQL installed and running

---

## Setup

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE focustrack;"
```

### 2. Configure the server

Open `server/server.js` and update the database password on line 14:

```js
password: process.env.PG_PASSWORD || "your_password_here",
```

### 3. Set your username

Open `extension/background.js` and set your name on line 2:

```js
const USER_ID = "your_name";
```

Also update the same value in `extension/popup.js` line 2 and `extension/dashboard.js` where the user ID is referenced.

### 4. Download Chart.js

Download the file from the URL below and save it as `chart.min.js` inside the `extension/` folder:

```
https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js
```

### 5. Start the server

```bash
cd server
npm install
npm start
```

The server runs at `http://localhost:3002`. On first start it automatically creates all required database tables and seeds default site categories.

### 6. Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable Developer Mode using the toggle in the top right
3. Click Load unpacked and select the `extension/` folder
4. The FocusTrack icon will appear in the Chrome toolbar

---

## Usage

Once the server is running and the extension is loaded, browsing happens automatically. The extension tracks every active tab in the background.

**Popup** — click the toolbar icon to see current tracking status, today's productive time against your goal, top sites, and a quick block input.

**Dashboard** — click Dashboard in the popup to open the full analytics page. It includes today's breakdown, a weekly chart, top sites table, goal settings, blocked sites management, and site category overrides.

**Blocking a site** — type a domain in the block input (e.g. `instagram.com`) and click Block. The next time that site is visited, the browser will redirect to the blocked page instead.

**Setting a goal** — go to Dashboard, open Settings, and enter your daily productive hours target. The popup and dashboard will track progress against it throughout the day.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/log` | Log time for a domain |
| GET | `/api/stats/today` | Today's stats for a user |
| GET | `/api/stats/weekly` | Last 7 days of stats |
| GET | `/api/blocked` | List blocked sites |
| POST | `/api/blocked` | Block a site |
| DELETE | `/api/blocked/:domain` | Unblock a site |
| GET | `/api/categories` | List site categories |
| POST | `/api/categories` | Override a site's category |
| POST | `/api/goal` | Set daily productive goal |

All endpoints accept an optional `user_id` query parameter to scope data per user.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Manifest V3, Vanilla JavaScript |
| Charts | Chart.js v4 |
| Backend | Node.js, Express |
| Database | PostgreSQL |

---

## Author

Built for CodTech Full Stack Internship Task 4.

---

## License

MIT
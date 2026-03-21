# FocusTrack — Chrome Extension for Time Tracking & Productivity Analytics

A Chrome extension that tracks time spent on websites, classifies them as productive or unproductive, blocks distracting sites, and shows detailed analytics — CodTech Full Stack Internship Task 4.

---

## ✨ Features

- ⏱️ **Automatic time tracking** — tracks every website you visit in real time
- 📊 **Productivity classification** — sites auto-classified as productive or unproductive
- 🚫 **Site blocker** — block distracting sites; shows a focused blocked page instead
- 🎯 **Daily goals** — set a daily productive time goal and track progress
- 📈 **Full dashboard** — today's stats, weekly bar chart, top sites table
- 💾 **PostgreSQL backend** — all data persisted to a database
- 🔔 **Popup widget** — quick stats right from the extension icon

---

## 🗂️ Project Structure

```
task4/
├── .gitignore
├── README.md
├── server/
│   ├── server.js        # Express REST API + PostgreSQL
│   ├── setup.sql        # Database setup script
│   └── package.json
└── extension/
    ├── manifest.json    # Chrome extension config (Manifest V3)
    ├── background.js    # Service worker — tracks active tab time
    ├── popup.html       # Extension popup UI
    ├── popup.js         # Popup logic
    ├── dashboard.html   # Full analytics dashboard page
    ├── dashboard.js     # Dashboard charts & data
    ├── blocked.html     # Shown when visiting a blocked site
    ├── block_rules.json # Declarative net request rules
    └── icons/           # Extension icons (16, 48, 128px)
```

---

## 🚀 Getting Started

### Prerequisites
- Google Chrome browser
- Node.js v16+
- PostgreSQL installed and running

### 1. Set up the database

```bash
psql -U postgres -f server/setup.sql
```

### 2. Configure your password

Open `server/server.js` line ~14 and set your PostgreSQL password:
```js
password: process.env.PG_PASSWORD || "your_password_here",
```

### 3. Set your username

Open `extension/background.js` line 4:
```js
const USER_ID = "your_name";
```

### 4. Start the server

```bash
cd server
npm install
npm start
```
Server runs at `http://localhost:3002`

### 5. Load the extension in Chrome

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. FocusTrack icon appears in your toolbar!

---

## 🧪 How to Test

- **Track time**: Browse any website — the extension tracks automatically
- **View popup**: Click the FocusTrack icon in the toolbar
- **Open dashboard**: Click "Dashboard →" in the popup
- **Block a site**: Type a domain in the popup or dashboard settings → Block
- **Set goal**: Go to Dashboard → Settings → set your daily productive hours
- **Custom categories**: Dashboard → Settings → override any site's category

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/log` | Log time for a domain |
| GET | `/api/stats/today` | Today's stats by user |
| GET | `/api/stats/weekly` | Last 7 days stats |
| GET | `/api/blocked` | Get blocked sites |
| POST | `/api/blocked` | Block a site |
| DELETE | `/api/blocked/:domain` | Unblock a site |
| GET | `/api/categories` | List site categories |
| POST | `/api/categories` | Set/override site category |
| POST | `/api/goal` | Set daily productive goal |

---

## 🛠️ Tech Stack

- **Extension**: Chrome Manifest V3, Vanilla JS
- **Charts**: Chart.js
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Fonts**: Sora (Google Fonts)

---

## 👩‍💻 Author

Built for **CodTech Full Stack Internship — Task 4**

---

## 📄 License

MIT
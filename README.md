# SolisCloud Internal API Scraper

A lightweight Node.js service that fetches real-time solar inverter and battery data from [SolisCloud](https://www.soliscloud.com) by calling the same internal API the web frontend uses. No browser automation, no official API activation required.

**[Leer en castellano](README.es.md)**

> **Author's note**: in my case, after several months "fighting" with Solis support, I finally got the official API enabled on my account. I managed to pull the whole history into Home Assistant, and then followed the instructions in [hn/ginlong-solis](https://github.com/hn/ginlong-solis) to get full local control and drop the manufacturer's cloud entirely.

> ## Why this scraper instead of the official API?
>
> Even if Solis has activated the official API on your account (like they eventually did on mine), this scraper is still the better option:
>
> - **No rate limits**: the official API has strict daily/second quotas. This scraper uses the same internal endpoints as the web portal, with no artificial quotas — polling every few minutes is fine.
> - **Richer data**: endpoints like `/api/inverter/detail` expose the full telemetry (complete BMS data, per-string PV, grid import/export with direction) that the official API does not provide or limits heavily.
> - **No dependency on Solis support**: no tickets, no waiting, no risk of them revoking or changing the API terms.
>
> **Fair warning**: this scraper depends on the SolisCloud web portal as it exists today. If Solis changes the website or its internal endpoints in the future (they already did a major rewrite in July 2026), the scraper may need an update. The good news: since it talks to the same backend the web UI uses, any fix is usually small. Issues and PRs are welcome if that day comes.

## The Problem

SolisCloud has an official monitoring API, but accessing it requires submitting a support ticket and waiting for Solis to manually activate it (setting `apiSwitch` and `apiShowSwitch` flags on your account). Many users wait weeks or months stuck on "Nonactivated".

## The Solution

This scraper calls the SolisCloud internal API endpoints directly via HTTP, using the same HMAC-SHA1 authentication the web frontend uses. The auth mechanism was reverse-engineered from the frontend JavaScript.

- **~43 MB RAM** (Node.js only)
- **~1 second** per scrape cycle
- **~1,200 HTTP requests/day** (5 API calls per cycle, every 6 minutes)
- **No browser dependency** - runs on any system with Node.js
- **Includes battery data** (SoC, power, voltage, direction)

## Tested Setup

This was developed and tested with:
- **Inverter**: Solis S5-EH1P6K-L (also known as RHI-6K-48ES-5G), hybrid single-phase with battery
- **Battery**: Soluna 5.12 kWh (SN: 1031052248080003BAT01)
- **WiFi Logger**: Solis S2-WL-ST (firmware `00010154`)
- **Station capacity**: 4.4 kWp
- **SolisCloud account type**: End user (not installer)

It should work with any SolisCloud account that can log in to the web portal, regardless of inverter model or whether the official API is activated.

## How the Authentication Works

### Overview

Every request to the SolisCloud internal API requires:
1. A session cookie (`token=token_<uuid>`) obtained from the login endpoint
2. An HMAC-SHA1 signature in the `Authorization` header
3. A Content-MD5 header with the Base64-encoded MD5 hash of the request body

### Step 1: Login

```
POST https://www.soliscloud.com/api/user/login2
```

The password is sent as its MD5 hex digest:

```json
{
  "userInfo": "your@email.com",
  "passWord": "<MD5 hex of your password>",
  "yingZhenType": 1,
  "localTime": 1783848004976,
  "localTimeZone": 2,
  "language": "2"
}
```

The response sets a `token=token_<uuid>` cookie and an `acw_tc` cookie. Both must be sent with subsequent requests.

### Step 2: Sign Each Request

The `Authorization` header has the format:

```
Authorization: WEB 2424:<base64-encoded HMAC-SHA1 signature>
```

The HMAC-SHA1 is computed over this string:

```
POST\n<Content-MD5>\napplication/json\n<Date-UTC>\n<path-without-api-prefix>
```

With these components:
- **HMAC key**: `5704383536604a8bb94c83ebc059aa8c` (hardcoded in the frontend JS)
- **Content-MD5**: `Base64(MD5(request_body_string))`
- **Date-UTC**: HTTP date format, e.g. `Sun, 12 Jul 2026 09:20:04 GMT`
- **Path**: The API path **with the `/api` prefix stripped**. Example: for `POST /api/station/list`, sign with `/station/list`

> **Critical**: The signing path must NOT include `/api`. Some endpoints (like `login2` and `distributor/detail`) are tolerant and accept signatures with or without the prefix. But `station/list` and `station/detailMix` return `403 Forbidden - wrong sign` if you include `/api` in the signature.

### Required Headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json;charset=UTF-8` |
| `Content-MD5` | Base64-encoded MD5 of the request body |
| `Authorization` | `WEB 2424:<HMAC-SHA1 signature>` |
| `Time` | UTC date string |
| `Language` | `2` (English) |
| `X-Cloud-Platform` | `GLY` |
| `Version` | `5.3.001` |
| `Platform` | `Web` |
| `Cookie` | `token=token_<uuid>; acw_tc=<value>` |

### How the HMAC Secret Was Extracted

The secret is embedded in the SolisCloud frontend JavaScript bundle (`index-CqvhMJaa.js` as of July 2026). It's stored as an array of three Base64-encoded strings that are concatenated at runtime:

```javascript
// From the minified frontend JS:
const mK = ["NTcwNDM4MzUzNjYw", "NGE4YmI5NGM4M2Vi", "YzA1OWFhOGM="];

function hK() {
  try {
    return mK.map(e => atob(e)).join("");
  } catch {
    return "";
  }
}
```

Decoding each part:
```
atob("NTcwNDM4MzUzNjYw") = "5704383536604"
atob("NGE4YmI5NGM4M2Vi") = "4a8bb94c83eb"
atob("YzA1OWFhOGM=")     = "c059aa8c"
```

Concatenated: `5704383536604a8bb94c83ebc059aa8c`

The signing function in the frontend:

```javascript
function yK({contentMd5Result: e, date: t, url: n, method: r}) {
  const a = vK(); // returns the secret above
  return "WEB 2424:" + EK(a, r.toUpperCase() + "\n" + e + "\napplication/json\n" + t + "\n" + n);
}
// EK() computes HMAC-SHA1 and returns Base64
```

The key ID `2424` is a fixed constant embedded in the same function.

### Verification

To verify the signing works, you can compute it manually:

```javascript
const crypto = require("crypto");

const secret = "5704383536604a8bb94c83ebc059aa8c";
const body = JSON.stringify({localTime: Date.now(), localTimeZone: 2, language: "2"});
const contentMd5 = crypto.createHash("md5").update(body, "utf8").digest("base64");
const date = new Date().toUTCString();
const path = "/distributor/detail"; // WITHOUT /api

const signString = "POST\n" + contentMd5 + "\napplication/json\n" + date + "\n" + path;
const signature = crypto.createHmac("sha1", secret).update(signString, "utf8").digest("base64");

console.log("Authorization: WEB 2424:" + signature);
```

## API Endpoints Reference

### `/api/user/login2` (POST)

Authenticates the user. Returns user profile and sets session cookies.

**Request body:**
```json
{
  "userInfo": "your@email.com",
  "passWord": "<MD5 hex of password>",
  "yingZhenType": 1,
  "localTime": 1783848004976,
  "localTimeZone": 2,
  "language": "2"
}
```

### `/api/distributor/detail` (POST)

Returns aggregated account-level data.

**Request body:**
```json
{
  "localTime": 1783848005368,
  "localTimeZone": 2,
  "language": "2"
}
```

**Key response fields:**
| Field | Description | Example |
|---|---|---|
| `power` | Current generation | `1.516` |
| `powerStr` | Unit | `"kW"` |
| `energyToday` | Energy generated today | `3.4` |
| `monthEnergy` | Energy this month | `243.3` |
| `yearEnergy` | Energy this year | `2.892` |
| `energyTotal` | Total energy all-time | `5.909` |
| `batteryChargeTodayEnergy` | Battery charged today | `2` |
| `batteryDischargeTodayEnergy` | Battery discharged today | `1` |
| `gridPurchasedTodayEnergy` | Grid import today | `6.27` |
| `gridSellTodayEnergy` | Grid export today | `0.11` |
| `homeLoadTodayEnergy` | Home consumption today | `7.46` |
| `incomeToday` / `incomeMonth` / `incomeTotal` | Income stats | `0.51` / `36.51` / `886.35` |
| `capacity` | Station capacity | `4.4` |

### `/api/station/list` (POST)

Returns the list of stations (plants). Used to discover the station ID needed for `detailMix`.

**Request body:**
```json
{
  "pageNo": 1,
  "pageSize": 10,
  "states": "0",
  "stationType": "1",
  "selectAreaValue": [],
  "dataNumber": 0,
  "localTime": 1783848005449,
  "localTimeZone": 2,
  "language": "2"
}
```

**Key response fields** (in `data.page.records[0]`):
| Field | Description | Example |
|---|---|---|
| `id` | Station ID (needed for detailMix) | `"1298491919450219817"` |
| `stationName` | Station name | `"Mandor 40"` |
| `state` | 1 = normal | `1` |
| `power` | Current power | `0.798` |
| `dayEnergy` | Today's energy | `3.4` |
| `dataTimestampStr` | Last data timestamp | `"12/07/2026 11:04:31 (UTC+01:00)"` |
| `inverterCount` / `inverterOnlineCount` | Inverter status | `1` / `1` |

### `/api/station/detailMix` (POST)

Returns detailed real-time data for a specific station. This is the most valuable endpoint as it includes **battery data** not available elsewhere.

**Request body:**
```json
{
  "id": "<station_id from station/list>",
  "localTime": 1783847743820,
  "localTimeZone": 2,
  "language": "2"
}
```

**Key response fields:**
| Field | Description | Example |
|---|---|---|
| `batteryPercent` | Battery State of Charge (%) | `30` |
| `batteryPower` | Battery power in kW (negative = discharging) | `-1.509` |
| `batteryPowerStr` | Unit | `"kW"` |
| `batteryDirection` | 1 = charging, 2 = discharging | `1` |
| `storageBatteryVoltage` | Battery voltage | `51.5` |
| `inverterBatteryCapacity` | Total battery capacity | `5.12` |
| `inverterBatteryCapacityStr` | Unit | `"kWh"` |
| `batteryCount` | Number of batteries | `1` |
| `batteryChargeEnergy` | Today's charge energy | `2` |
| `batteryDischargeEnergy` | Today's discharge energy | `0` |
| `familyLoadPower` | Current house consumption | (available) |
| `gridPower` | Current grid power | null on S5-EH1P6K-L — see `/api/inverter/detail` |
| `gridDirection` | Grid flow direction | null on S5-EH1P6K-L — see `/api/inverter/detail` |
| `power` | Current solar power | `0.798` |
| `dayEnergyStorage` | Today's total yield | `3.4` |

### `/api/inverter/detail` (POST)

Returns the **full inverter telemetry**, much richer than `detailMix`. This is where the **instantaneous grid power** actually lives (in `detailMix` the `gridPower`/`gridDirection` fields are `null`, at least on the S5-EH1P6K-L).

**Request body:**
```json
{
  "sn": "<inverter serial number>"
}
```

**Key response fields:**
| Field | Description | Example |
|---|---|---|
| `gridDetailVo.gridPower` | **Instantaneous grid power (kW, magnitude)** | `0` |
| `gridDetailVo.gridVoltageA` / `gridCurrentA` | Grid voltage/current per phase | `234.9` / `2.6` |
| `industryCurrentFlowMapV2` | Flow direction flags: `pvToLoad`, `pvToBattery`, `pvToGrid`, `gridToLoad`, `batteryToLoad`, `batteryToGrid` (0/1) | `{"pvToLoad":1,...}` |
| `gridPurchasedTodayEnergy` | Today's grid import | `4.86` |
| `gridSellTodayEnergy` | Today's grid export | `0.04` |
| `familyLoadPower` | House load (normal circuits) | `0` |
| `bypassLoadPower` | Backup/bypass load | `0.435` |
| `totalLoadPower` | Total load = family + bypass | `0.435` |
| `batteryPowerBms` / `batteryCapacitySoc` / `batteryHealthSoh` | BMS data | `1.482` / `50` / `98` |
| `batteryChargingCurrent` / `batteryDischargeLimiting` | BMS current limits (A) | `75` / `33.3` |
| `energyStorageControl` / `socDischargeSet` / `socChargingSet` | Inverter settings | `"21"` / `20` / `10` |

The scraper uses this endpoint to populate `currentGridPower` (magnitude, kW) and `gridDirection` in `/v2/data`. `gridDirection` is derived from `industryCurrentFlowMapV2` (`gridToLoad` → `"import"`, `pvToGrid`/`batteryToGrid` → `"export"`, otherwise `"none"`) so it does not depend on Solis' sign convention for `gridPower`.

### Other Endpoints (not used by scraper, but discovered)

| Endpoint | Description |
|---|---|
| `/api/user/find` | User profile (includes `apiSwitch`, `apiShowSwitch` flags) |
| `/api/chart/station/day/v2` | Daily charts with `batteryCapacitySocList` (SoC history) |
| `/api/seng/chart` | Detailed time-series: `realSoc`, `batteryPower`, `gridPower`, `familyLoadPower` |
| `/api/seng/incomeChart` | Income charts |
| `/api/inverter/listV2` | Inverter list |
| `/api/station/getDetailSample` | Station sample data |
| `/api/alarm/alarmReadAll` | Alarm status |
| `/api/weather/get7DayForecast` | Weather forecast for the station location |
| `/api/station/stationAllEnergy` | All energy statistics |

## Installation

Pick **ONE** of these options. The only prerequisite is a SolisCloud account that can log in at <https://www.soliscloud.com> (the same one you use in the SolisCloud app).

---

### Option A — Home Assistant OS Add-on (easiest, 5 minutes)

If your Home Assistant runs as HAOS (Home Assistant Green/Yellow, a VM, a Raspberry Pi image...), this is the recommended way: the scraper runs **inside** Home Assistant itself.

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**.
2. Click the **⋮ menu (top right) → Repositories**.
3. Paste `https://github.com/gnacho/soliscloud-scraper` and click **Add**, then **Close**.
4. The **SolisCloud Scraper** card appears in the store. Click it → **Install**.
5. Open the **Configuration** tab and fill in:
   - `solis_username`: your SolisCloud email
   - `solis_password`: your SolisCloud password
   - `service_username` / `service_password`: invent any user/password pair — this protects the local API. You will need it again in the Home Assistant step below.
   - `service_port`: leave `5561`.
6. **Start** the add-on (optionally enable *Start on boot* and *Watchdog*).
7. Check the **Log** tab: you should see `Login OK` and `Scrape OK`.

Test it: open `http://homeassistant.local:5561/v2/data` in your browser — it will ask for the `service_username`/`service_password` you just invented.

Then continue with **Home Assistant Integration** below.

---

### Option B — Docker (any server, 5 minutes)

For any machine with Docker (NAS, Raspberry Pi, home server...):

```bash
git clone https://github.com/gnacho/soliscloud-scraper.git
cd soliscloud-scraper
cp scraper.properties.example scraper.properties
nano scraper.properties   # fill in your SolisCloud + local API credentials
docker compose up -d --build
```

Check the logs: `docker logs -f soliscloud-scraper` — you should see `Login OK` and `Scrape OK`.

Test: `curl -u localuser:localpass http://localhost:5561/v2/data`

Plain `docker run` (no compose) also works:

```bash
docker build -t soliscloud-scraper .
docker run -d --name soliscloud-scraper --restart unless-stopped \
  -p 5561:5561 -v "$PWD/scraper.properties:/app/scraper.properties:ro" \
  soliscloud-scraper
```

---

### Option C — Bare metal (Node.js, no container)

**Requirements:** Node.js 18+ (tested with Node.js 22).

```bash
git clone https://github.com/gnacho/soliscloud-scraper.git
cd soliscloud-scraper
npm install
cp scraper.properties.example scraper.properties
nano scraper.properties   # your credentials
node scraper.js
```

You should see:

```
Solis Cloud API scraper (no browser) listening on port 5561
Login OK - user: your@email.com
Discovered station ID: 1234567890123456789
Scrape OK - distributor: yes station: yes detailMix: yes batterySoc: 85 duration: 943ms
```

To keep it running after reboots, create `/etc/systemd/system/solis-scraper.service`:

```ini
[Unit]
Description=SolisCloud Scraper
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/soliscloud-scraper
ExecStart=/usr/bin/node scraper.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable solis-scraper
systemctl start solis-scraper
journalctl -u solis-scraper -f
```

---

## Home Assistant Integration

The easiest way is the ready-made **package file**: [`homeassistant/soliscloud-scraper.yaml`](homeassistant/soliscloud-scraper.yaml).

1. Make sure your `configuration.yaml` contains (add it if missing):

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

2. Copy `homeassistant/soliscloud-scraper.yaml` into your `/config/packages/` folder (create the folder if it does not exist).
3. Edit the 3 values marked `<-- CHANGE` inside the file (scraper address + local API credentials):
   - **HAOS add-on** with default port: the address is already correct (`http://homeassistant.local:5561/v2/data`).
   - Scraper on **another machine**: use `http://<that-machine-ip>:5561/v2/data`.
4. **Restart Home Assistant** (Settings → System → Restart).

You will get these entities:

| Entity | Meaning |
|---|---|
| `sensor.solis_battery_soc` | Battery charge (%) |
| `sensor.solis_solar_power` | Solar production now (kW) |
| `sensor.solis_battery_power` | Battery power (kW, + charging / − discharging) |
| `sensor.solis_grid_power` | Grid power (kW, + importing / − exporting) |
| `sensor.solis_yield_today` | Solar energy today (kWh) |
| `sensor.solis_grid_import_today` | Grid import today (kWh) |
| `sensor.solis_grid_export_today` | Grid export today (kWh) |
| `sensor.solis_house_consumption` | House consumption now (kW) |

The daily kWh sensors use `state_class: total_increasing`, so you can add them directly to the **Energy Dashboard** (Settings → Dashboards → Energy).

## Local API Endpoints

All endpoints require Basic Auth.

| Endpoint | Description |
|---|---|
| `GET /v2/data` | Normalized data with all fields (recommended) |
| `GET /data` | Raw captured data (distributor + station + detailMix objects) |
| `GET /v1/data` | Same as `/data` |
| `GET /refresh` | Trigger an immediate refresh cycle |

## About the Official API

The official SolisCloud API exists and is documented ([PDF](https://solis-service.solisinverters.com/en/support/solutions/articles/44002212561-request-api-access-soliscloud)), but requires manual activation by Solis support. To request access:

1. Go to https://solis-service.solisinverters.com/en/support/tickets/new
2. Select **"API Access Request"**
3. Provide your SolisCloud email address
4. Wait for Solis to process the request

Once activated, the API management page appears at `https://www.soliscloud.com/service/apiManagement` where you can generate API keys.

The user profile flags that control this:
- `apiSwitch: 0/1` - Whether the API is enabled
- `apiShowSwitch: 0/1` - Whether the API management menu is visible
- `userFunctions` must include `A0507`

This scraper does not need the official API to be activated. It uses the same internal API the web frontend uses.

## Disclaimer

This project reverse-engineers the internal API of SolisCloud for personal, non-commercial monitoring use. The API endpoints, authentication mechanism, and HMAC secret are extracted from the publicly served frontend JavaScript and may change without notice. This is not affiliated with Ginlong/Solis in any way. Use at your own risk.

## License

[GNU AGPLv3](LICENSE)

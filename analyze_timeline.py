import requests
import hashlib
import hmac
import base64
import datetime
import json

HMAC_SECRET = b"5704383536604a8bb94c83ebc059aa8c"
KEY_ID = "2424"

def md5_b64(data_bytes):
    return base64.b64encode(hashlib.md5(data_bytes).digest()).decode("utf-8")

def sign(path, body_str, date_str):
    c_md5 = md5_b64(body_str.encode("utf-8"))
    sign_path = path[4:] if path.startswith("/api") else path
    sign_str = f"POST\n{c_md5}\napplication/json\n{date_str}\n{sign_path}"
    sig = base64.b64encode(hmac.new(HMAC_SECRET, sign_str.encode("utf-8"), hashlib.sha1).digest()).decode("utf-8")
    return c_md5, sig

session = requests.Session()

# 1. Login
pass_md5 = hashlib.md5(b"POWER2GO").hexdigest()
login_body = json.dumps({
    "userInfo": "Qasim Moosvi",
    "passWord": pass_md5,
    "yingZhenType": 1,
    "localTime": int(datetime.datetime.now().timestamp() * 1000),
    "localTimeZone": 5,
    "language": "2"
})
now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
c_md5, sig = sign("/api/user/login2", login_body, now_str)
headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "Content-MD5": c_md5,
    "Authorization": f"WEB {KEY_ID}:{sig}",
    "Time": now_str,
    "Language": "2",
    "X-Cloud-Platform": "GLY",
    "Version": "5.3.001",
    "Platform": "Web"
}
session.post("https://www.soliscloud.com/api/user/login2", headers=headers, data=login_body)

station_id = "1298491919450797504"
days = [
    "2026-11-08",
    "2026-11-09",
    "2026-11-10",
    "2026-11-11",
    "2026-11-12",
    "2026-11-13",
    "2026-11-14",
    "2026-11-15",
    "2026-11-16",
    "2026-11-17"
]

print("==========================================================================================================")
print("                               DAILY 5-MINUTE POWER CURVE FORENSIC SUMMARY")
print("==========================================================================================================")
print(f"{'Date':11} | {'Solar Peak':10} | {'Max Grid Imp':12} | {'Max Chg Pwr':11} | {'Max Dis Pwr':11} | {'SOC Range':10} | {'Zero State Count':16} | {'Key Operating Pattern'}")
print("-" * 125)

daily_details = {}

for d in days:
    body = json.dumps({"id": station_id, "time": d, "timeZone": 5, "money": "PKR"})
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    c_md5, sig = sign("/api/chart/station/day/v2", body, now_str)
    headers["Content-MD5"] = c_md5
    headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
    headers["Time"] = now_str
    res = session.post("https://www.soliscloud.com/api/chart/station/day/v2", headers=headers, data=body)
    data = res.json().get("data", {})
    
    times = data.get("timeStr", [])
    pec = float(data.get("powerPec") or 0.001)
    def to_float(val):
        try:
            if isinstance(val, (int, float)): return float(val)
            if isinstance(val, str): return float(val)
            if isinstance(val, list) and len(val) > 0: return float(val[0])
            return 0.0
        except:
            return 0.0

    solar = [to_float(x) * pec for x in data.get("produceEnergy", [])]
    batt = [to_float(x) * pec for x in data.get("batteryPower", [])]
    grid = [to_float(x) * pec for x in data.get("psum", [])]
    load = [to_float(x) * pec for x in data.get("consumeEnergy", [])]
    soc = [int(to_float(x)) for x in data.get("batteryCapacitySocList", [])]
    state = [str(x) for x in data.get("state", [])]

    max_solar = max(solar) if solar else 0
    min_grid = min(grid) if grid else 0 # negative is grid import
    max_grid_imp = abs(min_grid) if min_grid < 0 else 0
    
    chg = [b for b in batt if b > 0]
    dis = [b for b in batt if b < 0]
    max_chg = max(chg) if chg else 0
    max_dis = abs(min(dis)) if dis else 0

    min_soc = min(soc) if soc else 0
    max_soc = max(soc) if soc else 0

    zero_solar_count = sum(1 for s in solar if s == 0)
    zero_batt_count = sum(1 for b in batt if b == 0)
    zero_grid_count = sum(1 for g in grid if g == 0)
    
    # Analyze daily pattern
    pattern = ""
    if max_solar == 0:
        pattern = "NO SOLAR GENERATION AT ALL (0 kW all day)!"
    elif max_chg == 0:
        pattern = "SOLAR PRESENT BUT BATTERY DID NOT CHARGE!"
    else:
        pattern = f"Normal operation (PV: {max_solar:.1f} kW peak)"

    print(f"{d:11} | {max_solar:8.1f} kW | {max_grid_imp:10.1f} kW | {max_chg:9.1f} kW | {max_dis:9.1f} kW | {min_soc:3d}% - {max_soc:3d}% | Solar=0 in {zero_solar_count}/288 pts | {pattern}")

    daily_details[d] = {
        "times": times,
        "solar": solar,
        "batt": batt,
        "grid": grid,
        "load": load,
        "soc": soc,
        "state": state
    }

# Now let's inspect the transition on Nov 09 -> Nov 10, and Nov 13 -> Nov 14!
print("\n" + "=" * 100)
print("                    TRANSITION TIMELINE AUDIT (WHEN EXACTLY DID IT TRIP / SHUT DOWN?)")
print("=" * 100)

for d in ["2026-11-09", "2026-11-10", "2026-11-13", "2026-11-14", "2026-11-15"]:
    dd = daily_details[d]
    times = dd["times"]
    solar = dd["solar"]
    batt = dd["batt"]
    grid = dd["grid"]
    load = dd["load"]
    soc = dd["soc"]
    print(f"\n--- Key 5-Minute Points for {d} (Focusing on Morning 06:00 - 18:00): ---")
    for i, t in enumerate(times):
        # Look around 06:00 to 18:00
        hour = int(t.split(":")[0])
        minute = int(t.split(":")[1])
        if hour in [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] and minute % 30 == 0:
            print(f"  {t} | Solar: {solar[i]:5.1f} kW | Batt: {batt[i]:6.1f} kW | Grid: {grid[i]:6.1f} kW | Load: {load[i]:5.1f} kW | SOC: {soc[i]:3d}%")


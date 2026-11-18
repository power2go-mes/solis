import requests
import hashlib
import hmac
import base64
import datetime
import json

HMAC_SECRET = b"5704383536604a8bb94c83ebc059aa8c"
KEY_ID = "2424"

def md5_b64(d): return base64.b64encode(hashlib.md5(d).digest()).decode("utf-8")
def sign(path, b_str, d_str):
    c_md5 = md5_b64(b_str.encode("utf-8"))
    sign_path = path[4:] if path.startswith("/api") else path
    sig = base64.b64encode(hmac.new(HMAC_SECRET, f"POST\n{c_md5}\napplication/json\n{d_str}\n{sign_path}".encode("utf-8"), hashlib.sha1).digest()).decode("utf-8")
    return c_md5, sig

session = requests.Session()
pass_md5 = hashlib.md5(b"POWER2GO").hexdigest()
now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
login_body = json.dumps({"userInfo": "Qasim Moosvi", "passWord": pass_md5, "yingZhenType": 1, "localTime": int(datetime.datetime.now().timestamp() * 1000), "localTimeZone": 5, "language": "2"})
c_md5, sig = sign("/api/user/login2", login_body, now_str)
headers = {"Content-Type": "application/json;charset=UTF-8", "Content-MD5": c_md5, "Authorization": f"WEB {KEY_ID}:{sig}", "Time": now_str, "Language": "2", "X-Cloud-Platform": "GLY", "Version": "5.3.001", "Platform": "Web"}
session.post("https://www.soliscloud.com/api/user/login2", headers=headers, data=login_body)

def solis_post(api_path, payload):
    body_str = json.dumps(payload)
    d_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    c_md5, s_val = sign(api_path, body_str, d_str)
    h = headers.copy()
    h["Content-MD5"] = c_md5
    h["Authorization"] = f"WEB {KEY_ID}:{s_val}"
    h["Time"] = d_str
    resp = session.post("https://www.soliscloud.com" + api_path, headers=h, data=body_str)
    return resp.json()

station_id = "1298491919450797504"

# Let's inspect station day curves for all battery parameters across Nov 08-17
all_days = ["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"]

print("==================================================================================================================================")
print("                               BATTERY OPERATION AUDIT (NOV 08 - NOV 17)")
print("==================================================================================================================================")
print(f"{'Date':11} | {'SOC Range':12} | {'Charge Hours':14} | {'Discharge Hours':16} | {'Max Chg kW':12} | {'Max Dis kW':12} | {'Min SOC Time':14} | {'Max SOC Time'}")
print("-" * 125)

for day in all_days:
    res = solis_post("/api/chart/station/day/v2", {"id": station_id, "time": day, "timeZone": 5, "money": "PKR"})
    d = res.get("data", {})
    pec = float(d.get("powerPec") or 0.001)
    times = d.get("timeStr", [])
    batt = [float(x)*pec if x is not None else 0 for x in d.get("batteryPower", [])]
    soc = [int(float(x)) if x is not None else 0 for x in d.get("batteryCapacitySocList", [])]

    if not times:
        print(f"{day:11} | NO DATA RETURNED")
        continue

    min_soc = min(soc)
    max_soc = max(soc)
    min_time = times[soc.index(min_soc)]
    max_time = times[soc.index(max_soc)]

    chg_count = sum(1 for b in batt if b > 0.5)
    dis_count = sum(1 for b in batt if b < -0.5)
    chg_hours = chg_count * 5 / 60
    dis_hours = dis_count * 5 / 60

    max_chg = max(batt) if max(batt) > 0 else 0
    max_dis = abs(min(batt)) if min(batt) < 0 else 0

    print(f"{day:11} | {min_soc:3d}% - {max_soc:3d}%  | {chg_hours:10.1f} hrs  | {dis_hours:12.1f} hrs  | {max_chg:10.1f} kW | {max_dis:10.1f} kW | {min_time:12} | {max_time:12}")


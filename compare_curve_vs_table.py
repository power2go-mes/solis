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

# Login
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

print("==================================================================================================================================")
print("             5-MINUTE TELEMETRY INTEGRAL vs DAILY ACCUMULATOR COUNTER COMPARISON (Nov 08 - 17, 2026)")
print("==================================================================================================================================")
print(f"{'Date':11} | {'Curve PV (kWh)':14} | {'Table PV (kWh)':14} | {'Curve Chg':10} | {'Table Chg':10} | {'Curve Dis':10} | {'Table Dis':10} | {'Curve Load':10} | {'Table Load':10}")
print("-" * 130)

# Fetch table daily records first
body = json.dumps({"id": station_id, "month": "2026-11", "time": "2026-11", "timeZone": 5, "money": "PKR"})
now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
c_md5, sig = sign("/api/chart/station/month", body, now_str)
headers["Content-MD5"] = c_md5
headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
headers["Time"] = now_str
r_m = session.post("https://www.soliscloud.com/api/chart/station/month", headers=headers, data=body)
table_map = {r["dateStr"]: r for r in r_m.json().get("data", [])}

for d in days:
    body = json.dumps({"id": station_id, "time": d, "timeZone": 5, "money": "PKR"})
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    c_md5, sig = sign("/api/chart/station/day/v2", body, now_str)
    headers["Content-MD5"] = c_md5
    headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
    headers["Time"] = now_str
    res = session.post("https://www.soliscloud.com/api/chart/station/day/v2", headers=headers, data=body)
    data = res.json().get("data", {})
    
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
    load = [to_float(x) * pec for x in data.get("consumeEnergy", [])]

    # Integral of 5-min intervals: sum(kW) * 5 / 60 = kWh
    dt_hours = 5.0 / 60.0
    curve_pv = sum(solar) * dt_hours
    curve_chg = sum(b for b in batt if b > 0) * dt_hours
    curve_dis = sum(abs(b) for b in batt if b < 0) * dt_hours
    curve_load = sum(load) * dt_hours

    t_rec = table_map.get(d, {})
    tab_pv = float(t_rec.get("produceEnergy") or 0)
    tab_chg = float(t_rec.get("batteryChargeEnergy") or 0)
    tab_dis = float(t_rec.get("batteryDischargeEnergy") or 0)
    tab_load = float(t_rec.get("consumeEnergy") or 0)

    print(f"{d:11} | {curve_pv:11.1f} kWh | {tab_pv:11.1f} kWh | {curve_chg:7.1f} kWh | {tab_chg:7.1f} kWh | {curve_dis:7.1f} kWh | {tab_dis:7.1f} kWh | {curve_load:7.1f} kWh | {tab_load:7.1f} kWh")


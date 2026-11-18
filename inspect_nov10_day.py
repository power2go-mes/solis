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

res_st10 = solis_post("/api/chart/station/day/v2", {"id": station_id, "time": "2026-11-10", "timeZone": 5, "money": "PKR"})
d10 = res_st10.get("data", {})
pec = float(d10.get("powerPec") or 0.001)

times10 = d10.get("timeStr", [])
solar10 = [float(x)*pec for x in d10.get("produceEnergy", [])]
batt10 = [float(x)*pec for x in d10.get("batteryPower", [])]
soc10 = [int(float(x)) for x in d10.get("batteryCapacitySocList", [])]
grid10 = [float(x)*pec for x in d10.get("psum", [])]
load10 = [float(x)*pec for x in d10.get("consumeEnergy", [])]

print("=== November 10 Daytime Telemetry (Every 15 minutes) ===")
print("Time      | Solar (kW) | Battery (kW) | SOC (%) | Grid (kW) | Load (kW)")
for i, t in enumerate(times10):
    m = int(t.split(":")[1])
    if "06:00:00" <= t <= "18:00:00" and m % 15 == 0:
        print(f"Nov 10 {t} | {solar10[i]:10.1f} | {batt10[i]:12.1f} | {soc10[i]:7d} | {grid10[i]:9.1f} | {load10[i]:9.1f}")


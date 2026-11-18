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

inv1_sn = "1053050258140015"
inv2_sn = "1053050258180057"

print("=====================================================================================================")
print("          TRACE START AND END OF MULTI-LOGGER COLLISION / OVER-REPORTING")
print("=====================================================================================================")

# Check Nov 09 end of day to Nov 10 start of day for Inverter 1
res_09 = solis_post("/api/chart/inverter/day/v2", {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5})
res_10 = solis_post("/api/chart/inverter/day/v2", {"sn": inv1_sn, "time": "2026-11-10", "timeZone": 5})
res_13 = solis_post("/api/chart/inverter/day/v2", {"sn": inv1_sn, "time": "2026-11-13", "timeZone": 5})
res_14 = solis_post("/api/chart/inverter/day/v2", {"sn": inv1_sn, "time": "2026-11-14", "timeZone": 5})

t09 = res_09.get("data", {}).get("timeStr", [])
t10 = res_10.get("data", {}).get("timeStr", [])
t13 = res_13.get("data", {}).get("timeStr", [])
t14 = res_14.get("data", {}).get("timeStr", [])

print(f"Nov 09: Last 5 timestamps: {t09[-5:]}")
print(f"Nov 10: First 15 timestamps: {t10[:15]}")
print(f"\nNov 13: Last 10 timestamps: {t13[-10:]}")
print(f"Nov 14: First 10 timestamps: {t14[:10]}")

# Look at Inverter 2 as well
res2_09 = solis_post("/api/chart/inverter/day/v2", {"sn": inv2_sn, "time": "2026-11-09", "timeZone": 5})
res2_10 = solis_post("/api/chart/inverter/day/v2", {"sn": inv2_sn, "time": "2026-11-10", "timeZone": 5})
res2_13 = solis_post("/api/chart/inverter/day/v2", {"sn": inv2_sn, "time": "2026-11-13", "timeZone": 5})
res2_14 = solis_post("/api/chart/inverter/day/v2", {"sn": inv2_sn, "time": "2026-11-14", "timeZone": 5})

t2_09 = res2_09.get("data", {}).get("timeStr", [])
t2_10 = res2_10.get("data", {}).get("timeStr", [])
t2_13 = res2_13.get("data", {}).get("timeStr", [])
t2_14 = res2_14.get("data", {}).get("timeStr", [])

print(f"\nInverter 2 Nov 09: Last 5 timestamps: {t2_09[-5:]}")
print(f"Inverter 2 Nov 10: First 10 timestamps: {t2_10[:10]}")
print(f"Inverter 2 Nov 13: Last 10 timestamps: {t2_13[-10:]}")
print(f"Inverter 2 Nov 14: First 10 timestamps: {t2_14[:10]}")


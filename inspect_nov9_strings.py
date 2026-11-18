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

# Fetch Inverter 1 & Inverter 2 day curve on Nov 09
res1 = solis_post("/api/chart/inverter/day/v2", {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5})
res2 = solis_post("/api/chart/inverter/day/v2", {"sn": inv2_sn, "time": "2026-11-09", "timeZone": 5})

d1 = res1.get("data", {})
d2 = res2.get("data", {})

print("==========================================================================================")
print("             HOURLY POWER & STRING PROFILES ON NOVEMBER 09, 2026")
print("==========================================================================================")
print("Time      | Inv1 U_PV1 | Inv1 I_PV1 | Inv1 U_PV2 | Inv1 I_PV2 | Inv2 U_PV1 | Inv2 I_PV1 | Inv2 U_PV2 | Inv2 I_PV2")
print("-" * 95)

t1 = d1.get("timeStr", [])
u1_1 = d1.get("u_pv1", [])
i1_1 = d1.get("i_pv1", [])
u1_2 = d1.get("u_pv2", [])
i1_2 = d1.get("i_pv2", [])

t2 = d2.get("timeStr", [])
u2_1 = d2.get("u_pv1", [])
i2_1 = d2.get("i_pv1", [])
u2_2 = d2.get("u_pv2", [])
i2_2 = d2.get("i_pv2", [])

for idx, t in enumerate(t1):
    if idx % 12 == 0: # Every hour (12 * 5 min = 60 min)
        time_display = t.split(" ")[1] if " " in t else t
        idx2 = min(idx, len(t2)-1)
        u1_val = u1_1[idx] if idx < len(u1_1) else 0
        i1_val = i1_1[idx] if idx < len(i1_1) else 0
        u12_val = u1_2[idx] if idx < len(u1_2) else 0
        i12_val = i1_2[idx] if idx < len(i1_2) else 0
        u2_val = u2_1[idx2] if idx2 < len(u2_1) else 0
        i2_val = i2_1[idx2] if idx2 < len(i2_1) else 0
        u22_val = u2_2[idx2] if idx2 < len(u2_2) else 0
        i22_val = i2_2[idx2] if idx2 < len(i2_2) else 0
        print(f"{time_display}  | {u1_val:8.1f} V | {i1_val:8.1f} A | {u12_val:8.1f} V | {i12_val:8.1f} A | {u2_val:8.1f} V | {i2_val:8.1f} A | {u22_val:8.1f} V | {i22_val:8.1f} A")


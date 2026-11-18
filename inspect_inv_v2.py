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

inv1_sn = "1053050258140015"
inv2_sn = "1053050258180057"

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

# Inspect day chart v2 for inv1 on Nov 09
res = solis_post("/api/chart/inverter/day/v2", {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5})
data = res.get("data", {})
print("Inverter Day Chart v2 Keys:")
for k, v in data.items():
    if isinstance(v, list):
        non_empty = [x for x in v if x is not None and x != ""]
        print(f"  {k}: list length {len(v)}, non-empty {len(non_empty)}, sample: {v[:3]}")
    else:
        print(f"  {k}: {v}")

# Check what other chart endpoints exist
for ep in ["/api/chart/inverter/ac/day", "/api/chart/inverter/grid/day", "/api/chart/inverter/battery/day", "/api/chart/inverter/month", "/api/chart/inverter/year"]:
    res2 = solis_post(ep, {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5, "month": "2026-11"})
    print(f"Endpoint {ep} -> msg: {res2.get('msg')} | data: {bool(res2.get('data'))}")


import requests
import hashlib
import hmac
import base64
import datetime
import json
import os

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
r = session.post("https://www.soliscloud.com/api/user/login2", headers=headers, data=login_body)
print("Login status:", r.json().get("success"))

station_id = "1298491919450797504"
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

# Let's test chart endpoints for inverter
endpoints_to_test = [
    ("/api/chart/inverter/day", {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5}),
    ("/api/chart/inverter/day/v2", {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5}),
    ("/api/chart/device/day", {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5}),
    ("/api/chart/device/day/v2", {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5}),
    ("/api/chart/battery/day", {"sn": inv1_sn, "time": "2026-11-09", "timeZone": 5}),
    ("/api/inverter/detail", {"sn": inv1_sn}),
    ("/api/inverter/detail", {"sn": inv2_sn}),
]

for ep, p in endpoints_to_test:
    res = solis_post(ep, p)
    data = res.get("data")
    if data:
        keys = list(data.keys()) if isinstance(data, dict) else len(data)
        print(f"Endpoint {ep} -> SUCCESS, Keys: {keys}")
    else:
        print(f"Endpoint {ep} -> msg: {res.get('msg')} (code: {res.get('code')})")


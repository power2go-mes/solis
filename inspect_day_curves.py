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

# Check curves for Nov 08 to Nov 17
days = ["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"]

for d in days:
    body = json.dumps({"id": station_id, "time": d, "timeZone": 5, "money": "PKR"})
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    c_md5, sig = sign("/api/chart/station/day/v2", body, now_str)
    headers["Content-MD5"] = c_md5
    headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
    headers["Time"] = now_str
    res = session.post("https://www.soliscloud.com/api/chart/station/day/v2", headers=headers, data=body)
    data = res.json().get("data", {})
    keys = list(data.keys())
    
    # Check what series are populated
    times = data.get("timeStr", [])
    
    # Check daily totals if available in data
    print(f"\n==================== DATE: {d} ====================")
    print("Available keys in response:", keys)
    for k in keys:
        val = data[k]
        if isinstance(val, list):
            non_empty = [x for x in val if x is not None and x != ""]
            print(f"  - {k}: list length {len(val)}, non-empty items {len(non_empty)}, sample: {val[:3]}")
        else:
            print(f"  - {k}: {val}")


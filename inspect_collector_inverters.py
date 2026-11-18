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

# Check collector detail
res = solis_post("/api/collector/list", {"stationId": station_id, "pageNo": 1, "pageSize": 10})
collectors = res.get("data", {}).get("page", {}).get("records", [])

for c in collectors:
    c_sn = c.get("sn")
    print(f"\nCollector SN: {c_sn} | Model: {c.get('model')} | StationName: {c.get('stationName')} | ActiveDate: {c.get('collectorActiveDate')}")
    # Try querying devices under collector
    res_dev = solis_post("/api/collector/device/list", {"collectorSn": c_sn, "pageNo": 1, "pageSize": 10})
    if res_dev.get("data"):
        print("  Devices:", res_dev.get("data"))
    res_inv = solis_post("/api/inverter/list", {"collectorSn": c_sn, "pageNo": 1, "pageSize": 10})
    if res_inv.get("data"):
        rec = res_inv.get("data", {}).get("page", {}).get("records", [])
        print(f"  Inverters attached to {c_sn}: {[r.get('sn') for r in rec]}")


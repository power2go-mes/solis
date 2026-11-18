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

# Inspect Inverter 1 on Nov 10
res1 = solis_post("/api/chart/inverter/day/v2", {"sn": inv1_sn, "time": "2026-11-10", "timeZone": 5})
d1 = res1.get("data", {})
times1 = d1.get("timeStr", [])
print(f"Inverter 1 on 2026-11-10 has {len(times1)} points:")
print("First 10 timestamps:", times1[:10])
print("Middle timestamps around index 280-295:", times1[280:295])
print("Last 10 timestamps:", times1[-10:])

# Check interval diffs
time_objs = [datetime.datetime.strptime(t, "%Y-%m-%d %H:%M:%S") for t in times1]
diffs = [(time_objs[i+1] - time_objs[i]).total_seconds() for i in range(len(time_objs)-1)]
print(f"Min diff: {min(diffs)}s, Max diff: {max(diffs)}s")
# Find where diff is < 60s (rapid fire duplicates or multi-logger collisions)
fast_diffs = [(times1[i], times1[i+1], diffs[i]) for i in range(len(diffs)) if diffs[i] < 60]
print(f"Number of intervals < 60 seconds apart: {len(fast_diffs)}")
for fd in fast_diffs[:10]:
    print(f"  {fd[0]} -> {fd[1]} ({fd[2]} seconds)")


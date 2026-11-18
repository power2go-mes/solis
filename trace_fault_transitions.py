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

print("==========================================================================================")
print("             EXACT FAULT BIT TRANSITIONS ON NOV 14, 16, 17, 18")
print("==========================================================================================")

for day in ["2026-11-14", "2026-11-16", "2026-11-17", "2026-11-18"]:
    for sn in [inv1_sn, inv2_sn]:
        res = solis_post("/api/chart/inverter/day/v2", {"sn": sn, "time": day, "timeZone": 5})
        d = res.get("data", {})
        times = d.get("timeStr", [])
        states = d.get("state", [])
        fault_bits = d.get("fault_bit_list", [])
        alarm_counts = d.get("alarm_count", [])

        # Find state or fault transitions
        prev_st = None
        prev_fb = None
        for i, t in enumerate(times):
            st = states[i] if i < len(states) else None
            fb = fault_bits[i] if i < len(fault_bits) else None
            ac = alarm_counts[i] if i < len(alarm_counts) else None
            if st != prev_st or fb != prev_fb:
                # Print transition
                if fb != "0000,0000,0000,0000,0000,0000,0000,0000" and fb != "0000,0000,0000":
                    print(f"[{day}] Inv: {sn} @ {t} -> State: {st} | AlarmCount: {ac} | FaultBits: {fb}")
                prev_st = st
                prev_fb = fb


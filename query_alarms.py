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
r = session.post("https://www.soliscloud.com/api/user/login2", headers=headers, data=login_body)
print("Login status:", r.json().get("success"))

# 2. Query All Alarms for Menu Karachi Office (1298491919450797504)
for page in [1, 2, 3]:
    alarm_body = json.dumps({
        "pageNo": page,
        "pageSize": 50,
        "stationId": "1298491919450797504"
    })
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    c_md5, sig = sign("/api/alarm/list", alarm_body, now_str)
    headers["Content-MD5"] = c_md5
    headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
    headers["Time"] = now_str
    r_alarm = session.post("https://www.soliscloud.com/api/alarm/list", headers=headers, data=alarm_body)
    data = r_alarm.json().get("data", {})
    records = data.get("records", []) or data.get("page", {}).get("records", [])
    print(f"\n--- Page {page}: {len(records)} records ---")
    for rec in records:
        pk = rec.get("pk")
        code = rec.get("alarmCode")
        msg = rec.get("alarmMsg")
        level = rec.get("alarmLevel")
        begin = rec.get("alarmBeginTimeStr")
        end = rec.get("alarmEndTimeStr")
        duration = rec.get("alarmLongStr")
        state = rec.get("state")
        dev = rec.get("alarmDeviceSn")
        print(f"[{begin} -> {end}] Code: {code} | Msg: {msg:18} | Dur: {duration:6} | State: {state} | Dev: {dev} | PK: {pk}")


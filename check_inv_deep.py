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
    sign_str = f"POST\n{c_md5}\napplication/json\n${date_str}\n{sign_path}"
    # Wait, note the sign_str formatting
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

station_id = "1298491919450797504"

# Check inverter details for both inverters
for inv_sn in ["1053050258140015", "1053050258180057"]:
    body = json.dumps({"sn": inv_sn})
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    c_md5, sig = sign("/api/inverter/detail", body, now_str)
    headers["Content-MD5"] = c_md5
    headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
    headers["Time"] = now_str
    r = session.post("https://www.soliscloud.com/api/inverter/detail", headers=headers, data=body)
    data = r.json().get("data", {})
    print(f"\n--- Inverter {inv_sn} ---")
    for k in ["sn", "model", "inverterType", "state", "alarmState", "dataTimestampStr", "eToday", "eMonth", "eTotal", "collectorSn"]:
        print(f"  {k}: {data.get(k)}")
    # Print battery list if attached to inverter
    b_list = data.get("batteryList") or []
    print(f"  batteryList count: {len(b_list)}")
    for b in b_list:
        print("    Battery:", {k: b.get(k) for k in ["batterySn", "batteryType", "batteryVoltage", "batteryCapacitySoc", "batteryCurrent", "batteryPower", "bmsStatus", "bmsFault01", "bmsFault02"]})


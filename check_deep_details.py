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

station_id = "1298491919450797504"

# 1. Query station detailMix to see current battery BMS state, alarm codes, inverter states
print("=== Querying Station detailMix ===")
body = json.dumps({"id": station_id, "localTime": int(datetime.datetime.now().timestamp() * 1000), "localTimeZone": 5, "language": "2"})
now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
c_md5, sig = sign("/api/station/detailMix", body, now_str)
headers["Content-MD5"] = c_md5
headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
headers["Time"] = now_str
r = session.post("https://www.soliscloud.com/api/station/detailMix", headers=headers, data=body)
mix = r.json().get("data", {})

print("Station Name:", mix.get("stationName"))
print("Inverter state:", mix.get("state"))
print("Alarm State:", mix.get("alarmState"))
print("Battery Jump / Config:", mix.get("batteryJump"))
print("Current Flow Map:", mix.get("industryCurrentFlowMapV2"))

# 2. Check Battery list for station
print("\n=== Battery List for Station ===")
body = json.dumps({"stationId": station_id, "pageNo": 1, "pageSize": 10})
now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
c_md5, sig = sign("/api/battery/list", body, now_str)
headers["Content-MD5"] = c_md5
headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
headers["Time"] = now_str
r_b = session.post("https://www.soliscloud.com/api/battery/list", headers=headers, data=body)
b_records = r_b.json().get("data", {}).get("page", {}).get("records", [])
for b in b_records:
    print("Battery SN:", b.get("batterySn"), "Inverter SN:", b.get("inverterSn"), "Model:", b.get("batteryType"), "SOC:", b.get("batteryCapacitySoc"), "%", "Volts:", b.get("batteryVoltage"), "V", "BMS Status:", b.get("bmsStatus"), "BMS Fault01:", b.get("bmsFault01"), "BMS Fault02:", b.get("bmsFault02"), "Alarm Register:", b.get("alarmStatus"))

# 3. Check Dataloggers
print("\n=== Dataloggers ===")
body = json.dumps({"stationId": station_id, "pageNo": 1, "pageSize": 10})
now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
c_md5, sig = sign("/api/collector/list", body, now_str)
headers["Content-MD5"] = c_md5
headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
headers["Time"] = now_str
r_c = session.post("https://www.soliscloud.com/api/collector/list", headers=headers, data=body)
collectors = r_c.json().get("data", {}).get("page", {}).get("records", [])
for c in collectors:
    print("Collector SN:", c.get("sn"), "Model:", c.get("model"), "State:", c.get("state"), "Last Upload:", c.get("dataTimestampStr"), "RSSI:", c.get("rssi"))


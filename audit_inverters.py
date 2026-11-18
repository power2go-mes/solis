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
inv1_sn = "1053050258140015"
inv2_sn = "1053050258180057"

# 1. Query inverter detail and daily chart for both inverters on Nov 10, 11, 12, 13, 14, 15
print("=== Querying Inverter Details and History ===")
for sn in [inv1_sn, inv2_sn]:
    body = json.dumps({"sn": sn})
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    c_md5, sig = sign("/api/inverter/detail", body, now_str)
    headers["Content-MD5"] = c_md5
    headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
    headers["Time"] = now_str
    r = session.post("https://www.soliscloud.com/api/inverter/detail", headers=headers, data=body)
    inv_data = r.json().get("data", {})
    print(f"Inverter SN: {sn} | Model: {inv_data.get('model')} | State: {inv_data.get('state')} | AlarmState: {inv_data.get('alarmState')} | Datalogger: {inv_data.get('collectorSn')} | PAC: {inv_data.get('pac')} W | Batt: {inv_data.get('batteryPower')} W | Grid: {inv_data.get('gridPower')} W | Inverter Day E: {inv_data.get('eToday')} kWh")

# 2. Query Inverter-level day chart for Nov 10, 11, 12, 13, 15
print("\n=== Inverter-level Day Chart Analysis for Nov 10-15 ===")
for test_date in ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]:
    for sn in [inv1_sn, inv2_sn]:
        body = json.dumps({"sn": sn, "time": test_date, "timeZone": 5})
        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
        c_md5, sig = sign("/api/chart/inverter/day", body, now_str)
        headers["Content-MD5"] = c_md5
        headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
        headers["Time"] = now_str
        r = session.post("https://www.soliscloud.com/api/chart/inverter/day", headers=headers, data=body)
        inv_chart = r.json().get("data", {})
        if inv_chart:
            # Calculate energy from PAC
            pac_list = [float(x) for x in inv_chart.get("pac", []) if x is not None]
            max_pac = max(pac_list) if pac_list else 0
            # Integral in kWh (5 min interval = * 5/60 / 1000)
            kwh_approx = sum(pac_list) * (5.0 / 60.0) / 1000.0 if pac_list else 0
            print(f"  Date: {test_date} | Inverter: {sn} | Pts: {len(pac_list)} | Max PAC: {max_pac:8.1f} W | Est Yield: {kwh_approx:6.1f} kWh | eToday reported: {inv_chart.get('eToday')}")

# 3. Check station daily energy counter API vs station chart
print("\n=== Comparing /api/chart/station/month raw records for Nov 08-17 ===")
body = json.dumps({"id": station_id, "month": "2026-11", "time": "2026-11", "timeZone": 5, "money": "PKR"})
now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
c_md5, sig = sign("/api/chart/station/month", body, now_str)
headers["Content-MD5"] = c_md5
headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
headers["Time"] = now_str
r_m = session.post("https://www.soliscloud.com/api/chart/station/month", headers=headers, data=body)
month_records = r_m.json().get("data", [])
for rec in month_records:
    if "2026-11-08" <= rec.get("dateStr", "") <= "2026-11-17":
        print(f"Date: {rec.get('dateStr')} | Produce: {rec.get('produceEnergy')} | Consume: {rec.get('consumeEnergy')} | Chg: {rec.get('batteryChargeEnergy')} | Dis: {rec.get('batteryDischargeEnergy')} | GridPur: {rec.get('gridPurchasedEnergy')} | GridSell: {rec.get('gridSellEnergy')}")


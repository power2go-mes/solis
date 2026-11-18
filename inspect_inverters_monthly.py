import requests
import hashlib
import hmac
import base64
import datetime
import json

HMAC_SECRET = b"5704383536604a8bb94c83ebc059aa8c"
KEY_ID = "2424"

def md5_b64(d):
    return base64.b64encode(hashlib.md5(d).digest()).decode("utf-8")

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

for inv_sn in ["1053050258140015", "1053050258180057"]:
    body = json.dumps({"sn": inv_sn, "month": "2026-11", "time": "2026-11", "timeZone": 5})
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    c_md5, sig = sign("/api/chart/inverter/month", body, now_str)
    headers["Content-MD5"] = c_md5
    headers["Authorization"] = f"WEB {KEY_ID}:{sig}"
    headers["Time"] = now_str
    res = session.post("https://www.soliscloud.com/api/chart/inverter/month", headers=headers, data=body)
    data = res.json().get("data", [])
    print(f"\n=== Inverter {inv_sn} (Total days: {len(data)}) ===")
    for d in data:
        print(f"  {d.get('dateStr')} | Energy: {d.get('energy')} kWh | Chg: {d.get('batteryChargeEnergy')} | Dis: {d.get('batteryDischargeEnergy')} | GridPur: {d.get('gridPurchasedEnergy')} | Cons: {d.get('consumeEnergy')}")


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
print("             NOVEMBER 15 DETAILED INSPECTION (BATTERY CHARGE LOCKOUT)")
print("==========================================================================================")

for inv_sn in [inv1_sn, inv2_sn]:
    res = solis_post("/api/chart/inverter/day/v2", {"sn": inv_sn, "time": "2026-11-15", "timeZone": 5})
    d = res.get("data", {})
    times = d.get("timeStr", [])
    u_pv1 = d.get("u_pv1", [])
    i_pv1 = d.get("i_pv1", [])
    u_pv2 = d.get("u_pv2", [])
    i_pv2 = d.get("i_pv2", [])
    state = d.get("state", [])
    fault_bits = d.get("fault_bit_list", [])

    print(f"\nInverter {inv_sn} on Nov 15 (Total intervals: {len(times)}):")
    for idx, t in enumerate(times):
        if idx % 24 == 0: # Every 2 hours
            t_str = t.split(" ")[1] if " " in t else t
            print(f"  {t_str} | U_PV1: {u_pv1[idx]:6.1f}V | I_PV1: {i_pv1[idx]:5.1f}A | U_PV2: {u_pv2[idx]:6.1f}V | I_PV2: {i_pv2[idx]:5.1f}A | State: {state[idx]} | Fault: {fault_bits[idx]}")

# Station telemetry on Nov 15
res_st15 = solis_post("/api/chart/station/day/v2", {"id": "1298491919450797504", "time": "2026-11-15", "timeZone": 5, "money": "PKR"})
d_st15 = res_st15.get("data", {})
pec = float(d_st15.get("powerPec") or 0.001)
times_st = d_st15.get("timeStr", [])
solar_st = [float(x)*pec for x in d_st15.get("produceEnergy", [])]
batt_st = [float(x)*pec for x in d_st15.get("batteryPower", [])]
soc_st = [int(float(x)) for x in d_st15.get("batteryCapacitySocList", [])]
grid_st = [float(x)*pec for x in d_st15.get("psum", [])]
load_st = [float(x)*pec for x in d_st15.get("consumeEnergy", [])]

print("\nStation Daytime Telemetry on Nov 15:")
print("Time      | Solar (kW) | Battery (kW) | SOC (%) | Grid (kW) | Load (kW)")
for i, t in enumerate(times_st):
    m = int(t.split(":")[1])
    if "06:00:00" <= t <= "18:00:00" and m % 30 == 0:
        print(f"{t}  | {solar_st[i]:10.1f} | {batt_st[i]:12.1f} | {soc_st[i]:7d} | {grid_st[i]:9.1f} | {load_st[i]:9.1f}")


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
print("              DEEP FORENSIC INVESTIGATION: NOVEMBER 09, 2026")
print("==========================================================================================")

for inv_sn in [inv1_sn, inv2_sn]:
    print(f"\n--- Investigating Inverter {inv_sn} on 2026-11-09 ---")
    res = solis_post("/api/chart/inverter/day/v2", {"sn": inv_sn, "time": "2026-11-09", "timeZone": 5})
    d = res.get("data", {})
    times = d.get("timeStr", [])
    states = d.get("state", [])
    current_states = d.get("current_state", [])
    fault_bits = d.get("fault_bit_list", [])
    alarm_counts = d.get("alarm_count", [])
    u_pv1 = d.get("u_pv1", [])
    i_pv1 = d.get("i_pv1", [])
    u_pv2 = d.get("u_pv2", [])
    i_pv2 = d.get("i_pv2", [])

    print(f"Total intervals returned: {len(times)}")
    
    # Check for any non-zero fault bits, alarm counts, or state changes
    non_normal_pts = []
    for i, t in enumerate(times):
        fb = fault_bits[i] if i < len(fault_bits) else "0"
        ac = alarm_counts[i] if i < len(alarm_counts) else 0
        st = states[i] if i < len(states) else 0
        cs = current_states[i] if i < len(current_states) else ""
        
        # Check if fault bit has non-zeros or alarm > 0 or state != 1
        if fb != "0000,0000,0000,0000,0000,0000,0000,0000" or ac > 0 or st != 1:
            non_normal_pts.append((t, st, cs, ac, fb))

    print(f"Non-normal intervals (state != 1, alarms > 0, or fault bits active): {len(non_normal_pts)}")
    for pt in non_normal_pts[:15]:
        print(f"  Time: {pt[0]} | State: {pt[1]} | CurrentState: {pt[2]} | AlarmCount: {pt[3]} | FaultBit: {pt[4]}")
    if len(non_normal_pts) > 15:
        print(f"  ... and {len(non_normal_pts) - 15} more non-normal points")

# Let's also check November 10, 11, 12, 13, 14, 15 for both inverters
print("\n" + "="*90)
print("          SCANNING ALL DAYS (NOV 08 - 17) FOR INVERTER FAULT BIT REGISTERS")
print("="*90)

all_days = ["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"]

for inv_sn in [inv1_sn, inv2_sn]:
    print(f"\nInverter {inv_sn}:")
    for day in all_days:
        res = solis_post("/api/chart/inverter/day/v2", {"sn": inv_sn, "time": day, "timeZone": 5})
        d = res.get("data", {})
        times = d.get("timeStr", [])
        states = d.get("state", [])
        fault_bits = d.get("fault_bit_list", [])
        alarm_counts = d.get("alarm_count", [])

        faulty = []
        for i, t in enumerate(times):
            fb = fault_bits[i] if i < len(fault_bits) else ""
            st = states[i] if i < len(states) else 0
            ac = alarm_counts[i] if i < len(alarm_counts) else 0
            if fb != "0000,0000,0000,0000,0000,0000,0000,0000" or ac > 0 or st != 1:
                faulty.append((t, st, ac, fb))

        first_st = states[0] if states else "N/A"
        last_st = states[-1] if states else "N/A"
        print(f"  {day} | Total Pts: {len(times):3d} | Abnormal Pts: {len(faulty):3d} | State range: {first_st} to {last_st}")
        if faulty:
            print(f"      First abnormal point: {faulty[0]}")
            if len(faulty) > 1:
                print(f"      Last abnormal point:  {faulty[-1]}")


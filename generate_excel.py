"""
Professional Excel Generator for SolisCloud Historical Energy Telemetry
Reads temp_historical_data.json and produces a styled .xlsx spreadsheet
Sheet 1: 'Daily Energy (6 Columns)'
Sheet 2: 'Monthly Table'
"""

import json
import os
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

def build_excel():
    json_path = os.path.join(os.path.dirname(__file__), "temp_historical_data.json")
    if not os.path.exists(json_path):
        print("JSON data file not found:", json_path)
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    wb = Workbook()

    # Define professional styles
    font_title = Font(name="Calibri", size=13, bold=True, color="1F497D")
    font_subtitle = Font(name="Calibri", size=10, italic=True, color="595959")
    font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    font_section = Font(name="Calibri", size=11, bold=True, color="1F497D")
    font_bold = Font(name="Calibri", size=11, bold=True)
    font_regular = Font(name="Calibri", size=11)

    fill_header = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    fill_subtotal = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    fill_zebra = PatternFill(start_color="F9FAFB", end_color="F9FAFB", fill_type="solid")

    thin_border_side = Side(border_style="thin", color="D3D3D3")
    border_cell = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    
    border_total = Border(
        top=Side(border_style="thin", color="000000"),
        bottom=Side(border_style="double", color="000000"),
        left=thin_border_side,
        right=thin_border_side
    )

    align_center = Alignment(horizontal="center", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")

    num_format_kwh = "#,##0.0"
    num_format_mwh = "#,##0.000"

    station_name = data.get("stationName", "Menu Karachi Office").upper()
    capacity_val = data.get("capacityKwp", 80.0)

    # ==========================================
    # SHEET 1: Daily Energy (6 Columns + Date)
    # ==========================================
    ws_daily = wb.active
    ws_daily.title = "Daily Energy (6 Columns)"
    ws_daily.views.sheetView[0].showGridLines = True

    # Title block
    ws_daily["A1"] = f"SOLISCLOUD HISTORICAL DAILY ENERGY REPORT — {station_name} ({capacity_val} kWp)"
    ws_daily["A1"].font = font_title
    ws_daily["A2"] = "Complete Inception-to-Date Energy Data (July 2026 – November 2026) | All values in Kilowatt-Hours (kWh)"
    ws_daily["A2"].font = font_subtitle

    headers_daily = [
        "Date",
        "PV (kWh)",
        "Import (kWh)",
        "Export (kWh)",
        "Charge (kWh)",
        "Discharge (kWh)",
        "Consumption (kWh)",
    ]

    header_row_daily = 4
    for col_idx, h in enumerate(headers_daily, 1):
        cell = ws_daily.cell(row=header_row_daily, column=col_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = border_cell

    records = data.get("dailyRecords", [])
    row_start_daily = header_row_daily + 1

    for i, r in enumerate(records):
        curr_row = row_start_daily + i
        c_date = ws_daily.cell(row=curr_row, column=1, value=r["date"])
        c_date.alignment = align_center
        c_date.font = font_regular
        c_date.border = border_cell

        values = [
            r["pv_kwh"],
            r["import_kwh"],
            r["export_kwh"],
            r["charge_kwh"],
            r["discharge_kwh"],
            r["consumption_kwh"],
        ]

        for col_idx, val in enumerate(values, 2):
            c = ws_daily.cell(row=curr_row, column=col_idx, value=round(val, 1))
            c.font = font_regular
            c.alignment = align_right
            c.number_format = num_format_kwh
            c.border = border_cell

        if i % 2 == 1:
            for c_i in range(1, 8):
                ws_daily.cell(row=curr_row, column=c_i).fill = fill_zebra

    row_end_daily = row_start_daily + len(records) - 1
    total_row_daily = row_end_daily + 1

    # Daily Total Row with SUM formulas
    c_tot_label = ws_daily.cell(row=total_row_daily, column=1, value="TOTAL (kWh)")
    c_tot_label.font = font_bold
    c_tot_label.alignment = align_center
    c_tot_label.fill = fill_subtotal
    c_tot_label.border = border_total

    cols_letters = ["B", "C", "D", "E", "F", "G"]
    for col_idx, letter in enumerate(cols_letters, 2):
        cell = ws_daily.cell(row=total_row_daily, column=col_idx)
        cell.value = f"=SUM({letter}{row_start_daily}:{letter}{row_end_daily})"
        cell.font = font_bold
        cell.alignment = align_right
        cell.number_format = num_format_kwh
        cell.fill = fill_subtotal
        cell.border = border_total

    # ==========================================
    # SHEET 2: Monthly Table
    # ==========================================
    ws_month = wb.create_sheet(title="Monthly Table")
    ws_month.views.sheetView[0].showGridLines = True

    # Title block
    ws_month["A1"] = f"SOLISCLOUD MONTHLY ENERGY TABLE — {station_name} ({capacity_val} kWp)"
    ws_month["A1"].font = font_title
    ws_month["A2"] = "Historical Monthly Aggregates (July 2026 – November 2026) | 6 Core Telemetry Columns"
    ws_month["A2"].font = font_subtitle

    # Section 1: Exact 6 Columns (kWh)
    headers_month_6col = [
        "Month",
        "PV (kWh)",
        "Import (kWh)",
        "Export (kWh)",
        "Charge (kWh)",
        "Discharge (kWh)",
        "Consumption (kWh)",
    ]

    m_header_row = 4
    for col_idx, h in enumerate(headers_month_6col, 1):
        cell = ws_month.cell(row=m_header_row, column=col_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = border_cell

    summaries = data.get("monthlySummaries", [])
    m_start = m_header_row + 1

    for i, s in enumerate(summaries):
        curr_row = m_start + i
        
        # Month
        c1 = ws_month.cell(row=curr_row, column=1, value=s["month"])
        c1.alignment = align_center
        c1.font = font_regular
        c1.border = border_cell

        m_vals = [
            s["pv_kwh"],
            s["import_kwh"],
            s["export_kwh"],
            s["charge_kwh"],
            s["discharge_kwh"],
            s["consumption_kwh"],
        ]

        for col_idx, val in enumerate(m_vals, 2):
            c = ws_month.cell(row=curr_row, column=col_idx, value=round(val, 1))
            c.font = font_regular
            c.alignment = align_right
            c.number_format = num_format_kwh
            c.border = border_cell

        if i % 2 == 1:
            for c_i in range(1, 8):
                ws_month.cell(row=curr_row, column=c_i).fill = fill_zebra

    m_end = m_start + len(summaries) - 1
    m_tot_row = m_end + 1

    # Monthly Grand Total Row (kWh)
    c_m_tot = ws_month.cell(row=m_tot_row, column=1, value="GRAND TOTAL (kWh)")
    c_m_tot.font = font_bold
    c_m_tot.alignment = align_center
    c_m_tot.fill = fill_subtotal
    c_m_tot.border = border_total

    for col_idx, letter in enumerate(cols_letters, 2):
        cell = ws_month.cell(row=m_tot_row, column=col_idx)
        cell.value = f"=SUM({letter}{m_start}:{letter}{m_end})"
        cell.font = font_bold
        cell.alignment = align_right
        cell.fill = fill_subtotal
        cell.border = border_total
        cell.number_format = num_format_kwh

    # Section 2: MWh Equivalent Breakdown (6 Columns + Days)
    sec2_title_row = m_tot_row + 3
    ws_month.cell(row=sec2_title_row, column=1, value="MONTHLY ENERGY TOTALS IN MEGAWATT-HOURS (MWh EQUIVALENT)").font = font_section

    headers_month_mwh = [
        "Month",
        "Days Recorded",
        "PV (MWh)",
        "Import (MWh)",
        "Export (MWh)",
        "Charge (MWh)",
        "Discharge (MWh)",
        "Consumption (MWh)",
    ]

    mwh_header_row = sec2_title_row + 1
    for col_idx, h in enumerate(headers_month_mwh, 1):
        cell = ws_month.cell(row=mwh_header_row, column=col_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = border_cell

    mwh_start = mwh_header_row + 1
    for i, s in enumerate(summaries):
        curr_row = mwh_start + i

        # Month
        c1 = ws_month.cell(row=curr_row, column=1, value=s["month"])
        c1.alignment = align_center
        c1.font = font_regular
        c1.border = border_cell

        # Days
        c2 = ws_month.cell(row=curr_row, column=2, value=s["days"])
        c2.alignment = align_center
        c2.font = font_regular
        c2.border = border_cell

        mwh_vals = [
            round(s["pv_kwh"] / 1000.0, 3),
            round(s["import_kwh"] / 1000.0, 3),
            round(s["export_kwh"] / 1000.0, 3),
            round(s["charge_kwh"] / 1000.0, 3),
            round(s["discharge_kwh"] / 1000.0, 3),
            round(s["consumption_kwh"] / 1000.0, 3),
        ]

        for col_idx, val in enumerate(mwh_vals, 3):
            c = ws_month.cell(row=curr_row, column=col_idx, value=val)
            c.font = font_regular
            c.alignment = align_right
            c.number_format = num_format_mwh
            c.border = border_cell

        if i % 2 == 1:
            for c_i in range(1, 9):
                ws_month.cell(row=curr_row, column=c_i).fill = fill_zebra

    mwh_end = mwh_start + len(summaries) - 1
    mwh_tot_row = mwh_end + 1

    # MWh Grand Total Row
    c_mwh_tot = ws_month.cell(row=mwh_tot_row, column=1, value="GRAND TOTAL (MWh)")
    c_mwh_tot.font = font_bold
    c_mwh_tot.alignment = align_center
    c_mwh_tot.fill = fill_subtotal
    c_mwh_tot.border = border_total

    c_mwh_days = ws_month.cell(row=mwh_tot_row, column=2, value=f"=SUM(B{mwh_start}:B{mwh_end})")
    c_mwh_days.font = font_bold
    c_mwh_days.alignment = align_center
    c_mwh_days.fill = fill_subtotal
    c_mwh_days.border = border_total

    mwh_cols = ["C", "D", "E", "F", "G", "H"]
    for col_idx, letter in enumerate(mwh_cols, 3):
        cell = ws_month.cell(row=mwh_tot_row, column=col_idx)
        cell.value = f"=SUM({letter}{mwh_start}:{letter}{mwh_end})"
        cell.font = font_bold
        cell.alignment = align_right
        cell.fill = fill_subtotal
        cell.border = border_total
        cell.number_format = num_format_mwh

    # Auto-adjust column widths
    for sheet in [ws_daily, ws_month]:
        for col in sheet.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            sheet.column_dimensions[col_letter].width = max(max_len + 4, 15)

    out_path = os.path.join(os.path.dirname(__file__), "solis_historical_energy_data.xlsx")
    wb.save(out_path)
    print(f"[EXCEL] Successfully created professional Excel spreadsheet: {out_path}")

if __name__ == "__main__":
    build_excel()

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { pool } from "@/lib/db";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Maximum allowed serverless duration

export async function GET(request: NextRequest) {
  // 1. Authenticate the Cron trigger (Vercel provides CRON_SECRET header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const recipientEmails = process.env.REPORT_RECIPIENT_EMAILS || "";
  const senderEmail = process.env.REPORT_SENDER_EMAIL || "onboarding@resend.dev";

  if (!resendApiKey) {
    return NextResponse.json(
      { success: false, error: "RESEND_API_KEY is not configured in environment variables." },
      { status: 500 }
    );
  }

  if (!recipientEmails) {
    return NextResponse.json(
      { success: false, error: "REPORT_RECIPIENT_EMAILS is not configured in environment variables." },
      { status: 500 }
    );
  }

  try {
    // 2. Determine target date (Defaults to yesterday's date in PKT when running at 00:00/00:15 AM PKT)
    const nowPkt = new Date(Date.now() + 5 * 3600 * 1000);
    // If run between 00:00 and 03:00 AM, target yesterday's full day summary
    const targetDateObj = new Date(nowPkt.getTime() - (nowPkt.getUTCHours() < 4 ? 24 * 3600 * 1000 : 0));
    const reportDate = targetDateObj.toISOString().slice(0, 10);

    // 3. Query all plants' energy data for the report date
    const result = await pool.query(`
      SELECT 
        d.station_id,
        COALESCE(MAX(l.station_name), d.station_id) AS plant_name,
        COALESCE(MAX(l.installed_capacity_kw), 50.0) AS capacity_kwp,
        SUM(COALESCE(d.solar_pv_kwh, 0)) AS period_yield_kwh,
        SUM(COALESCE(d.battery_charge_kwh, 0)) AS battery_charge_kwh,
        SUM(COALESCE(d.battery_discharge_kwh, 0)) AS battery_discharge_kwh,
        SUM(COALESCE(d.house_load_kwh, 0)) AS house_load_kwh,
        SUM(COALESCE(d.grid_sold_kwh, 0)) AS grid_sold_kwh,
        SUM(COALESCE(d.grid_purchased_kwh, 0)) AS grid_purchased_kwh
      FROM solis_daily_energy d
      LEFT JOIN solis_telemetry_latest l ON l.station_id = d.station_id
      WHERE d.energy_date = $1::date
      GROUP BY d.station_id
      ORDER BY period_yield_kwh DESC
    `, [reportDate]);

    const rows = result.rows || [];

    // Calculate totals
    const totals = rows.reduce(
      (acc, r) => ({
        yieldKwh: acc.yieldKwh + Number(r.period_yield_kwh || 0),
        chargeKwh: acc.chargeKwh + Number(r.battery_charge_kwh || 0),
        dischargeKwh: acc.dischargeKwh + Number(r.battery_discharge_kwh || 0),
        loadKwh: acc.loadKwh + Number(r.house_load_kwh || 0),
        exportKwh: acc.exportKwh + Number(r.grid_sold_kwh || 0),
        importKwh: acc.importKwh + Number(r.grid_purchased_kwh || 0),
      }),
      { yieldKwh: 0, chargeKwh: 0, dischargeKwh: 0, loadKwh: 0, exportKwh: 0, importKwh: 0 }
    );

    // 4. Generate Excel Attachment in-memory
    const excelRows = rows.map((r) => ({
      "Station ID": r.station_id,
      "Plant Name": r.plant_name,
      "Capacity (kWp)": Number(r.capacity_kwp || 0).toFixed(1),
      "Day Yield (kWh)": Number(r.period_yield_kwh || 0).toFixed(1),
      "Charge (kWh)": Number(r.battery_charge_kwh || 0).toFixed(1),
      "Discharge (kWh)": Number(r.battery_discharge_kwh || 0).toFixed(1),
      "Consumption (kWh)": Number(r.house_load_kwh || 0).toFixed(1),
      "Grid Export (kWh)": Number(r.grid_sold_kwh || 0).toFixed(1),
      "Grid Import (kWh)": Number(r.grid_purchased_kwh || 0).toFixed(1),
    }));

    // Add total row
    excelRows.push({
      "Station ID": "TOTAL",
      "Plant Name": "Fleet Total",
      "Capacity (kWp)": "-",
      "Day Yield (kWh)": totals.yieldKwh.toFixed(1),
      "Charge (kWh)": totals.chargeKwh.toFixed(1),
      "Discharge (kWh)": totals.dischargeKwh.toFixed(1),
      "Consumption (kWh)": totals.loadKwh.toFixed(1),
      "Grid Export (kWh)": totals.exportKwh.toFixed(1),
      "Grid Import (kWh)": totals.importKwh.toFixed(1),
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Plant Report");
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 5. Construct Beautiful Modern HTML Email
    const tableRowsHtml = rows
      .map(
        (r) => `
        <tr style="border-bottom: 1px solid #f1f5f9; text-align: right;">
          <td style="padding: 10px 12px; text-align: left; font-weight: 600; color: #1e293b;">${r.plant_name}</td>
          <td style="padding: 10px 12px; color: #64748b;">${Number(r.capacity_kwp || 0).toFixed(1)} kWp</td>
          <td style="padding: 10px 12px; font-weight: 700; color: #ca8a04;">${Number(r.period_yield_kwh || 0).toFixed(1)} kWh</td>
          <td style="padding: 10px 12px; color: #15803d;">${Number(r.battery_charge_kwh || 0).toFixed(1)} kWh</td>
          <td style="padding: 10px 12px; color: #0d9488;">${Number(r.battery_discharge_kwh || 0).toFixed(1)} kWh</td>
          <td style="padding: 10px 12px; color: #7c3aed;">${Number(r.house_load_kwh || 0).toFixed(1)} kWh</td>
          <td style="padding: 10px 12px; color: #0284c7;">${Number(r.grid_sold_kwh || 0).toFixed(1)} kWh</td>
          <td style="padding: 10px 12px; color: #0284c7;">${Number(r.grid_purchased_kwh || 0).toFixed(1)} kWh</td>
        </tr>`
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { background: #0f172a; padding: 24px 32px; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
            .header p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
            .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 24px 32px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
            .kpi-card { background: #ffffff; padding: 14px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .kpi-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
            .kpi-val { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
            .content { padding: 24px 32px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
            th { background: #f1f5f9; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; text-align: right; }
            th:first-child { text-align: left; }
            .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>P2G-CLOUD — Daily Plant Telemetry Report</h1>
              <p>Generated for: <strong>${reportDate}</strong> &bull; Total Plants Monitored: <strong>${rows.length}</strong></p>
            </div>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-title" style="color: #b45309;">Total Solar Yield (PV)</div>
                <div class="kpi-val" style="color: #ca8a04;">${totals.yieldKwh.toFixed(1)} <span style="font-size: 12px; font-weight: 500;">kWh</span></div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title" style="color: #15803d;">Total Battery Charge</div>
                <div class="kpi-val" style="color: #15803d;">${totals.chargeKwh.toFixed(1)} <span style="font-size: 12px; font-weight: 500;">kWh</span></div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title" style="color: #7c3aed;">Total Facility Load</div>
                <div class="kpi-val" style="color: #7c3aed;">${totals.loadKwh.toFixed(1)} <span style="font-size: 12px; font-weight: 500;">kWh</span></div>
              </div>
            </div>

            <div class="content">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a;">Plant Telemetry Breakdown</h3>
              <table>
                <thead>
                  <tr>
                    <th>Plant Name</th>
                    <th>Capacity</th>
                    <th>Yield (PV)</th>
                    <th>Charge</th>
                    <th>Discharge</th>
                    <th>Load</th>
                    <th>Export</th>
                    <th>Import</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                  <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #cbd5e1; text-align: right;">
                    <td style="padding: 12px; text-align: left; color: #0f172a;">Fleet Total</td>
                    <td style="padding: 12px; color: #64748b;">-</td>
                    <td style="padding: 12px; color: #ca8a04;">${totals.yieldKwh.toFixed(1)} kWh</td>
                    <td style="padding: 12px; color: #15803d;">${totals.chargeKwh.toFixed(1)} kWh</td>
                    <td style="padding: 12px; color: #0d9488;">${totals.dischargeKwh.toFixed(1)} kWh</td>
                    <td style="padding: 12px; color: #7c3aed;">${totals.loadKwh.toFixed(1)} kWh</td>
                    <td style="padding: 12px; color: #0284c7;">${totals.exportKwh.toFixed(1)} kWh</td>
                    <td style="padding: 12px; color: #0284c7;">${totals.importKwh.toFixed(1)} kWh</td>
                  </tr>
                </tbody>
              </table>
              <p style="margin-top: 18px; font-size: 12px; color: #64748b;">
                * The full Excel breakdown report for <strong>${reportDate}</strong> is attached to this email.
              </p>
            </div>

            <div class="footer">
              Sent automatically by P2G-CLOUD Automated Dispatch Engine &bull; System Time: ${nowPkt.toISOString()}
            </div>
          </div>
        </body>
      </html>
    `;

    // 6. Send email via Resend
    const resend = new Resend(resendApiKey);
    const toList = recipientEmails.split(",").map((email) => email.trim()).filter(Boolean);

    const emailResponse = await resend.emails.send({
      from: `P2G-CLOUD <${senderEmail}>`,
      to: toList,
      subject: `[P2G-CLOUD] Daily Plants Report - ${reportDate}`,
      html: emailHtml,
      attachments: [
        {
          filename: `P2G_CLOUD_Daily_Report_${reportDate}.xlsx`,
          content: excelBuffer,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      reportDate,
      plantsCount: rows.length,
      recipients: toList,
      emailResponse,
    });
  } catch (error: any) {
    console.error("Daily report cron error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate or send daily report." },
      { status: 500 }
    );
  }
}

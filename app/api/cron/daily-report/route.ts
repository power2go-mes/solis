import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Pool } from "pg";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    "postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60s for PDF compilation and email dispatch

export async function GET(request: NextRequest) {
  try {
    // 1. Determine target date (Always Yesterday in PKT when running in the morning)
    const nowPkt = new Date(Date.now() + 5 * 3600 * 1000);
    const yesterdayDateObj = new Date(nowPkt.getTime() - 24 * 3600 * 1000);
    const reportDate = yesterdayDateObj.toISOString().slice(0, 10);

    // 2. Query yesterday's energy metrics for all plants
    const result = await pool.query(`
      SELECT 
        p.id AS station_id,
        p.station_name,
        p.capacity_kwp,
        COALESCE(e.solar_pv_kwh, 0) AS yield_kwh,
        COALESCE(e.battery_charge_kwh, 0) AS charge_kwh,
        COALESCE(e.battery_discharge_kwh, 0) AS discharge_kwh,
        COALESCE(e.house_load_kwh, 0) AS consumption_kwh,
        COALESCE(e.grid_sold_kwh, 0) AS export_kwh,
        COALESCE(e.grid_purchased_kwh, 0) AS import_kwh
      FROM (
        SELECT 
          station_id AS id, 
          station_name, 
          COALESCE(installed_capacity_kw, 50.0) AS capacity_kwp
        FROM solis_telemetry_latest
      ) p
      LEFT JOIN solis_daily_energy e 
        ON e.station_id = p.id AND e.energy_date = $1::date
      ORDER BY yield_kwh DESC, p.station_name ASC;
    `, [reportDate]);

    const rows = result.rows || [];

    const totals = rows.reduce(
      (acc, r) => ({
        capacityKwp: acc.capacityKwp + Number(r.capacity_kwp || 0),
        yieldKwh: acc.yieldKwh + Number(r.yield_kwh || 0),
        chargeKwh: acc.chargeKwh + Number(r.charge_kwh || 0),
        dischargeKwh: acc.dischargeKwh + Number(r.discharge_kwh || 0),
        consumptionKwh: acc.consumptionKwh + Number(r.consumption_kwh || 0),
        exportKwh: acc.exportKwh + Number(r.export_kwh || 0),
        importKwh: acc.importKwh + Number(r.import_kwh || 0),
      }),
      { capacityKwp: 0, yieldKwh: 0, chargeKwh: 0, dischargeKwh: 0, consumptionKwh: 0, exportKwh: 0, importKwh: 0 }
    );

    // 3. Generate Landscape A4 PDF Report in-memory
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Emerald Header Banner
    doc.setFillColor(16, 122, 67);
    doc.rect(0, 0, pageWidth, 22, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("P2G-CLOUD Plant Performance Report", 14, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Automated Telemetry & Generation, Battery Storage, Consumption & Grid Energy Breakdown", 14, 17);

    // Metadata Row
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Filter Period: DAY | Report Date: ${reportDate}`, 14, 29);
    doc.text(`Fleet Capacity: ${Math.round(totals.capacityKwp)} kWp | Total Plants: ${rows.length}`, 14, 34);
    doc.text(`Generated At: ${nowPkt.toISOString().replace("T", " ").slice(0, 19)} PKT`, pageWidth - 14, 29, { align: "right" });

    // Table
    const tableHeaders = [
      ["Plant Name", "Capacity", "Day Yield", "Charge", "Discharge", "Consumption", "Grid Export", "Grid Import"]
    ];

    const tableBody = rows.map((r) => [
      r.station_name,
      `${Math.round(Number(r.capacity_kwp || 0))} kWp`,
      `${Math.round(Number(r.yield_kwh || 0))} kWh`,
      `${Math.round(Number(r.charge_kwh || 0))} kWh`,
      `${Math.round(Number(r.discharge_kwh || 0))} kWh`,
      `${Math.round(Number(r.consumption_kwh || 0))} kWh`,
      `${Math.round(Number(r.export_kwh || 0))} kWh`,
      `${Math.round(Number(r.import_kwh || 0))} kWh`,
    ]);

    // Footer Total
    tableBody.push([
      "Fleet Total",
      `${Math.round(totals.capacityKwp)} kWp`,
      `${Math.round(totals.yieldKwh)} kWh`,
      `${Math.round(totals.chargeKwh)} kWh`,
      `${Math.round(totals.dischargeKwh)} kWh`,
      `${Math.round(totals.consumptionKwh)} kWh`,
      `${Math.round(totals.exportKwh)} kWh`,
      `${Math.round(totals.importKwh)} kWh`,
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 38,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
        valign: "middle",
      },
      headStyles: {
        fillColor: [16, 122, 67],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "right",
      },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        1: { halign: "right" },
        2: { halign: "right", fontStyle: "bold", textColor: [180, 83, 9] },
        3: { halign: "right", textColor: [21, 128, 61] },
        4: { halign: "right", textColor: [13, 148, 136] },
        5: { halign: "right", textColor: [124, 58, 237] },
        6: { halign: "right", textColor: [2, 132, 199] },
        7: { halign: "right", textColor: [71, 85, 105] },
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 14, right: 14 },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // 4. Configure Direct Gmail SMTP Transporter
    const smtpUser = process.env.GMAIL_USER || "abdullahrashid13674533@gmail.com";
    const smtpPass = process.env.GMAIL_APP_PASSWORD || "izgavakmlqriuhxg";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const recipients = (process.env.DAILY_REPORT_RECIPIENTS || "Sminhalhaiderk@gmail.com,mes@power2go.energy")
      .split(",")
      .map(e => e.trim())
      .filter(Boolean);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background: #107a43; padding: 20px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px;">Power2Go Energy — Daily Plant Performance Report</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #dcfce7;">Autonomous NOC Telemetry & Energy Breakdown</p>
        </div>
        <div style="padding: 20px; color: #1e293b; font-size: 13px; line-height: 1.6;">
          <p>Dear Minhal,</p>
          <p>Please find attached the official <strong>P2G-CLOUD Daily Plant Performance Report (PDF)</strong> for yesterday (<strong>${reportDate}</strong>).</p>
          <p>This report includes complete solar yield (PV), battery storage charging, discharging, facility load, and grid export/import for all monitored solar plants.</p>
          <div style="background: #f8fafc; border-left: 4px solid #107a43; padding: 10px 14px; margin: 16px 0;">
            <strong>Attached PDF:</strong> P2G_CLOUD_Plant_Report_Yesterday_${reportDate}.pdf
          </div>
        </div>
        <div style="background: #f8fafc; padding: 12px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
          Sent automatically by Power2Go Solar NOC • Continuous 24/7 Cloud Monitoring
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Power2Go NOC" <${smtpUser}>`,
      to: recipients,
      subject: `📄 [P2G-CLOUD] Daily Plant Performance Report (Yesterday - ${reportDate})`,
      html: emailHtml,
      attachments: [
        {
          filename: `P2G_CLOUD_Plant_Report_Yesterday_${reportDate}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log(`[Cloud Cron Success] Report sent for ${reportDate}:`, info.messageId);

    return NextResponse.json({
      success: true,
      reportDate,
      messageId: info.messageId,
      recipients,
    });
  } catch (error: any) {
    console.error("[Cloud Cron Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const { Pool } = require('pg');
const { Resend } = require('resend');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const resend = new Resend(process.env.RESEND_API_KEY || '');

async function sendAllPlantsExportReport() {
  try {
    const nowPkt = new Date(Date.now() + 5 * 3600 * 1000);
    const todayDateStr = nowPkt.toISOString().slice(0, 10);

    // Query all plants and today's energy metrics
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
        COALESCE(e.grid_purchased_kwh, 0) AS import_kwh,
        COALESCE(e.self_consumption_kwh, 0) AS self_consumption_kwh
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
    `, [todayDateStr]);

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

    // 1. Build PDF in-memory (Landscape A4 matching Dashboard styling)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Top Header Banner
    doc.setFillColor(16, 122, 67); // P2G Emerald Green
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('P2G-CLOUD Plant Performance & Export Report', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Automated Generation, Battery Energy, Consumption & Grid Telemetry Breakdown', 14, 17);

    // Metadata Subheader
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Period: Day | Report Date: ${todayDateStr}`, 14, 28);
    doc.text(`Fleet Capacity: ${Math.round(totals.capacityKwp)} kWp | Total Plants: ${rows.length}`, 14, 33);
    doc.text(`Generated at: ${nowPkt.toISOString().replace('T', ' ').slice(0, 19)} PKT`, pageWidth - 14, 28, { align: 'right' });

    // Table Data
    const tableHeaders = [
      ['Plant Name', 'Capacity (kWp)', 'Yield (kWh)', 'Charge (kWh)', 'Discharge (kWh)', 'Consumption (kWh)', 'Grid Export (kWh)', 'Grid Import (kWh)']
    ];

    const tableBody = rows.map(r => [
      r.station_name,
      `${Math.round(Number(r.capacity_kwp || 0))} kWp`,
      `${Math.round(Number(r.yield_kwh || 0))} kWh`,
      `${Math.round(Number(r.charge_kwh || 0))} kWh`,
      `${Math.round(Number(r.discharge_kwh || 0))} kWh`,
      `${Math.round(Number(r.consumption_kwh || 0))} kWh`,
      `${Math.round(Number(r.export_kwh || 0))} kWh`,
      `${Math.round(Number(r.import_kwh || 0))} kWh`,
    ]);

    // Footer Total Row
    tableBody.push([
      'Fleet Total',
      `${Math.round(totals.capacityKwp)} kWp`,
      `${Math.round(totals.yieldKwh)} kWh`,
      `${Math.round(totals.chargeKwh)} kWh`,
      `${Math.round(totals.dischargeKwh)} kWh`,
      `${Math.round(totals.consumptionKwh)} kWh`,
      `${Math.round(totals.exportKwh)} kWh`,
      `${Math.round(totals.importKwh)} kWh`,
    ]);

    autoTable.default(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 38,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [16, 122, 67],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'right',
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] },
        3: { halign: 'right', textColor: [21, 128, 61] },
        4: { halign: 'right', textColor: [13, 148, 136] },
        5: { halign: 'right', textColor: [124, 58, 237] },
        6: { halign: 'right', textColor: [2, 132, 199] },
        7: { halign: 'right', textColor: [71, 85, 105] },
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // 2. Build Excel Attachment in-memory
    const excelRows = rows.map(r => ({
      'Station ID': r.station_id,
      'Plant Name': r.station_name,
      'Capacity (kWp)': Math.round(Number(r.capacity_kwp || 0)),
      'Day Yield (kWh)': Math.round(Number(r.yield_kwh || 0)),
      'Charge (kWh)': Math.round(Number(r.charge_kwh || 0)),
      'Discharge (kWh)': Math.round(Number(r.discharge_kwh || 0)),
      'Consumption (kWh)': Math.round(Number(r.consumption_kwh || 0)),
      'Grid Export (kWh)': Math.round(Number(r.export_kwh || 0)),
      'Grid Import (kWh)': Math.round(Number(r.import_kwh || 0)),
    }));

    excelRows.push({
      'Station ID': 'TOTAL',
      'Plant Name': 'Fleet Total',
      'Capacity (kWp)': Math.round(totals.capacityKwp),
      'Day Yield (kWh)': Math.round(totals.yieldKwh),
      'Charge (kWh)': Math.round(totals.chargeKwh),
      'Discharge (kWh)': Math.round(totals.dischargeKwh),
      'Consumption (kWh)': Math.round(totals.consumptionKwh),
      'Grid Export (kWh)': Math.round(totals.exportKwh),
      'Grid Import (kWh)': Math.round(totals.importKwh),
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Plants Export');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 3. Email HTML body
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #107a43; padding: 22px 28px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Power2Go — Complete Plant Performance Export Report</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #dcfce7;">Fleet Overview & Telemetry Breakdown &bull; Date: <strong>${todayDateStr}</strong></p>
        </div>

        <div style="padding: 24px 28px;">
          <!-- KPI Summary Grid -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-bottom: 24px;">
            <tr>
              <td style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px; text-align: center; width: 25%;">
                <div style="font-size: 11px; font-weight: 700; color: #854d0e; text-transform: uppercase;">Total Solar Yield</div>
                <div style="font-size: 22px; font-weight: 800; color: #ca8a04; margin-top: 4px;">${Math.round(totals.yieldKwh)} <span style="font-size: 12px;">kWh</span></div>
              </td>
              <td style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; text-align: center; width: 25%;">
                <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">Battery Charge</div>
                <div style="font-size: 22px; font-weight: 800; color: #15803d; margin-top: 4px;">${Math.round(totals.chargeKwh)} <span style="font-size: 12px;">kWh</span></div>
              </td>
              <td style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 14px; text-align: center; width: 25%;">
                <div style="font-size: 11px; font-weight: 700; color: #5b21b6; text-transform: uppercase;">Facility Load</div>
                <div style="font-size: 22px; font-weight: 800; color: #7c3aed; margin-top: 4px;">${Math.round(totals.consumptionKwh)} <span style="font-size: 12px;">kWh</span></div>
              </td>
              <td style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px; text-align: center; width: 25%;">
                <div style="font-size: 11px; font-weight: 700; color: #075985; text-transform: uppercase;">Grid Export</div>
                <div style="font-size: 22px; font-weight: 800; color: #0284c7; margin-top: 4px;">${Math.round(totals.exportKwh)} <span style="font-size: 12px;">kWh</span></div>
              </td>
            </tr>
          </table>

          <!-- Plants Telemetry Table -->
          <h3 style="margin: 0 0 12px; font-size: 15px; color: #0f172a;">All Plants Telemetry Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: right; color: #475569;">
                <th style="padding: 10px 12px; text-align: left;">Plant Name</th>
                <th style="padding: 10px 12px;">Capacity</th>
                <th style="padding: 10px 12px; color: #854d0e;">Yield</th>
                <th style="padding: 10px 12px; color: #166534;">Charge</th>
                <th style="padding: 10px 12px; color: #0f766e;">Discharge</th>
                <th style="padding: 10px 12px; color: #5b21b6;">Load</th>
                <th style="padding: 10px 12px; color: #0369a1;">Export</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr style="border-bottom: 1px solid #f1f5f9; text-align: right;">
                  <td style="padding: 9px 12px; text-align: left; font-weight: 600; color: #1e293b;">${r.station_name}</td>
                  <td style="padding: 9px 12px; color: #64748b;">${Math.round(Number(r.capacity_kwp || 0))} kWp</td>
                  <td style="padding: 9px 12px; font-weight: 700; color: #ca8a04;">${Math.round(Number(r.yield_kwh || 0))} kWh</td>
                  <td style="padding: 9px 12px; color: #15803d;">${Math.round(Number(r.charge_kwh || 0))} kWh</td>
                  <td style="padding: 9px 12px; color: #0d9488;">${Math.round(Number(r.discharge_kwh || 0))} kWh</td>
                  <td style="padding: 9px 12px; color: #7c3aed;">${Math.round(Number(r.consumption_kwh || 0))} kWh</td>
                  <td style="padding: 9px 12px; color: #0284c7;">${Math.round(Number(r.export_kwh || 0))} kWh</td>
                </tr>
              `).join('')}
              <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1; text-align: right; color: #0f172a;">
                <td style="padding: 11px 12px; text-align: left;">Fleet Total</td>
                <td style="padding: 11px 12px; color: #64748b;">${Math.round(totals.capacityKwp)} kWp</td>
                <td style="padding: 11px 12px; color: #ca8a04;">${Math.round(totals.yieldKwh)} kWh</td>
                <td style="padding: 11px 12px; color: #15803d;">${Math.round(totals.chargeKwh)} kWh</td>
                <td style="padding: 11px 12px; color: #0d9488;">${Math.round(totals.dischargeKwh)} kWh</td>
                <td style="padding: 11px 12px; color: #7c3aed;">${Math.round(totals.consumptionKwh)} kWh</td>
                <td style="padding: 11px 12px; color: #0284c7;">${Math.round(totals.exportKwh)} kWh</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569;">
            📎 <strong>Attachment Included:</strong>
            <ul style="margin: 6px 0 0 16px; padding: 0;">
              <li><strong>P2G_Plant_Performance_Report_${todayDateStr}.pdf</strong> — High-resolution formatted PDF report for all plants.</li>
            </ul>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 14px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          Power2Go Energy Platform &bull; Automated Fleet Telemetry & Export Dispatch Engine
        </div>
      </div>
    `;

    // 4. Dispatch email with ONLY PDF attachment
    const { data, error } = await resend.emails.send({
      from: 'P2G-CLOUD <onboarding@resend.dev>',
      to: ['mes@power2go.energy'],
      subject: `📄 [P2G-CLOUD] Plant Performance Report (PDF) - ${todayDateStr}`,
      html: emailHtml,
      attachments: [
        {
          filename: `P2G_Plant_Performance_Report_${todayDateStr}.pdf`,
          content: pdfBuffer,
        }
      ]
    });

    if (error) {
      console.error('Email Dispatch Error:', error);
      process.exit(1);
    }

    console.log('SUCCESS_DISPATCH_MESSAGE_ID:', data.id);
    process.exit(0);
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  }
}

sendAllPlantsExportReport();

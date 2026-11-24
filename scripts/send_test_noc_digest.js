const { Pool } = require('pg');
const { Resend } = require('resend');

const pool = new Pool({
  connectionString: 'postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const resend = new Resend(process.env.RESEND_API_KEY || '');

async function testMorningDigest() {
  try {
    const plantsRes = await pool.query(`
      SELECT p.station_id, p.station_name, p.installed_capacity_kw, p.solar_power_kw, p.updated_at
      FROM solis_telemetry_latest p
      ORDER BY p.station_name ASC
    `);

    const incidentsRes = await pool.query(`
      SELECT severity, category, title, station_name, created_at
      FROM noc_incidents
      WHERE status IN ('OPEN', 'ACKNOWLEDGED')
      ORDER BY severity ASC, created_at DESC
    `);

    const totalPlants = plantsRes.rows.length;
    const nowPkt = new Date(Date.now() + 5 * 3600 * 1000);
    const dateStr = nowPkt.toISOString().slice(0, 10);

    const offlinePlants = plantsRes.rows.filter(p => {
      if (!p.updated_at) return true;
      const diffMins = (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60);
      return diffMins > 45;
    });

    const healthyPlantsCount = totalPlants - offlinePlants.length;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 20px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">Power2Go Solar NOC — Morning Health Digest</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Daily Operational Readiness Report | ${dateStr} 08:00 AM PKT</p>
        </div>

        <div style="padding: 24px;">
          <!-- KPI Summary Grid -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 24px;">
            <tr>
              <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; width: 33%;">
                <div style="font-size: 24px; font-weight: 800; color: #0f172a;">${totalPlants}</div>
                <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Plants</div>
              </td>
              <td style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; text-align: center; width: 33%;">
                <div style="font-size: 24px; font-weight: 800; color: #059669;">${healthyPlantsCount}</div>
                <div style="font-size: 11px; font-weight: 600; color: #047857; text-transform: uppercase;">Online / Healthy</div>
              </td>
              <td style="background: ${offlinePlants.length > 0 ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${offlinePlants.length > 0 ? '#fecaca' : '#e2e8f0'}; border-radius: 8px; padding: 14px; text-align: center; width: 33%;">
                <div style="font-size: 24px; font-weight: 800; color: ${offlinePlants.length > 0 ? '#dc2626' : '#0f172a'};">${offlinePlants.length}</div>
                <div style="font-size: 11px; font-weight: 600; color: ${offlinePlants.length > 0 ? '#b91c1c' : '#64748b'}; text-transform: uppercase;">Requiring Action</div>
              </td>
            </tr>
          </table>

          <!-- Offline / Action Required List -->
          ${offlinePlants.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.05em;">Sites Requiring Investigation</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left;">
                    <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Plant Name</th>
                    <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Capacity</th>
                    <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${offlinePlants.map(p => `
                    <tr>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${p.station_name}</td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${p.installed_capacity_kw || '-'} kWp</td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #dc2626; font-weight: 600;">Offline / Stale</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #047857; font-size: 13px; font-weight: 600; text-align: center; margin-bottom: 20px;">
              ✅ 100% Fleet Available — All inverters reporting telemetry smoothly.
            </div>
          `}

          <!-- Open NOC Incidents -->
          <div>
            <h4 style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Active Open Incidents (${incidentsRes.rows.length})</h4>
            ${incidentsRes.rows.length === 0 ? `
              <p style="font-size: 12px; color: #64748b; margin: 0;">No active P0/P1 incidents pending resolution.</p>
            ` : `
              <ul style="padding-left: 18px; margin: 0; font-size: 12px; color: #334155;">
                ${incidentsRes.rows.map(inc => `
                  <li style="margin-bottom: 6px;">
                    <strong>[${inc.severity}] ${inc.station_name}:</strong> ${inc.title}
                  </li>
                `).join('')}
              </ul>
            `}
          </div>
        </div>

        <div style="background: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
          Power2Go Energy Operations & Maintenance Center • Generated autonomously by P2G-CLOUD
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Power2Go NOC <onboarding@resend.dev>',
      to: ['mes@power2go.energy'],
      subject: `☀️ [TEST PREVIEW] Power2Go Solar NOC Morning Digest: ${healthyPlantsCount}/${totalPlants} Plants Online (${dateStr})`,
      html: emailHtml
    });

    if (error) {
      console.error('Send Error:', error);
      process.exit(1);
    }

    console.log('DIGEST_EMAIL_SENT_SUCCESS:', data.id);
    process.exit(0);
  } catch (err) {
    console.error('Fatal:', err);
    process.exit(1);
  }
}

testMorningDigest();

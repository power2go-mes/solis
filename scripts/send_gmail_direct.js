const fs = require('fs');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'abdullahrashid13674533@gmail.com',
    pass: 'izgavakmlqriuhxg'
  }
});

const pdfPath = 'C:\\Users\\izhar\\Downloads\\P2G_CLOUD_Plant_Report_Day_2026-11-23 (4).pdf';
const pdfBuffer = fs.readFileSync(pdfPath);

async function testGmailSend() {
  try {
    const info = await transporter.sendMail({
      from: '"Power2Go NOC" <abdullahrashid13674533@gmail.com>',
      to: 'Sminhalhaiderk@gmail.com',
      cc: 'mes@power2go.energy',
      subject: '📄 [P2G-CLOUD] Daily Plant Performance Report (Yesterday - 2026-11-22)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: #107a43; padding: 20px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 18px;">Power2Go Energy — Daily Plant Performance Report</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #dcfce7;">Autonomous NOC Telemetry & Energy Breakdown</p>
          </div>
          <div style="padding: 20px; color: #1e293b; font-size: 13px; line-height: 1.6;">
            <p>Dear Minhal,</p>
            <p>Please find attached the official <strong>P2G-CLOUD Daily Plant Performance Report</strong> for yesterday (<strong>2026-11-22</strong>).</p>
            <p>This report includes complete solar yield (PV), battery storage charging, discharging, facility load, and grid export/import for all monitored solar plants.</p>
            <div style="background: #f8fafc; border-left: 4px solid #107a43; padding: 10px 14px; margin: 16px 0;">
              <strong>Attached PDF:</strong> P2G_CLOUD_Plant_Report_Yesterday_2026-11-22.pdf
            </div>
          </div>
          <div style="background: #f8fafc; padding: 12px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
            Sent automatically by Power2Go Solar NOC • Continuous 24/7 Monitoring
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'P2G_CLOUD_Plant_Report_Yesterday_2026-11-22.pdf',
          content: pdfBuffer
        }
      ]
    });

    console.log('GMAIL_DELIVERED_SUCCESS:', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('GMAIL_ERROR:', err);
    process.exit(1);
  }
}

testGmailSend();

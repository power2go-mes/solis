const http = require("http");
const fs = require("fs");
const path = require("path");

const PLANTS = [
  { id: "1298491919450797504", name: "Menu Karachi Office", city: "Karachi" },
  { id: "1298491919450873747", name: "36 Chenab", city: "Lahore" },
  { id: "1298491919451014032", name: "Towfiq chinoy", city: "Karachi" },
  { id: "1298491919450958553", name: "OPL Residence", city: "Gharo" },
  { id: "1298491919450740581", name: "P2G 50KW", city: "Karachi" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw", city: "Karachi" },
  { id: "1298491919450851319", name: "P2G 20kw", city: "Karachi" },
  { id: "1298491919450734544", name: "P2G 15KW", city: "Karachi" },
];

const ENDPOINTS = [
  { name: "Day One Lifetime Energy Report (PDF)", path: "/api/reports/export-day-one", expectedType: "application/pdf", ext: ".pdf" },
  { name: "Daily Temperature Report & Graph (PDF)", path: "/api/reports/export-temperature", expectedType: "application/pdf", ext: ".pdf" },
  { name: "Daily Temperature Ledger (Excel)", path: "/api/reports/export-temperature-excel", expectedType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx" },
  { name: "Technical & Cell Forensic Audit (PDF)", path: "/api/reports/export-forensic-audit", expectedType: "application/pdf", ext: ".pdf" },
];

function testEndpoint(plant, ep) {
  return new Promise((resolve) => {
    const url = `http://localhost:3000${ep.path}?plantId=${plant.id}`;
    const t0 = Date.now();
    http.get(url, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const elapsed = Date.now() - t0;
        const buf = Buffer.concat(chunks);
        const contentType = res.headers["content-type"] || "";
        const contentDisp = res.headers["content-disposition"] || "";

        let validHeader = false;
        if (ep.ext === ".pdf") {
          validHeader = buf.slice(0, 5).toString("utf8") === "%PDF-";
        } else if (ep.ext === ".xlsx") {
          validHeader = buf.slice(0, 2).toString("hex") === "504b"; // PK ZIP header
        }

        resolve({
          plant: plant.name,
          plantId: plant.id,
          report: ep.name,
          status: res.statusCode,
          elapsedMs: elapsed,
          bytes: buf.length,
          contentType,
          contentDisp,
          validFileFormat: validHeader,
          hasData: buf.length > 5000,
        });
      });
    }).on("error", (err) => {
      resolve({
        plant: plant.name,
        plantId: plant.id,
        report: ep.name,
        status: "ERROR: " + err.message,
        elapsedMs: 0,
        bytes: 0,
        validFileFormat: false,
        hasData: false,
      });
    });
  });
}

async function runAudit() {
  console.log("==========================================================================");
  console.log("   POWER2GO-CLOUD FULL REPORT LOGIC & DATA INTEGRITY VERIFICATION SUITE   ");
  console.log("   Testing all 4 report generation pipelines across all 8 plants          ");
  console.log("==========================================================================\n");

  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (const plant of PLANTS) {
    console.log(`\n▶ Auditing Plant: [${plant.name}] (${plant.id})...`);
    for (const ep of ENDPOINTS) {
      const res = await testEndpoint(plant, ep);
      results.push(res);
      const isPass = res.status === 200 && res.validFileFormat && res.hasData;
      if (isPass) {
        passCount++;
        console.log(`  ✔ [PASS] ${ep.name}`);
        console.log(`      Status: ${res.status} | Size: ${(res.bytes / 1024).toFixed(1)} KB | Time: ${res.elapsedMs}ms | Format: Valid | File: ${res.contentDisp.replace('attachment; filename=', '')}`);
      } else {
        failCount++;
        console.log(`  ✖ [FAIL] ${ep.name}`);
        console.log(`      Status: ${res.status} | Size: ${res.bytes} B | Format: ${res.validFileFormat} | Disp: ${res.contentDisp}`);
      }
    }
  }

  console.log("\n==========================================================================");
  console.log(` AUDIT COMPLETE: Total Tests: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log("==========================================================================");

  fs.writeFileSync("reports_audit_verification_results.json", JSON.stringify(results, null, 2), "utf8");
}

runAudit().catch(console.error);

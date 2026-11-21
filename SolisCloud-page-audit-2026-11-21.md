# SolisCloud page audit | 21 November 2026
Target: https://power2go-knock.vercel.app/

The homepage and seven read-only data requests returned HTTP 200. The seven APIs reported success. Mobile Plant Overview rendering was confirmed by the supplied browser annotation. Other UI findings below come from the local root application. Deployment commit parity and interactive workflows remain unverified.

| View | Evidence and findings |
|---|---|
| Plant Overview | Overview and plant-list APIs each returned 8 plants. The annotation showed 6 online, 0 in alarm and 2 offline. Mobile category tabs only change highlighting. Default, Parameter Selection, Distance and the filter icon have no handlers. Plant cards are inaccessible by keyboard. |
| Plant Detail | Missing or failed history can produce generated charts for day, month, year and lifetime. See SolisClientDashboard.tsx lines 652–724. |
| Device Overview | Datalogger diagnostics always displays a normal result without checking telemetry. SolisDeviceOverviewPage.tsx line 1438. |
| Inverter Detail | Refresh, settings and CSV only display messages. SolisInverterDetailsView.tsx lines 686, 701 and 974. |
| Battery Detail | Refresh and CSV only display messages. Settings shows fixed limits. SolisBatteryDetailsView.tsx lines 379, 393 and 612. |
| Meter Detail | The Day chart generates values with a formula and randomness. Configuration and CSV only display messages. SolisMeterDetailsView.tsx lines 113, 335 and 558. |
| Alarms | Live query returned 68 records. Mobile row tap lacks the desktop detail callback. A separate detail button has a modal fallback. app/page.tsx line 418 and SolisOMAlarmsPage.tsx lines 436 and 513. |
| Alerts | Live query returned 12 records. Same mobile row behavior as Alarms. Record totals are distinct from plant status counts. |
| Alarm Detail | Missing selection falls back to an example event with fixed plant and owner details. SolisAlarmDetailsView.tsx line 68. This fallback was not observed live. |
| Plant Report | Monthly API returned 8 rows and 21 chart entries. A fixed date and preset rows can mislead when the selected period returns no rows. SolisPlantReportView.tsx lines 105–120. |
| Inverter Report | Monthly API returned 13 rows and 21 curve entries. Same fixed date and stale-row behavior. SolisInverterReportView.tsx lines 112–127. |
| Battery Report | Monthly API returned 11 rows and 21 curve entries. Same fixed date and stale-row behavior. SolisBatteryReportView.tsx lines 100–115. |

All report queries used the UI default date of 20 November 2026. An empty response can leave the previous period or preset table visible because the components replace their rows only for nonempty results.

Service Cases, Clients, Users, Plant Assignments and Settings were absent from the reviewed root page switch and sidebar. Visibility under a Super Admin session remains unverified. Desktop/mobile click paths, console errors, exports, telemetry accuracy and permissions remain untested live. No application changes or operational actions were made.

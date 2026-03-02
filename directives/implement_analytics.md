# Directive: Implement Real Analytics & Dashboards

## Goal
Replace the mock data in the "Tableau de bord" with actual data from the `state.historyData`.
Ensure the analytics are accurate for Monthly, Quarterly, Semiannual, and Annual views.
Support the "Vue Globale" (Global View) across all offices.

## Inputs
- `state.historyData`: LocalStorage-based history data.
- `state.currentOffice`: Currently selected office.
- `dashboardPeriod`: Selected period ('monthly', 'quarterly', 'semiannual', 'annual', 'global').

## Tools
- `script.js`: Main logic file where analytics functions reside.
- `execution/test_analytics.py`: Script to verify aggregation logic.

## Output
- A fully functional dashboard in `index.html` via `script.js`.
- Exported CSV reflecting real data.

## Edge Cases
- No history data for a period: Should display 0s or a placeholder message.
- "Janvier 2026" special case: Consolidation data should be correctly included in Feb calculations if needed.
- Data across multiple months: Quarterly/Annual views should correctly group by month.

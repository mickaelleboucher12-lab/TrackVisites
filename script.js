let state = {
    currentOffice: 'montreux',
    currentDate: '', // Format YYYY-MM-DD
    counts: {
        locataire: 0,
        prestataire: 0
    },
    historyData: {}, // Format: { 'office_id': { 'YYYY-MM-DD': { locataire: X, prestataire: Y } } }
    theme: 'dark',
    lastActivity: '--:--',
    dashboardPeriod: 'monthly'
};

// DOM Elements (global references)
let themeToggle, currentDateEl, officeSelect, countLocataireEl, countPrestataireEl, totalVisitesEl, lastActivityEl, navItems, viewSections;
var currentChart = null;
var consolidationMonth = '';

// Initialize
// Initialisation Supabase (si config.js est rempli)
const hasSupabase = (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined') &&
    SUPABASE_URL.indexOf('supabase.co') !== -1 &&
    SUPABASE_URL.indexOf('VOTRE_PROJET') === -1;

async function initAppData() {
    try {
        await loadState();
        await seedDataIfEmpty();
        loadCountsForSelectedDate();
        updateUI();

        if (hasSupabase) {
            await migrateLocalDataToSupabase();
            subscribeToChanges(); // Activer le temps réel
        }
    } catch (err) {
        console.error("Échec du chargement des données:", err);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, initialisation...");

    // Rendre les fonctions globales accessibles pour les onclick du HTML
    window.updateCount = updateCount;
    window.setDashboardPeriod = setDashboardPeriod;
    window.exportToCSV = exportToCSV;
    window.loadHistoryData = loadHistoryData;
    window.openConsolidationModal = openConsolidationModal;
    window.closeConsolidationModal = closeConsolidationModal;
    window.saveConsolidationTotals = saveConsolidationTotals;
    window.saveHistoryEdit = saveHistoryEdit;
    window.forceSyncLocalToSupabase = forceSyncLocalToSupabase;

    // Initialize Elements
    themeToggle = document.getElementById('theme-toggle');
    currentDateEl = document.getElementById('current-date');
    officeSelect = document.getElementById('office-select');
    countLocataireEl = document.getElementById('count-locataire');
    countPrestataireEl = document.getElementById('count-prestataire');
    totalVisitesEl = document.getElementById('total-visites');
    lastActivityEl = document.getElementById('last-activity');
    navItems = document.querySelectorAll('.nav-item');
    viewSections = document.querySelectorAll('.view-section');

    // 1. Initialiser la date et le thème
    try {
        const now = new Date();
        state.currentDate = now.toISOString().split('T')[0];
        updateDateDisplay();
        applyTheme();
    } catch (e) { console.error("Erreur date/thème:", e); }

    // 2. Initialiser l'UI
    try {
        updateUI();
        attachNavigationListeners();
    } catch (e) { console.error("Erreur UI/Navigation:", e); }

    // 3. Charger les données en arrière-plan
    initAppData().then(() => {
        // Rafraîchissement automatique si on est sur le dashboard
        if (document.getElementById('dashboard-section').classList.contains('active')) {
            renderDashboard();
        }
    });
});

function subscribeToChanges() {
    if (!hasSupabase) return;

    supabase
        .channel('public:visits')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, async (payload) => {
            console.log('Changement détecté en base !', payload);
            await fetchHistoryFromSupabase();
            loadCountsForSelectedDate();
            updateUI();

            // Si le dashboard est ouvert, on le rafraîchit aussi
            if (document.getElementById('dashboard-section').classList.contains('active')) {
                renderDashboard();
            }
        })
        .subscribe();
}

// State Persistence Helper
async function saveState(syncDB = true) {
    localStorage.setItem('trackVisitesState_v2', JSON.stringify(state));

    if (syncDB && hasSupabase) {
        await syncVisitToSupabase(state.currentOffice, state.currentDate, state.counts.locataire, state.counts.prestataire);
    }
}

async function loadState() {
    // 1. Charger les préférences locales (on tente la V2 puis la V1)
    const savedV2 = localStorage.getItem('trackVisitesState_v2');
    const savedV1 = localStorage.getItem('trackVisitesState');

    if (savedV2) {
        state = { ...state, ...JSON.parse(savedV2) };
    }

    if (savedV1) {
        const parsedV1 = JSON.parse(savedV1);
        // On fusionne les données historiques de la V1 si elles ne sont pas dans la V2
        if (parsedV1.historyData) {
            state.historyData = { ...parsedV1.historyData, ...state.historyData };
        }
    }

    // 2. Charger les données historiques depuis Supabase
    if (hasSupabase) {
        await fetchHistoryFromSupabase();
    }
}

async function fetchHistoryFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('visits')
            .select('*');

        if (error) throw error;

        // Reconstruire historyData à partir des lignes de la DB
        const newHistory = {};
        data.forEach(row => {
            if (!newHistory[row.office]) newHistory[row.office] = {};
            newHistory[row.office][row.visit_date] = {
                locataire: row.locataire_count,
                prestataire: row.prestataire_count,
                isConsolidation: row.is_consolidation
            };
        });

        state.historyData = newHistory;
    } catch (err) {
        console.error("Erreur lors du chargement Supabase:", err.message);
    }
}

async function syncVisitToSupabase(office, date, loc, pre, isConso = false) {
    if (!hasSupabase) return;

    try {
        const { error } = await supabase
            .from('visits')
            .upsert({
                office: office,
                visit_date: date,
                locataire_count: loc,
                prestataire_count: pre,
                is_consolidation: isConso
            }, { onConflict: 'office,visit_date,is_consolidation' });

        if (error) throw error;
    } catch (err) {
        console.error("Erreur lors de la synchro Supabase:", err.message);
    }
}

async function forceSyncLocalToSupabase() {
    const btn = document.getElementById('force-sync-db');
    if (!btn) return;

    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="spin" data-lucide="loader-2"></i> Synchronisation...';
    if (window.lucide) window.lucide.createIcons();

    let total = 0;
    try {
        for (const office in state.historyData) {
            for (const date in state.historyData[office]) {
                const data = state.historyData[office][date];
                await syncVisitToSupabase(office, date, data.locataire, data.prestataire, data.isConsolidation || false);
                total++;
            }
        }
        alert(`${total} entrées ont été synchronisées avec succès ! Vous pouvez maintenant fermer cet onglet ou utiliser un autre appareil.`);
        localStorage.setItem('migration_to_supabase_done', 'true');
    } catch (err) {
        alert("Erreur lors de la synchronisation : " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        if (window.lucide) window.lucide.createIcons();
    }
}

async function migrateLocalDataToSupabase() {
    // On vérifie d'abord la V2, puis la V1 (ancienne version sans Supabase)
    const savedV2 = localStorage.getItem('trackVisitesState_v2');
    const savedV1 = localStorage.getItem('trackVisitesState');
    const saved = savedV2 || savedV1;

    if (!saved) return;

    const migrationDone = localStorage.getItem('migration_to_supabase_done');
    if (migrationDone === 'true') return;

    const localState = JSON.parse(saved);
    const history = localState.historyData;
    if (!history || Object.keys(history).length === 0) return;

    console.log("--- [Migration] Début de l'envoi des données locales vers Supabase ---");

    let totalMigrated = 0;
    for (const office in history) {
        for (const date in history[office]) {
            const data = history[office][date];
            await syncVisitToSupabase(office, date, data.locataire, data.prestataire, data.isConsolidation || false);
            totalMigrated++;
        }
    }

    if (totalMigrated > 0) {
        localStorage.setItem('migration_to_supabase_done', 'true');
        console.log(`--- [Migration] ${totalMigrated} entrées synchronisées avec succès ! ---`);
        alert(`${totalMigrated} données locales ont été synchronisées avec la nouvelle base de données partagée.`);
    }
}

// Office Selection
officeSelect.addEventListener('change', async (e) => {
    state.currentOffice = e.target.value;
    loadCountsForSelectedDate();
    updateUI();
    await saveState();
});

// Load Counts for specific date and office
function loadCountsForSelectedDate() {
    const officeData = state.historyData[state.currentOffice] || {};
    const dayData = officeData[state.currentDate] || { locataire: 0, prestataire: 0 };
    state.counts = { ...dayData };
}

// Update Count (Main Counter)
async function updateCount(type, delta) {
    if (state.counts[type] + delta < 0) return;

    state.counts[type] += delta;

    // Update daily history
    if (!state.historyData[state.currentOffice]) state.historyData[state.currentOffice] = {};
    state.historyData[state.currentOffice][state.currentDate] = { ...state.counts };

    // Update last activity
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0');
    state.lastActivity = time;

    updateUI();
    await saveState(true);

    // Simple micro-animation feedback
    const display = document.getElementById(`count-${type}`);
    display.style.transform = 'scale(1.1)';
    setTimeout(() => { display.style.transform = 'scale(1)'; }, 100);
}

// UI Sync
function updateUI() {
    countLocataireEl.textContent = state.counts.locataire;
    countPrestataireEl.textContent = state.counts.prestataire;
    totalVisitesEl.textContent = state.counts.locataire + state.counts.prestataire;
    lastActivityEl.textContent = state.lastActivity || '--:--';

    officeSelect.value = state.currentOffice;
}

// Phase 3: History & Data Management
function loadHistoryData() {
    const historyDate = document.getElementById('history-date').value;
    const historyDisplay = document.getElementById('history-display');
    const noHistoryMsg = document.getElementById('no-history-data');

    if (!historyDate) {
        historyDisplay.classList.add('hidden');
        noHistoryMsg.classList.remove('hidden');
        return;
    }

    const officeData = state.historyData[state.currentOffice] || {};
    const dayData = officeData[historyDate] || { locataire: 0, prestataire: 0 };

    // Show display, hide placeholder
    historyDisplay.classList.remove('hidden');
    noHistoryMsg.classList.add('hidden');

    // Update labels and inputs
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatted = new Date(historyDate).toLocaleDateString('fr-FR', options);
    document.getElementById('history-display-date').textContent = `Données du ${dateFormatted}`;

    // Handle "Old Values" visual trace
    document.getElementById('old-locataire').textContent = `Valeur actuelle: ${dayData.locataire}`;
    document.getElementById('old-prestataire').textContent = `Valeur actuelle: ${dayData.prestataire}`;

    document.getElementById('edit-locataire').value = dayData.locataire;
    document.getElementById('edit-prestataire').value = dayData.prestataire;
}

async function saveHistoryEdit() {
    const historyDate = document.getElementById('history-date').value;
    const newLocataire = parseInt(document.getElementById('edit-locataire').value) || 0;
    const newPrestataire = parseInt(document.getElementById('edit-prestataire').value) || 0;

    if (!state.historyData[state.currentOffice]) state.historyData[state.currentOffice] = {};

    state.historyData[state.currentOffice][historyDate] = {
        locataire: newLocataire,
        prestataire: newPrestataire
    };

    // If we're editing today, update the main counter too
    if (historyDate === state.currentDate) {
        state.counts = { locataire: newLocataire, prestataire: newPrestataire };
        updateUI();
    }
    await syncVisitToSupabase(state.currentOffice, historyDate, newLocataire, newPrestataire);
    await saveState(false);
    loadHistoryData(); // Refresh labels
    alert('Modifications enregistrées avec succès !');
}

// Phase 3: History & Data Management

function openConsolidationModal(month) {
    consolidationMonth = month;
    const [year, m] = month.split('-');
    const monthNamesFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const monthName = monthNamesFr[parseInt(m) - 1];

    document.getElementById('consolidation-title').textContent = `Saisie Totaux ${monthName} ${year}`;
    document.getElementById('consolidation-instruction').textContent = `Saisir les totaux consolidés pour le mois de ${monthName} ${year}.`;

    // Try to load existing data if it exists for the consolidation date
    const lastDay = new Date(year, parseInt(m), 0).getDate();
    const dateStr = `${year}-${m.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    const officeData = state.historyData[state.currentOffice] || {};
    const existing = officeData[dateStr];

    document.getElementById('conso-total-locataires').value = existing ? existing.locataire : '';
    document.getElementById('conso-total-prestataires').value = existing ? existing.prestataire : '';

    document.getElementById('consolidation-modal').classList.remove('hidden');
}

function closeConsolidationModal() {
    document.getElementById('consolidation-modal').classList.add('hidden');
}

async function saveConsolidationTotals() {
    const loc = parseInt(document.getElementById('conso-total-locataires').value) || 0;
    const pre = parseInt(document.getElementById('conso-total-prestataires').value) || 0;

    const [year, month] = consolidationMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    if (!state.historyData[state.currentOffice]) state.historyData[state.currentOffice] = {};
    state.historyData[state.currentOffice][dateStr] = {
        locataire: loc,
        prestataire: pre,
        isConsolidation: true
    };
    await syncVisitToSupabase(state.currentOffice, dateStr, loc, pre, true);
    await saveState(false);
    closeConsolidationModal();
    alert(`Les totaux ont été enregistrés avec succès.`);
}

// Phase 4: Analytics & Dashboards
// Phase 4: Analytics & Dashboards

function initDashboard() {
    renderDashboard();
}

function setDashboardPeriod(period) {
    console.log("Changement de période vers:", period);
    try {
        state.dashboardPeriod = period;

        // Update Button UI
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            const txt = btn.textContent.trim();
            if ((period === 'monthly' && txt === 'Mensuel') ||
                (period === 'quarterly' && txt === 'Trimestriel') ||
                (period === 'semiannual' && txt === 'Semestriel') ||
                (period === '9months' && txt === '9 Mois') ||
                (period === 'annual' && txt === 'Annuel') ||
                (period === 'global' && txt === 'Vue Globale')) {
                btn.classList.add('active');
            }
        });

        renderDashboard();
    } catch (err) {
        console.error("Erreur switch période:", err);
    }
}

function getOfficeKey(name) {
    if (name === 'St Exupéry') return 'st-exupery';
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-');
}

function renderDashboard() {
    if (currentChart) currentChart.destroy();

    const canvas = document.getElementById('mainChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isDark = state.theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    let labels = [];
    let dataLocataire = [];
    let dataPrestataire = [];
    let tableRows = [];
    let title = "Analyse des visites";
    const officeData = state.historyData[state.currentOffice] || {};
    const [currentYear, currentMonth, currentDay] = state.currentDate.split('-').map(Number);
    const monthNamesFr = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

    // 1. Data Aggregation Helper with Consolidation Support
    const getMonthTotals = (data, year, month) => {
        let loc = 0, pre = 0, days = 0, hasConso = false;
        Object.entries(data).forEach(([date, vals]) => {
            const [y, m, d] = date.split('-').map(Number);
            if (y === year && m === month) {
                if (vals.isConsolidation) {
                    loc = vals.locataire;
                    pre = vals.prestataire;
                    hasConso = true;
                } else if (!hasConso) {
                    loc += vals.locataire;
                    pre += vals.prestataire;
                    days++;
                }
            }
        });
        return { loc, pre, days, hasConso };
    };

    let periodTotalVisites = 0;
    let periodTotalPre = 0;
    let periodTotalDays = 0;

    if (state.dashboardPeriod === 'global') {
        labels = ['Montreux', 'La Chartrie', 'St Exupéry', 'Le Pré', 'La Suze'];
        title = "Comparaison Globale des Bureaux (Année en cours)";

        labels.forEach(officeName => {
            const officeKey = getOfficeKey(officeName);
            const data = state.historyData[officeKey] || {};
            let officeLoc = 0, officePre = 0, officeDays = 0;

            // Aggregate all months of the current year for this office
            for (let m = 1; m <= 12; m++) {
                const totals = getMonthTotals(data, currentYear, m);
                officeLoc += totals.loc;
                officePre += totals.pre;
                officeDays += totals.days;
            }

            dataLocataire.push(officeLoc);
            dataPrestataire.push(officePre);

            periodTotalVisites += officeLoc;
            periodTotalPre += officePre;
            periodTotalDays += officeDays;

            tableRows.push({
                name: officeName,
                visites: officeLoc,
                prestataires: officePre,
                jours: officeDays
            });
        });
    } else {
        let startMonth, numMonths;

        if (state.dashboardPeriod === 'monthly') {
            title = `Analyse du mois (${monthNamesFr[currentMonth - 1]} ${currentYear})`;
            startMonth = currentMonth;
            numMonths = 1;

            // Monthly breakdown for chart (weeks)
            labels = ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4', 'S5 +'];
            dataLocataire = [0, 0, 0, 0, 0];
            dataPrestataire = [0, 0, 0, 0, 0];

            const totals = getMonthTotals(officeData, currentYear, currentMonth);
            periodTotalVisites = totals.loc;
            periodTotalPre = totals.pre;
            periodTotalDays = totals.days;

            Object.entries(officeData).forEach(([date, vals]) => {
                const [y, m, d] = date.split('-').map(Number);
                if (y === currentYear && m === currentMonth && !vals.isConsolidation) {
                    const weekIdx = Math.min(4, Math.floor((d - 1) / 7));
                    dataLocataire[weekIdx] += vals.locataire;
                    dataPrestataire[weekIdx] += vals.prestataire;
                }
            });

            tableRows.push({
                name: `${monthNamesFr[currentMonth - 1]} ${currentYear}`,
                visites: totals.loc,
                prestataires: totals.pre,
                jours: totals.days
            });
        } else {
            if (state.dashboardPeriod === 'quarterly') {
                const quarter = Math.floor((currentMonth - 1) / 3);
                startMonth = quarter * 3 + 1;
                numMonths = 3;
                title = `Analyse Trimestrielle (T${quarter + 1} ${currentYear})`;
            } else if (state.dashboardPeriod === 'semiannual') {
                const half = Math.floor((currentMonth - 1) / 6);
                startMonth = half * 6 + 1;
                numMonths = 6;
                title = `Analyse Semestrielle (S${half + 1} ${currentYear})`;
            } else if (state.dashboardPeriod === '9months') {
                startMonth = 1;
                numMonths = 9;
                title = `Analyse sur 9 Mois (${currentYear})`;
            } else { // annual
                startMonth = 1;
                numMonths = 12;
                title = `Analyse Annuelle (${currentYear})`;
            }

            for (let i = 0; i < numMonths; i++) {
                const m = startMonth + i;
                if (m > 12) break;

                const totals = getMonthTotals(officeData, currentYear, m);
                labels.push(monthNamesFr[m - 1]);
                dataLocataire.push(totals.loc);
                dataPrestataire.push(totals.pre);

                periodTotalVisites += totals.loc;
                periodTotalPre += totals.pre;
                periodTotalDays += totals.days;

                if (totals.days > 0 || totals.hasConso || m <= currentMonth) {
                    tableRows.push({
                        name: `${monthNamesFr[m - 1]} ${currentYear}`,
                        visites: totals.loc,
                        prestataires: totals.pre,
                        jours: totals.days
                    });
                }
            }
        }
    }

    // Populate KPI Cards
    document.getElementById('dash-total-visites').textContent = periodTotalVisites;
    document.getElementById('dash-total-prestataires').textContent = periodTotalPre;
    document.getElementById('dash-registered-days').textContent = periodTotalDays;
    document.getElementById('chart-title').textContent = title;

    // Populate Table
    const tableBody = document.getElementById('dashboard-summary-body');
    tableBody.innerHTML = '';

    tableRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.name}</td>
            <td>${row.visites}</td>
            <td>${row.prestataires}</td>
            <td>${row.jours}</td>
        `;
        tableBody.appendChild(tr);
    });

    document.getElementById('table-visites-total').textContent = periodTotalVisites;
    document.getElementById('table-prestataires-total').textContent = periodTotalPre;
    document.getElementById('table-days-total').textContent = periodTotalDays;

    // Render Chart
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Visites',
                    data: dataLocataire,
                    backgroundColor: '#1d4ed8', // Deep Blue
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                },
                {
                    label: 'Prestataires',
                    data: dataPrestataire,
                    backgroundColor: '#f59e0b', // Orange
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        font: { family: 'Inter', size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    padding: 12,
                    cornerRadius: 8,
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    titleColor: isDark ? '#fff' : '#1e293b',
                    bodyColor: isDark ? '#94a3b8' : '#64748b',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor, drawBorder: false },
                    ticks: {
                        color: textColor,
                        font: { family: 'Inter' },
                        stepSize: 20
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'Inter' } }
                }
            }
        }
    });
}

// Phase 5: Export & Final Polish
function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Bureau,Locataires,Prestataires\n";

    // Flatten historyData
    for (const office in state.historyData) {
        for (const date in state.historyData[office]) {
            const row = state.historyData[office][date];
            csvContent += `${date},${office},${row.locataire},${row.prestataire}\n`;
        }
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trackvisites_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function attachNavigationListeners() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.id.replace('nav-', '');

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            viewSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${targetView}-section`) {
                    section.classList.add('active');
                }
            });

            const titles = {
                'counter': 'Compteurs d\'accueil',
                'history': 'Historique des visites',
                'dashboard': 'Tableau de bord analytique'
            };
            document.getElementById('page-title').textContent = titles[targetView];

            if (targetView === 'dashboard') {
                setTimeout(initDashboard, 100);
            }
        });
    });

    // Theme toggle
    themeToggle.addEventListener('click', async () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        await saveState(false);
        if (document.getElementById('dashboard-section').classList.contains('active')) {
            renderDashboard();
        }
    });

    const forceSyncBtn = document.getElementById('force-sync-db');
    if (forceSyncBtn) {
        forceSyncBtn.addEventListener('click', forceSyncLocalToSupabase);
    }
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeText = themeToggle.querySelector('span');
    themeText.textContent = state.theme === 'dark' ? 'Mode Clair' : 'Mode Sombre';
}

function updateDateDisplay() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const localeStr = now.toLocaleDateString('fr-FR', options);

    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) currentDateEl.textContent = localeStr;

    // Update Banner
    const dayName = now.toLocaleDateString('fr-FR', { weekday: 'long' });
    const fullDate = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const bannerDay = document.getElementById('banner-day-name');
    const bannerFull = document.getElementById('banner-full-date');

    if (bannerDay) bannerDay.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    if (bannerFull) bannerFull.textContent = fullDate;
}

/**
 * Seeds the application with mock data if history is empty
 */
async function seedDataIfEmpty() {
    if (Object.keys(state.historyData).length > 0) return;

    const offices = ['montreux', 'la-chartrie', 'st-exupery', 'le-pre', 'la-suze'];
    const now = new Date();

    // users wants all data at 0, skipping mock data generation
    offices.forEach(office => {
        state.historyData[office] = {};
    });

    await saveState(false);
}

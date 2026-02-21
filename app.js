// app.js

// State
let startTime = 0;
let updatedTime = 0;
let difference = 0;
let tInterval = null;
let running = false;
let isReady = false; // Spacebar held down
let readyTimeout = null;

let solves = JSON.parse(localStorage.getItem('rubiksSolves')) || [];
let chartInstance = null;

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const saveBtn = document.getElementById('save-btn');
const historyList = document.getElementById('history-list');
const pbDisplay = document.getElementById('pb-display');
const ao5Display = document.getElementById('ao5-display');
const countDisplay = document.getElementById('count-display');
const progressChartCtx = document.getElementById('progressChart').getContext('2d');
const scrambleDisplay = document.getElementById('scramble-display');
const newScrambleBtn = document.getElementById('new-scramble-btn');
const tipTitle = document.getElementById('tip-title');
const tipText = document.getElementById('tip-text');

// Tips Array
const tips = [
    { title: "Look Ahead", text: "Détends tes poignets et regarde plus loin (look ahead) pendant la résolution au lieu de te concentrer uniquement sur les pièces que tu as en main." },
    { title: "Cross (Croix)", text: "Essaie de planifier toute ta croix pendant l'inspection (les 15 secondes avant de commencer). Ferme les yeux et imagine où iront les pièces." },
    { title: "F2L Efficace", text: "Évite de regripper le cube (changer la position de tes mains). Apprends à insérer des paires F2L depuis différents angles." },
    { title: "Inspection, la clé", text: "Prends tout ton temps pour l'inspection. C'est autorisé (jusqu'à 15s) et ça fait une énorme différence sur le début de ton solve." },
    { title: "Tourner lentement", text: "Tourner lentement mais sans aucune pause (slow turning) est souvent plus rapide qu'aller très vite avec beaucoup de pauses pour chercher les pièces." },
    { title: "Apprentissage des algos", text: "N'apprends pas les algorithmes juste en lisant les lettres (R U R' U'). Apprends-les en regardant le mouvement des pièces et à la mémoire musculaire." },
    { title: "Entraînement ciblé", text: "Fais des sessions où tu ne t'entraînes que sur une étape précise (par exemple, juste des croix ou juste des F2L lents)." }
];

// Scramble Generator (Simple CFOP notation)
function generateScramble() {
    const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    let scramble = [];
    let lastMove = '';

    for (let i = 0; i < 20; i++) {
        let move;
        do {
            move = moves[Math.floor(Math.random() * moves.length)];
        } while (move === lastMove);

        lastMove = move;
        const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        scramble.push(move + modifier);
    }

    return scramble.join(' ');
}

// Format time (ms) to mm:ss.ms
function formatTime(ms) {
    let date = new Date(ms);
    let minutes = Math.floor(ms / 60000);
    let seconds = date.getSeconds();
    let milliseconds = date.getMilliseconds();

    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    if (milliseconds < 10) {
        milliseconds = "00" + milliseconds;
    } else if (milliseconds < 100) {
        milliseconds = "0" + milliseconds;
    }

    return `${minutes}:${seconds}.${milliseconds}`;
}

// Timer Functions
function startTimer() {
    if (!running) {
        startTime = new Date().getTime() - difference;
        tInterval = setInterval(getShowTime, 10);
        running = true;
        timeDisplay.classList.remove('ready');
        timeDisplay.classList.add('running');
        startBtn.textContent = 'Stop (Espace)';
        startBtn.classList.replace('primary-btn', 'secondary-btn');
        resetBtn.disabled = true;
        saveBtn.disabled = true;
    }
}

function stopTimer() {
    if (running) {
        clearInterval(tInterval);
        running = false;
        timeDisplay.classList.remove('running');
        timeDisplay.classList.add('stopped');
        startBtn.textContent = 'Démarrer (Espace)';
        startBtn.classList.replace('secondary-btn', 'primary-btn');
        resetBtn.disabled = false;
        saveBtn.disabled = false;
    }
}

function resetTimer() {
    clearInterval(tInterval);
    running = false;
    difference = 0;
    timeDisplay.innerHTML = "00:00.000";
    timeDisplay.className = 'timer-display';
    startBtn.textContent = 'Démarrer (Espace)';
    startBtn.classList.replace('secondary-btn', 'primary-btn');
    resetBtn.disabled = false;
    saveBtn.disabled = true;
}

function getShowTime() {
    updatedTime = new Date().getTime();
    difference = updatedTime - startTime;
    timeDisplay.innerHTML = formatTime(difference);
}

// Logic to start stop timer via function call to consolidate events
function toggleTimer() {
    if (running) {
        stopTimer();
    } else {
        // Can only start if we are resetting or ready state is not required (click)
        // If clicking start, start immediately
        resetTimer();
        startTimer();
    }
}

// Spacebar readiness logic
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
        e.preventDefault(); // Prevent scrolling
        if (running) {
            stopTimer();
        } else if (!isReady && difference === 0) {
            // Visual feedback for getting ready
            timeDisplay.classList.add('ready');
            isReady = true;
        } else if (!running && difference > 0) {
            // Reset if there is time
            resetTimer();
            timeDisplay.classList.add('ready');
            isReady = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
        if (isReady) {
            startTimer();
            isReady = false;
        }
    }
});


// Event Listeners for UI buttons
startBtn.addEventListener('click', () => {
    if (running) {
        stopTimer()
    } else {
        if (difference > 0) resetTimer();
        startTimer();
    }
});
resetBtn.addEventListener('click', resetTimer);

saveBtn.addEventListener('click', () => {
    if (difference > 0) {
        saveSolve(difference);
        resetTimer();
        updateUI();
    }
});

newScrambleBtn.addEventListener('click', () => {
    scrambleDisplay.textContent = generateScramble();
});

// App Logic
function saveSolve(timeMs) {
    const solve = {
        id: Date.now(),
        time: timeMs,
        date: new Date().toISOString(),
        scramble: scrambleDisplay.textContent
    };
    solves.unshift(solve); // Add to beginning
    localStorage.setItem('rubiksSolves', JSON.stringify(solves));

    // Changing tip on save
    showRandomTip();
}

function deleteSolve(id) {
    if (confirm("Supprimer ce temps ?")) {
        solves = solves.filter(s => s.id !== id);
        localStorage.setItem('rubiksSolves', JSON.stringify(solves));
        updateUI();
    }
}

function calculateAo5() {
    if (solves.length < 5) return null;

    // Take the last 5 solves (they are at the beginning of the array)
    const last5 = solves.slice(0, 5).map(s => s.time);

    // Sort to remove best and worst
    last5.sort((a, b) => a - b);
    last5.pop(); // Remove worst
    last5.shift(); // Remove best

    // Calculate average
    const sum = last5.reduce((a, b) => a + b, 0);
    return sum / 3;
}

function getPB() {
    if (solves.length === 0) return null;
    return Math.min(...solves.map(s => s.time));
}

function showRandomTip() {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    tipTitle.textContent = randomTip.title;
    tipText.textContent = randomTip.text;
}

// UI Updates
function updateUI() {
    renderHistory();
    updateStats();
    renderChart();

    // Update scramble
    scrambleDisplay.textContent = generateScramble();
}

function renderHistory() {
    historyList.innerHTML = '';
    const pb = getPB();

    // Pagination or slicing can be added, but keeping it simple for now (latest 50)
    const displaySolves = solves.slice(0, 50);

    displaySolves.forEach((solve, index) => {
        const tr = document.createElement('tr');
        const isPB = solve.time === pb;

        const dateObj = new Date(solve.date);
        const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1} ${dateObj.getHours()}:${(dateObj.getMinutes() < 10 ? '0' : '') + dateObj.getMinutes()}`;

        tr.innerHTML = `
            <td>${solves.length - index}</td>
            <td class="time ${isPB ? 'is-pb' : ''}">${formatTime(solve.time)}${isPB ? ' 🔥' : ''}</td>
            <td style="color: var(--text-muted); font-size: 0.8em">${dateStr}</td>
            <td>
                <button class="delete-btn" onclick="deleteSolve(${solve.id})" title="Supprimer">×</button>
            </td>
        `;
        historyList.appendChild(tr);
    });
}

function updateStats() {
    countDisplay.textContent = solves.length;

    const pb = getPB();
    pbDisplay.textContent = pb ? formatTime(pb) : '--:--.---';

    const ao5 = calculateAo5();
    ao5Display.textContent = ao5 ? formatTime(ao5) : '--:--.---';
}

function renderChart() {
    if (solves.length === 0) return;

    // We want chronogical order for the chart (oldest to newest)
    const chronologicalSolves = [...solves].reverse();
    const labels = chronologicalSolves.map((_, i) => i + 1);
    const data = chronologicalSolves.map(s => s.time / 1000); // Chart in seconds for readability

    if (chartInstance) {
        chartInstance.destroy();
    }

    Chart.defaults.color = '#8b949e';
    Chart.defaults.font.family = "'Space Mono', monospace";

    chartInstance = new Chart(progressChartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temps (Secondes)',
                data: data,
                borderColor: '#58a6ff',
                backgroundColor: 'rgba(88, 166, 255, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#0d1117',
                pointBorderColor: '#58a6ff',
                pointHoverBackgroundColor: '#58a6ff',
                pointHoverBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.3 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(22, 27, 34, 0.9)',
                    titleColor: '#c9d1d9',
                    bodyColor: '#58a6ff',
                    borderColor: '#30363d',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return `Temps: ${context.parsed.y.toFixed(2)}s`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(48, 54, 61, 0.5)',
                        drawBorder: false
                    },
                    title: {
                        display: true,
                        text: 'N° de Résolution',
                        color: '#8b949e'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(48, 54, 61, 0.5)',
                        drawBorder: false
                    },
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Temps (s)',
                        color: '#8b949e'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

// Init
showRandomTip();
updateUI();

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

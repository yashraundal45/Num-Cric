// --- AUDIO SYSTEM ---
const AUDIO = {
    click: document.getElementById('sfx-click'),
    toss: document.getElementById('sfx-toss'),
    hit: document.getElementById('sfx-hit'),
    boundary: document.getElementById('sfx-boundary'),
    out: document.getElementById('sfx-out'),
    win: document.getElementById('sfx-win')
};

let soundEnabled = true;

function playSound(type) {
    if (!soundEnabled) return;
    try {
        const sound = AUDIO[type];
        if (sound) {
            sound.currentTime = 0;
            if (type !== 'win') sound.volume = 0.5;
            sound.play().catch(e => console.log('Audio error:', e));
        }
    } catch(e) {}
}

// --- CONSTANTS ---
const MAX_WICKETS = 3;

// --- STATE ---
const GAME_STATE = {
    mode: null, maxOvers: 5, maxBalls: 30,
    tossWinner: null, playerRole: null, currentInnings: 1,
    innings1: { team: null, runs: 0, wickets: 0, balls: 0 },
    innings2: { team: null, runs: 0, wickets: 0, balls: 0, target: 0 },
    isProcessingBall: false
};

const screens = {
    home: document.getElementById('screen-home'),
    mode: document.getElementById('screen-mode'),
    toss: document.getElementById('screen-toss'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result'),
    stats: document.getElementById('screen-stats')
};

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadStats();
    const s = localStorage.getItem('nc_sound_v6');
    if (s !== null) { soundEnabled = s === 'true'; updateSoundIcon(); }
});

function bindEvents() {
    document.getElementById('btn-sound').addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('nc_sound_v6', soundEnabled);
        updateSoundIcon();
        playSound('click');
    });

    document.getElementById('btn-play').addEventListener('click', () => { playSound('click'); switchScreen('mode'); });
    document.getElementById('btn-stats').addEventListener('click', () => { playSound('click'); updateStatsUI(); switchScreen('stats'); });
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { playSound('click'); switchScreen(e.currentTarget.dataset.target.replace('screen-', '')); });
    });

    document.getElementById('btn-play-again').addEventListener('click', () => { playSound('click'); resetGameState(); switchScreen('toss'); });
    
    document.querySelectorAll('.mode-item').forEach(card => {
        card.addEventListener('click', (e) => {
            playSound('click');
            const target = e.currentTarget;
            GAME_STATE.mode = target.querySelector('h3').innerText;
            GAME_STATE.maxOvers = parseInt(target.dataset.overs);
            GAME_STATE.maxBalls = GAME_STATE.maxOvers * 6;
            document.getElementById('sb-mode').innerText = GAME_STATE.mode;
            resetGameState();
            switchScreen('toss');
        });
    });

    document.querySelectorAll('.toss-btn').forEach(btn => btn.addEventListener('click', (e) => handleToss(e.target.dataset.call)));
    document.querySelectorAll('.decision-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { playSound('click'); setInitialRoles('player', e.currentTarget.dataset.decision); startGame(); });
    });
    document.getElementById('btn-continue-toss').addEventListener('click', () => { playSound('click'); startGame(); });

    document.getElementById('btn-reset-stats').addEventListener('click', () => {
        playSound('click');
        if (confirm("Reset all career stats?")) {
            localStorage.removeItem('nc_stats_v6');
            loadStats();
            updateStatsUI();
        }
    });
}

function updateSoundIcon() {
    document.getElementById('btn-sound').innerHTML = soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
}

function switchScreen(id) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    if(screens[id]) screens[id].classList.remove('hidden');
}

// --- TOSS LOGIC ---
function handleToss(playerCall) {
    playSound('toss');
    document.getElementById('toss-buttons').classList.add('hidden');
    document.getElementById('toss-status-text').innerText = 'FLIPPING...';
    
    const coin = document.getElementById('coin');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    let deg = 5 * 360 + (result === 'tails' ? 180 : 0);
    coin.style.transform = `rotateX(${deg}deg)`;
    
    setTimeout(() => {
        document.getElementById('toss-status-text').innerText = '';
        const winArea = document.getElementById('toss-result-area');
        winArea.classList.remove('hidden');
        winArea.style.display = 'flex';
        
        const winText = document.getElementById('toss-winner-text');
        
        if (playerCall === result) {
            GAME_STATE.tossWinner = 'player';
            winText.innerHTML = "YOU WON THE TOSS!";
            document.getElementById('toss-decision-buttons').classList.remove('hidden');
        } else {
            GAME_STATE.tossWinner = 'cpu';
            const compDec = Math.random() < 0.5 ? 'bat' : 'bowl';
            winText.innerHTML = `CPU WON TOSS<br><span class="text-white text-3xl font-mont mt-2 block">CHOSE TO ${compDec.toUpperCase()}</span>`;
            document.getElementById('btn-continue-toss').classList.remove('hidden');
            setInitialRoles('cpu', compDec);
        }
    }, 3000);
}

function setInitialRoles(winner, decision) {
    GAME_STATE.playerRole = winner === 'player' ? (decision === 'bat' ? 'batting' : 'bowling') : (decision === 'bat' ? 'bowling' : 'batting');
    GAME_STATE.innings1.team = GAME_STATE.playerRole === 'batting' ? 'player' : 'cpu';
    GAME_STATE.innings2.team = GAME_STATE.playerRole === 'batting' ? 'cpu' : 'player';
}

function resetGameState() {
    GAME_STATE.currentInnings = 1;
    GAME_STATE.innings1 = { team: null, runs: 0, wickets: 0, balls: 0 };
    GAME_STATE.innings2 = { team: null, runs: 0, wickets: 0, balls: 0, target: 0 };
    GAME_STATE.isProcessingBall = false;
    
    document.getElementById('toss-buttons').classList.remove('hidden');
    document.getElementById('toss-result-area').classList.add('hidden');
    document.getElementById('toss-decision-buttons').classList.add('hidden');
    document.getElementById('btn-continue-toss').classList.add('hidden');
    document.getElementById('toss-status-text').innerText = 'HEADS OR TAILS?';
    document.getElementById('coin').style.transform = 'rotateX(0deg)';
    document.getElementById('commentary-list').innerHTML = '<div class="comm-item">Welcome to the match! The umpire calls play.</div>';
}

// --- GAME LOGIC ---
function startGame() { switchScreen('game'); setupInningsUI(); }

function setupInningsUI() {
    const isBatting = GAME_STATE.playerRole === 'batting';
    document.getElementById('sb-batting-name').innerHTML = isBatting ? 'YOU' : 'CPU';
    document.getElementById('current-role').innerHTML = isBatting ? '<i class="fas fa-baseball-bat-ball text-green mr-2"></i> BATTING' : '<i class="fas fa-bowling-ball text-blue mr-2"></i> BOWLING';
    
    const targetCon = document.getElementById('sb-target-container');
    if (GAME_STATE.currentInnings === 2) {
        targetCon.classList.remove('hidden');
        document.getElementById('sb-target-score').innerText = GAME_STATE.innings2.target;
        updateTargetText();
    } else {
        targetCon.classList.add('hidden');
    }
    
    updateScoreboardUI();
    renderNumberButtons();
    document.getElementById('action-overlay').classList.add('hidden');
    document.getElementById('player-stumps').classList.remove('stump-broken');
}

function renderNumberButtons() {
    const grid = document.getElementById('number-grid');
    grid.innerHTML = '';
    const isBatting = GAME_STATE.playerRole === 'batting';
    const nums = isBatting ? [1,2,3,4,6] : [0,1,2,3,4,6];
    
    nums.forEach(num => {
        const btn = document.createElement('button');
        btn.className = 'num-btn glass-panel';
        btn.innerText = num;
        btn.onclick = () => playBall(num);
        grid.appendChild(btn);
    });
}

function getComputerChoice() {
    const isBatting = GAME_STATE.playerRole === 'bowling';
    if (isBatting) {
        let w0=10, w1=15, w2=10, w3=10, w4=25, w6=30;
        if (GAME_STATE.currentInnings === 2) {
            const need = GAME_STATE.innings2.target - GAME_STATE.innings2.runs;
            if (need<=3) {w6=5; w4=10; w3=20; w2=25; w1=30; w0=10;}
            else if (need<10) {w6=10; w4=20; w3=20; w2=20; w1=20; w0=10;}
        }
        let r=Math.random()*(w0+w1+w2+w3+w4+w6);
        if(r<w0)return 0;r-=w0;if(r<w1)return 1;r-=w1;if(r<w2)return 2;r-=w2;if(r<w3)return 3;r-=w3;if(r<w4)return 4;return 6;
    } else {
        const r=Math.random();
        const curR = GAME_STATE.currentInnings===1 ? GAME_STATE.innings1.runs : GAME_STATE.innings2.runs;
        if(curR>20) {if(r<0.15)return 1;if(r<0.3)return 2;if(r<0.45)return 3;if(r<0.7)return 4;return 6;}
        if(r<0.2)return 1;if(r<0.4)return 2;if(r<0.6)return 3;if(r<0.8)return 4;return 6;
    }
}

function addCommentary(text) {
    const list = document.getElementById('commentary-list');
    const cur = GAME_STATE.currentInnings===1 ? GAME_STATE.innings1 : GAME_STATE.innings2;
    const overStr = `${Math.floor(cur.balls/6)}.${cur.balls%6}`;
    
    const div = document.createElement('div');
    div.className = 'comm-item';
    div.innerHTML = `<span class="text-gold mr-2 font-bold">${overStr}</span> ${text}`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

function playBall(pNum) {
    if (GAME_STATE.isProcessingBall) return;
    GAME_STATE.isProcessingBall = true;
    playSound('click');
    
    document.querySelectorAll('.num-btn').forEach(b => b.disabled = true);
    
    const cNum = getComputerChoice();
    const isBatting = GAME_STATE.playerRole === 'batting';
    const batNum = isBatting ? pNum : cNum;
    const bowlNum = isBatting ? cNum : pNum;
    
    // Reset stumps before animation
    document.getElementById('player-stumps').classList.remove('stump-broken');
    
    // ANIMATION PHASE 1: Bowling (Smooth)
    const ballAnim = document.getElementById('anim-ball');
    ballAnim.classList.remove('hidden', 'ball-bowl', 'ball-hit');
    void ballAnim.offsetWidth;
    ballAnim.classList.add('ball-bowl');
    
    setTimeout(() => {
        // ANIMATION PHASE 2: Hit or Out
        const out = batNum === bowlNum;
        const runs = out ? 0 : batNum;
        
        const overlay = document.getElementById('action-overlay');
        const actionText = document.getElementById('action-text');
        
        document.getElementById('disp-player').innerText = pNum;
        document.getElementById('disp-cpu').innerText = cNum;
        
        if (out) {
            playSound('out'); // "Ohhhh" Crowd Sigh
            actionText.innerText = 'OUT!';
            actionText.className = 'action-text action-out';
            document.body.classList.add('shake-anim');
            document.getElementById('player-stumps').classList.add('stump-broken');
            setTimeout(() => document.body.classList.remove('shake-anim'), 400);
            
            const cur = GAME_STATE.currentInnings === 1 ? GAME_STATE.innings1 : GAME_STATE.innings2;
            addCommentary(`<strong>WICKET!</strong> Caught and bowled. Wicket number ${cur.wickets + 1}! (You:${pNum} vs CPU:${cNum})`);
        } else {
            if (runs === 4 || runs === 6) {
                playSound('boundary'); // Crowd Cheer
                actionText.innerText = `${runs} RUNS!`;
                actionText.className = 'action-text action-six';
                
                const flash = document.getElementById('screen-flash');
                flash.classList.remove('hidden', 'flash-anim');
                void flash.offsetWidth;
                flash.classList.add('flash-anim');
                
                ballAnim.classList.add('ball-hit');
                addCommentary(`<strong>BOUNDARY!</strong> Huge shot for ${runs}. (You:${pNum} vs CPU:${cNum})`);
            } else if (runs === 0) {
                playSound('click');
                actionText.innerText = 'DOT BALL';
                actionText.className = 'action-text action-runs';
                addCommentary(`Solid defense. No run. (You:${pNum} vs CPU:${cNum})`);
            } else {
                playSound('hit');
                actionText.innerText = `+${runs}`;
                actionText.className = 'action-text action-runs';
                addCommentary(`Pushed away for ${runs}. (You:${pNum} vs CPU:${cNum})`);
            }
        }
        
        overlay.classList.remove('hidden');
        
        // UPDATE STATE
        const cur = GAME_STATE.currentInnings === 1 ? GAME_STATE.innings1 : GAME_STATE.innings2;
        cur.balls++;
        if(out) cur.wickets++; else cur.runs += runs;
        updateScoreboardUI();
        
        setTimeout(() => {
            overlay.classList.add('hidden');
            ballAnim.classList.add('hidden');
            checkStatus(out);
        }, 1500);
        
    }, 800);
}

function updateScoreboardUI() {
    const cur = GAME_STATE.currentInnings === 1 ? GAME_STATE.innings1 : GAME_STATE.innings2;
    document.getElementById('sb-runs').innerText = cur.runs;
    document.getElementById('sb-wickets').innerText = cur.wickets;
    document.getElementById('sb-overs').innerText = `${Math.floor(cur.balls/6)}.${cur.balls%6}`;
    if (GAME_STATE.currentInnings === 2) updateTargetText();
}

function updateTargetText() {
    const need = GAME_STATE.innings2.target - GAME_STATE.innings2.runs;
    document.getElementById('sb-need-text').innerText = need > 0 ? `NEED ${need} FROM ${GAME_STATE.maxBalls - GAME_STATE.innings2.balls}` : 'REACHED!';
}

function checkStatus(wasOut) {
    const cur = GAME_STATE.currentInnings === 1 ? GAME_STATE.innings1 : GAME_STATE.innings2;
    const over = cur.balls >= GAME_STATE.maxBalls;
    const allOut = cur.wickets >= MAX_WICKETS; // Now 3 Wickets
    
    if (GAME_STATE.currentInnings === 1) {
        if (over || allOut) {
            GAME_STATE.innings2.target = cur.runs + 1;
            GAME_STATE.currentInnings = 2;
            GAME_STATE.playerRole = GAME_STATE.playerRole === 'batting' ? 'bowling' : 'batting';
            
            const overlay = document.getElementById('action-overlay');
            document.getElementById('action-text').innerText = `TARGET: ${GAME_STATE.innings2.target}`;
            document.getElementById('action-text').className = 'action-text text-gold';
            overlay.querySelector('.vs-choices').classList.add('hidden');
            overlay.classList.remove('hidden');
            
            addCommentary(`<strong>INNINGS BREAK.</strong> Target is ${GAME_STATE.innings2.target}.`);
            
            setTimeout(() => { 
                overlay.classList.add('hidden');
                overlay.querySelector('.vs-choices').classList.remove('hidden');
                setupInningsUI(); 
                GAME_STATE.isProcessingBall = false; 
            }, 3000);
        } else resumePlay();
    } else {
        const targetReached = cur.runs >= cur.target;
        if (targetReached || over || allOut) endMatch(targetReached);
        else resumePlay();
    }
}

function resumePlay() {
    GAME_STATE.isProcessingBall = false;
    document.querySelectorAll('.num-btn').forEach(b => b.disabled = false);
}

function endMatch() {
    let winType = ''; let winner = null;
    const t1 = GAME_STATE.innings1; const t2 = GAME_STATE.innings2;
    
    if (t2.runs >= t2.target) { winner = t2.team; winType = 'Chased target successfully'; }
    else if (t2.runs < t1.runs) { winner = t1.team; winType = `Won by ${t1.runs - t2.runs} runs`; }
    else { winner = 'tie'; winType = 'Match Tied'; }
    
    if (winner === 'player') playSound('win');
    
    const rt = document.getElementById('result-title');
    if(winner === 'player') { rt.innerText='VICTORY'; rt.style.color='var(--green)'; }
    else if (winner === 'cpu') { rt.innerText='DEFEAT'; rt.style.color='var(--red)'; }
    else { rt.innerText='TIED'; rt.style.color='var(--gold)'; }
    
    const pI = t1.team === 'player' ? t1 : t2;
    const cI = t1.team === 'cpu' ? t1 : t2;
    document.getElementById('res-player-score').innerText = `${pI.runs}-${pI.wickets}`;
    document.getElementById('res-cpu-score').innerText = `${cI.runs}-${cI.wickets}`;
    document.getElementById('result-summary').innerText = winType;
    
    saveMatchStats(winner, pI.runs);
    switchScreen('result');
}

// --- STATS ---
let stats = { played: 0, wins: 0, losses: 0, ties: 0, highScore: 0 };
function loadStats() {
    const s = localStorage.getItem('nc_stats_v6');
    if (s) stats = JSON.parse(s);
}
function saveMatchStats(winner, pRuns) {
    stats.played++;
    if(winner === 'player') stats.wins++;
    else if(winner === 'cpu') stats.losses++;
    else stats.ties++;
    if(pRuns > stats.highScore) stats.highScore = pRuns;
    localStorage.setItem('nc_stats_v6', JSON.stringify(stats));
}
function updateStatsUI() {
    document.getElementById('stat-played').innerText = stats.played;
    document.getElementById('stat-wins').innerText = stats.wins;
    document.getElementById('stat-losses').innerText = stats.losses;
    document.getElementById('stat-ties').innerText = stats.ties;
    document.getElementById('stat-high-score').innerText = stats.highScore;
    document.getElementById('stat-winrate').innerText = stats.played > 0 ? Math.round((stats.wins/stats.played)*100)+'%' : '0%';
}

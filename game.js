// ============================================
// EPIC MULTIPLAYER DRAWING GAME - P2P
// ============================================

// DOM Elements
const loadingDiv = document.getElementById('loading');
const gameDiv = document.getElementById('game');
const lobbyDiv = document.getElementById('lobby');
const canvas = document.getElementById('canvas');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearButton = document.getElementById('clearButton');
const guessInput = document.getElementById('guessInput');
const submitGuess = document.getElementById('submitGuess');
const leaderboard = document.getElementById('leaderboard');
const chatFeed = document.getElementById('chatFeed');
const timer = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const roundInfo = document.getElementById('roundInfo');
const playerIdDisplay = document.getElementById('playerIdDisplay');
const joinPeerIdInput = document.getElementById('joinPeerIdInput');
const hostBtn = document.getElementById('hostBtn');
const joinBtn = document.getElementById('joinBtn');
const difficultySelect = document.getElementById('difficulty');

// Game State
let drawing = false, prevX = 0, prevY = 0;
let color = colorPicker.value;
let size = parseInt(brushSize.value, 10);

// P2P & Multiplayer State
let peer = null, peerId = null, connections = new Map();
let isHost = false, hostId = null;
let gameState = {
    difficulty: 'normal',
    word: '',
    words: [],
    timeLeft: 30,
    roundsCompleted: 0,
    totalRounds: 10,
    gameActive: false
};

// Local State
let myScore = 0, myName = `Player${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
let playerScores = {};
let timerInterval = null;

// ---- PeerJS Setup ----aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
peer = new Peer(undefined, {
    host: 'peerjs.com',
    port: 9000,
    path: '/peerjs',
    secure: true
});

peer.on('open', (id) => {
    peerId = id;
    playerIdDisplay.textContent = id;
    hostBtn.disabled = false;
    joinBtn.disabled = false;
});

peer.on('connection', (conn) => {
    setupConnection(conn);
});


// ---- Lobby Functions ----
function hostGame() {
    isHost = true;
    hostId = peerId;
    gameState.difficulty = difficultySelect.value;
    gameState.totalRounds = gameState.difficulty === 'easy' ? 5 : gameState.difficulty === 'hard' ? 15 : 10;
    
    loadingDiv.classList.add('hidden');
    lobbyDiv.classList.add('hidden');
    gameDiv.classList.remove('hidden');
    
    addChatMessage('System', '✅ You are hosting!', '#667eea');
    addChatMessage('System', `Difficulty: ${gameState.difficulty.toUpperCase()}`, '#667eea');
    
    setTimeout(() => fetchWordsAndStart(), 500);
}

function joinGame() {
    const targetId = joinPeerIdInput.value.trim();
    if (!targetId) {
        alert('Please enter a Peer ID');
        return;
    }
    
    isHost = false;
    hostId = targetId;
    gameState.difficulty = 'normal'; // Will be set by host
    
    const conn = peer.connect(targetId);
    setupConnection(conn);
    
    conn.on('open', () => {
        conn.send({ type: 'join', playerId: peerId, name: myName });
    });
}

function setupConnection(conn) {
    const connId = conn.peer;
    connections.set(connId, conn);
    
    conn.on('data', (data) => {
        handleMessage(data, connId);
    });
    
    conn.on('close', () => {
        connections.delete(connId);
        delete playerScores[connId];
        updateLeaderboard();
    });
}

function sendToAll(message) {
    connections.forEach((conn) => {
        conn.send(message);
    });
}

function handleMessage(data, fromId) {
    switch(data.type) {
        case 'join':
            if (isHost) {
                playerScores[data.playerId] = { name: data.name, score: 0 };
                const conn = connections.get(fromId);
                if (conn) {
                    conn.send({
                        type: 'gameState',
                        difficulty: gameState.difficulty,
                        word: gameState.word,
                        roundsCompleted: gameState.roundsCompleted,
                        totalRounds: gameState.totalRounds,
                        gameActive: gameState.gameActive,
                        timeLeft: gameState.timeLeft,
                        playerScores: playerScores
                    });
                }
                updateLeaderboard();
                sendToAll({ type: 'playerJoined', playerId: data.playerId, name: data.name, scores: playerScores });
                addChatMessage('System', `${data.name} joined!`, '#98FB98');
            }
            break;
            
        case 'playerJoined':
            if (!isHost) {
                playerScores = data.scores;
                updateLeaderboard();
                addChatMessage('System', `${data.name} joined!`, '#98FB98');
            }
            break;
            
        case 'gameState':
            if (!isHost) {
                gameState.difficulty = data.difficulty;
                gameState.word = data.word;
                gameState.roundsCompleted = data.roundsCompleted;
                gameState.totalRounds = data.totalRounds;
                gameState.gameActive = data.gameActive;
                gameState.timeLeft = data.timeLeft;
                playerScores = data.playerScores;
                
                if (!lobbyDiv.classList.contains('hidden')) {
                    loadingDiv.classList.add('hidden');
                    lobbyDiv.classList.add('hidden');
                    gameDiv.classList.remove('hidden');
                }
                
                if (data.gameActive && gameState.word) {
                    roundInfo.textContent = `Guess: "${gameState.word}" (Round ${gameState.roundsCompleted}/${gameState.totalRounds})`;
                }
                updateLeaderboard();
            }
            break;
            
        case 'guess':
            addChatMessage(data.playerName, data.guess, data.isCorrect ? '#90EE90' : '#FFB6C6');
            if (data.scores) playerScores = data.scores;
            updateLeaderboard();
            break;
            
        case 'nextRound':
            if (!isHost) {
                gameState.word = data.word;
                gameState.roundsCompleted = data.roundsCompleted;
                gameState.timeLeft = data.timeLeft;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                roundInfo.textContent = `Guess: "${gameState.word}" (Round ${gameState.roundsCompleted}/${gameState.totalRounds})`;
            }
            break;
            
        case 'endGame':
            if (!isHost) {
                playerScores = data.playerScores;
                updateLeaderboard();
                setTimeout(() => {
                    alert(`Game Over!\n\nFinal Scores:\n${Object.entries(data.playerScores).map(([id, p]) => `${p.name}: ${p.score}`).join('\n')}`);
                    location.reload();
                }, 500);
            }
            break;
    }
}

// ---- Word Fetching ----
function fetchWordsAndStart() {
    const wordCount = gameState.totalRounds;
    fetch(`https://random-word-api.herokuapp.com/word?number=${wordCount}`)
        .then(res => res.json())
        .then(data => {
            gameState.words = data;
            playerScores[peerId] = { name: myName, score: 0 };
            broadcastToPlayers();
            nextRound();
        })
        .catch(err => {
            console.error('Error fetching words:', err);
            gameState.words = ['apple', 'cat', 'house', 'sun', 'tree', 'car', 'dog', 'fish', 'book', 'star', 'chair', 'flower', 'mountain', 'ocean', 'guitar'];
            playerScores[peerId] = { name: myName, score: 0 };
            broadcastToPlayers();
            nextRound();
        });
}



// ---- Canvas Drawing ----
canvas.width = canvas.offsetWidth;
canvas.height = 400;
const ctx = canvas.getContext('2d');

canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    [prevX, prevY] = [e.offsetX, e.offsetY];
});
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mouseleave', () => drawing = false);
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.stroke();
    [prevX, prevY] = [e.offsetX, e.offsetY];
});

colorPicker.oninput = e => color = e.target.value;
brushSize.oninput = e => size = parseInt(e.target.value, 10);
clearButton.onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

// ---- Game Loop ----
function nextRound() {
    gameState.roundsCompleted++;
    if (gameState.words.length === 0 || gameState.roundsCompleted > gameState.totalRounds) {
        return endGame();
    }
    
    gameState.word = gameState.words.pop();
    gameState.gameActive = true;
    guessInput.value = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    gameState.timeLeft = gameState.difficulty === 'easy' ? 45 : gameState.difficulty === 'hard' ? 20 : 30;
    timer.textContent = `Time: ${gameState.timeLeft}`;
    roundInfo.textContent = `Guess: "${gameState.word}" (Round ${gameState.roundsCompleted}/${gameState.totalRounds})`;
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameState.timeLeft--;
        timer.textContent = `Time: ${gameState.timeLeft}`;
        if (gameState.timeLeft <= 0) {
            addChatMessage('System', '⏰ Time\'s up!', '#FFD700');
            nextRound();
        }
    }, 1000);
    
    if (isHost) {
        broadcastToPlayers();
    }
}

function broadcastToPlayers() {
    sendToAll({
        type: 'gameState',
        difficulty: gameState.difficulty,
        word: gameState.word,
        roundsCompleted: gameState.roundsCompleted,
        totalRounds: gameState.totalRounds,
        gameActive: gameState.gameActive,
        timeLeft: gameState.timeLeft,
        playerScores: playerScores
    });
}

// ---- Guess Handling ----
submitGuess.onclick = () => {
    const guess = guessInput.value.trim().toLowerCase();
    if (!guess) return;
    
    const isCorrect = guess === gameState.word.toLowerCase();
    let points = 0;
    
    if (isCorrect) {
        points = gameState.difficulty === 'easy' ? 5 : gameState.difficulty === 'hard' ? 20 : 10;
        myScore += points;
        playerScores[peerId].score = myScore;
        scoreDisplay.textContent = myScore;
        clearInterval(timerInterval);
        
        // Broadcast correct guess
        const message = { type: 'guess', playerName: myName, guess: `✅ Guessed "${guess}" (${points} pts)`, isCorrect: true, scores: playerScores };
        addChatMessage(myName, `✅ Guessed "${guess}" (${points} pts)`, '#90EE90');
        if (isHost) {
            sendToAll(message);
            setTimeout(nextRound, 1500);
        } else {
            connections.get(hostId).send(message);
        }
    } else if (guess === "reveal the egg") {
        addChatMessage('System', '🥚 Easter egg found!', '#FFD700');
    } else {
        const message = { type: 'guess', playerName: myName, guess: `❌ Guessed "${guess}"`, isCorrect: false };
        addChatMessage(myName, `❌ Guessed "${guess}"`, '#FFB6C6');
        if (!isHost) {
            connections.get(hostId).send(message);
        } else {
            sendToAll(message);
        }
    }
    
    guessInput.value = '';
    updateLeaderboard();
};

// ---- Leaderboard ----
function updateLeaderboard() {
    const sorted = Object.entries(playerScores).sort(([,a], [,b]) => b.score - a.score);
    leaderboard.innerHTML = sorted.map(([id, p], idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
        const isMe = id === peerId ? ' (YOU)' : '';
        return `<li>${medal} ${p.name}: ${p.score} pts${isMe}</li>`;
    }).join('');
}

// ---- Chat Feed ----
function addChatMessage(player, message, color = '#333') {
    const msgEl = document.createElement('div');
    msgEl.innerHTML = `<span style="font-weight: bold; color: ${color}">${player}:</span> ${message}`;
    msgEl.style.padding = '4px 8px';
    msgEl.style.marginBottom = '4px';
    msgEl.style.borderRadius = '4px';
    msgEl.style.backgroundColor = '#f9f9f9';
    msgEl.style.fontSize = '0.9rem';
    chatFeed.appendChild(msgEl);
    chatFeed.scrollTop = chatFeed.scrollHeight;
}

// ---- End Game ----
function endGame() {
    clearInterval(timerInterval);
    gameState.gameActive = false;
    
    if (isHost) {
        sendToAll({ type: 'endGame', playerScores: playerScores });
    }
    
    const sorted = Object.entries(playerScores).sort(([,a], [,b]) => b.score - a.score);
    const scoreText = sorted.map(([, p]) => `${p.name}: ${p.score}`).join('\n');
    
    alert(`🎮 GAME OVER!\n\nFinal Leaderboard:\n${scoreText}`);
    location.reload();
}

// ---- Init ----
window.onload = () => {
    loadingDiv.classList.add('hidden');
    lobbyDiv.classList.remove('hidden');
    hostBtn.onclick = hostGame;
    joinBtn.onclick = joinGame;
};


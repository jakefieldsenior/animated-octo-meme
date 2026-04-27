// Elements
const loadingDiv = document.getElementById('loading');
const startBtn = document.getElementById('start');
const gameDiv = document.getElementById('game');
const canvas = document.getElementById('canvas');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearButton = document.getElementById('clearButton');
const guessInput = document.getElementById('guessInput');
const submitGuess = document.getElementById('submitGuess');
const playerList = document.getElementById('playerList');
const timer = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const roundInfo = document.getElementById('roundInfo');
const highScoreMenu = document.getElementById('highScoreMenu');
const highScoreGame = document.getElementById('highScoreGame');
const difficultySelect = document.getElementById('difficulty');

// Drawing state
let drawing = false, prevX = 0, prevY = 0;
let color = colorPicker.value;
let size = parseInt(brushSize.value, 10);

// Game state
let word = "", words = [], score = 0, highScore = localStorage.getItem('highScore') || 0, timeLeft = 30, timerInterval;
let peer = null, peerId = null, connections = [];
let currentPlayers = [];
let difficulty = 'normal', roundsCompleted = 0, totalRounds = 10;

// ---- PeerJS Setup ----
peer = new Peer(undefined, {
    host: 'peerjs.com',
    port: 9000,
    path: '/peerjs',
    secure: true
});
peer.on('open', id => {
    peerId = id;
    startBtn.textContent = `Start Game`;
    startBtn.disabled = false;
});

// Initialize high scores
if (highScoreMenu) highScoreMenu.textContent = highScore;
if (highScoreGame) highScoreGame.textContent = highScore;

startBtn.onclick = startGame;

function startGame() {
    difficulty = difficultySelect ? difficultySelect.value : 'normal';
    totalRounds = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10;
    roundsCompleted = 0;
    score = 0;
    scoreDisplay.textContent = score;
    loadingDiv.classList.add('hidden');
    gameDiv.classList.remove('hidden');
    
    const wordCount = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10;
    fetch(`https://random-word-api.herokuapp.com/word?number=${wordCount}`)
    .then(res => res.json())
    .then(data => {
        words = data;
        nextRound();
    })
    .catch(err => {
        console.error('Error fetching words:', err);
        words = ['apple', 'cat', 'house', 'sun', 'tree', 'car', 'dog', 'fish', 'book', 'star', 'chair', 'flower', 'mountain', 'ocean', 'guitar'];
        nextRound();
    });
    // Try to connect to other peers
    peer.listAllPeers(peerIds => {
        for (const id of peerIds) {
            if (id !== peerId) connectToPeer(id);
        }
    });
}

function connectToPeer(id) {
    const conn = peer.connect(id);
    connections.push(conn);
    conn.on('open', () => {
        conn.send({type: 'join', from: peerId});
    });
    // Add further handling for multiplayer expansion if needed
}

// ---- Drawing ----
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

// ---- Timer, Rounds, & Score ----
function nextRound() {
    roundsCompleted++;
    if (words.length === 0 || roundsCompleted > totalRounds) return endGame();
    word = words.pop();
    guessInput.value = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set time based on difficulty
    timeLeft = difficulty === 'easy' ? 45 : difficulty === 'hard' ? 20 : 30;
    timer.textContent = `Time: ${timeLeft}`;
    roundInfo.textContent = `Draw: "${word}" (Round ${roundsCompleted}/${totalRounds})`;
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timer.textContent = `Time: ${timeLeft}`;
        if (timeLeft <= 0) {
            alert('Time\'s up!');
            nextRound();
        }
    }, 1000);
}

// ---- Guess Handling ----
submitGuess.onclick = () => {
    const guess = guessInput.value.trim().toLowerCase();
    if (guess === word.toLowerCase()) {
        const points = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 20 : 10;
        score += points;
        scoreDisplay.textContent = score;
        clearInterval(timerInterval);
        alert(`Correct! +${points} points`);
        nextRound();
    } else if (guess === "reveal the egg") {
        alert("🥚 You found the Easter egg! Try to guess normally for real points! 🥚");
    } else if (guess.length > 0) {
        alert('Incorrect! Try again.');
    }
}

// ---- Player List (basic offline for now) ----
function updatePlayers() {
    playerList.innerHTML = `<li>Player: ${peerId}</li>`;
}
setInterval(updatePlayers, 2000);

// ---- End Game ----
function endGame() {
    clearInterval(timerInterval);
    let message = `Game Over! Final Score: ${score}`;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        if (highScoreMenu) highScoreMenu.textContent = highScore;
        if (highScoreGame) highScoreGame.textContent = highScore;
        message += '\n🏆 NEW HIGH SCORE! 🏆';
    }
    
    alert(message);
    gameDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    guessInput.value = "";
    score = 0;
    scoreDisplay.textContent = score;
    words = [];
    roundInfo.textContent = "Game Over!";
    startBtn.disabled = false;
}

window.onload = () => {
    updatePlayers();
};

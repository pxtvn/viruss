// Lấy tham chiếu đến canvas và context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Thiết lập kích thước canvas
canvas.width = 800;
canvas.height = 600;

// Tham chiếu đến phần tử giao diện
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const backgroundMusic = document.getElementById('backgroundMusic');
const errorMessage = document.getElementById('errorMessage');

// Tải hình ảnh (đường dẫn cục bộ)
const characterImage = new Image();
characterImage.src = 'character.png';

const poleTopImage = new Image();
poleTopImage.src = 'pole1.png';

const poleBottomImage = new Image();
poleBottomImage.src = 'pole2.png';

// Các biến toàn cục
let fish = {
    x: 150,
    y: canvas.height / 2,
    width: 110,
    height: 110,
    hitboxWidth: 110 * 0.75, // Hitbox nhỏ hơn 25%
    hitboxHeight: 110 * 0.75,
    velocity: 0,
    gravity: 0.4,
    jump: -8
};

let poles = [];
let pearls = [];
let score = 0;
let gameState = 'start';
let isMoving = false;
const poleGap = 250;
const poleSpeedInitial = 4.5;
let poleSpeed = poleSpeedInitial;
const poleSpacing = 350;
let frameCount = 0;
const minPoleHeight = 90;
const maxPoleHeight = 300;
const poleHitboxReduction = 0.4; // Thu hẹp hitbox 40% (chỉ còn 60% chiều rộng)

// Biến cho hiệu ứng sóng
let waveOffset = 0;

// Hiệu ứng sóng cho chữ
const waveTextElements = document.querySelectorAll('.wave-text');
waveTextElements.forEach(element => {
    const text = element.textContent;
    element.textContent = '';
    for (let i = 0; i < text.length; i++) {
        const span = document.createElement('span');
        span.textContent = text[i];
        span.style.setProperty('--i', i);
        element.appendChild(span);
    }
});

// Tạo cột (pole)
function spawnPole() {
    const availableSpace = canvas.height - poleGap - (2 * minPoleHeight);
    const randomVariation = Math.floor(Math.random() * availableSpace);
    const topHeight = minPoleHeight + randomVariation;
    const bottomHeight = canvas.height - topHeight - poleGap;
    poles.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomHeight: bottomHeight,
        width: 120, // Chiều rộng cột giống React
        hitboxWidth: 120 * (1 - poleHitboxReduction), // Hitbox nhỏ hơn 40%
        scored: false
    });
}

// Tạo ngọc trai (điểm thưởng)
function spawnPearl(pole) {
    pearls.push({
        x: pole.x + pole.width / 2,
        y: pole.topHeight + poleGap / 2,
        radius: 10
    });
}

// Vẽ nhân vật
function drawFish() {
    try {
        if (characterImage.complete && characterImage.naturalWidth > 0) {
            ctx.drawImage(characterImage, fish.x, fish.y, fish.width, fish.height);
        } else {
            ctx.fillStyle = 'orange';
            ctx.fillRect(fish.x, fish.y, fish.width, fish.height);
            console.warn('Character image not loaded, using placeholder.');
        }
    } catch (e) {
        console.error('Error drawing fish:', e);
    }
}

// Vẽ cột (pole) với hiệu ứng sóng
function drawPoles() {
    try {
        poles.forEach(pole => {
            // Vẽ hitbox (lớp trong suốt 20%, màu xanh lá)
            ctx.save();
            ctx.globalAlpha = 0.2; // Đổi opacity thành 20%
            ctx.fillStyle = 'green'; // Đổi màu thành xanh lá
            const hitboxOffsetX = (pole.width - pole.hitboxWidth) / 2;
            ctx.fillRect(pole.x + hitboxOffsetX, 0, pole.hitboxWidth, pole.topHeight);
            ctx.fillRect(pole.x + hitboxOffsetX, canvas.height - pole.bottomHeight, pole.hitboxWidth, pole.bottomHeight);
            ctx.restore();

            // Vẽ hình ảnh cột
            if (poleTopImage.complete && poleTopImage.naturalWidth > 0) {
                ctx.drawImage(poleTopImage, pole.x, 0, pole.width, pole.topHeight);
            } else {
                ctx.fillStyle = 'green';
                ctx.fillRect(pole.x, 0, pole.width, pole.topHeight);
                console.warn('Pole top image not loaded, using placeholder.');
            }

            if (poleBottomImage.complete && poleBottomImage.naturalWidth > 0) {
                ctx.drawImage(poleBottomImage, pole.x, canvas.height - pole.bottomHeight, pole.width, pole.bottomHeight);
            } else {
                ctx.fillStyle = 'green';
                ctx.fillRect(pole.x, canvas.height - pole.bottomHeight, pole.width, pole.bottomHeight);
                console.warn('Pole bottom image not loaded, using placeholder.');
            }

            // Vẽ hiệu ứng sóng
            ctx.save();
            ctx.globalAlpha = 0.3;
            const gradient = ctx.createLinearGradient(pole.x + waveOffset, 0, pole.x + pole.width + waveOffset, 0);
            gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
            gradient.addColorStop(0.25, 'rgba(255,255,255,0.3)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
            gradient.addColorStop(0.75, 'rgba(255,255,255,0.3)');
            gradient.addColorStop(1, 'rgba(255,255,255,0.1)');
            
            // Cột trên
            ctx.fillStyle = gradient;
            ctx.fillRect(pole.x, 0, pole.width, pole.topHeight);
            // Cột dưới
            ctx.fillRect(pole.x, canvas.height - pole.bottomHeight, pole.width, pole.bottomHeight);
            ctx.restore();
        });

        // Cập nhật offset cho hiệu ứng sóng
        waveOffset += 2;
        if (waveOffset > pole.width * 2) {
            waveOffset = 0;
        }
    } catch (e) {
        console.error('Error in drawPoles:', e);
    }
}

// Vẽ ngọc trai
function drawPearls() {
    try {
        ctx.fillStyle = 'white';
        pearls.forEach(pearl => {
            ctx.beginPath();
            ctx.arc(pearl.x, pearl.y, pearl.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    } catch (e) {
        console.error('Error in drawPearls:', e);
    }
}

// Vẽ nền (màu đại dương)
function drawBackground() {
    try {
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } catch (e) {
        console.error('Error in drawBackground:', e);
    }
}

// Vẽ điểm số (bám theo nhân vật)
function drawScore() {
    try {
        if (gameState === 'play') {
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            const scoreX = fish.x + fish.width / 2;
            const scoreY = fish.y - 20;
            ctx.fillText(`Score: ${score}`, scoreX, scoreY);
        }
    } catch (e) {
        console.error('Error in drawScore:', e);
    }
}

// Cập nhật vị trí nhân vật
function updateFish() {
    try {
        if (!isMoving) return;

        fish.velocity += fish.gravity;
        fish.y += fish.velocity;

        if (fish.y < 0) {
            fish.y = 0;
            setGameOver();
        }

        if (fish.y + fish.height > canvas.height) {
            fish.y = canvas.height - fish.height;
            setGameOver();
        }
    } catch (e) {
        console.error('Error in updateFish:', e);
    }
}

// Cập nhật cột
function updatePoles() {
    try {
        if (gameState !== 'play') return;

        frameCount++;

        const framesPerPole = poleSpacing / poleSpeed;
        if (frameCount >= framesPerPole) {
            spawnPole();
            frameCount = 0;
        }

        poles.forEach(pole => {
            pole.x -= poleSpeed;

            const fishHitboxX = fish.x + (fish.width - fish.hitboxWidth) / 2;
            const fishHitboxY = fish.y + (fish.height - fish.hitboxHeight) / 2;
            const fishHitboxRight = fishHitboxX + fish.hitboxWidth;
            const fishHitboxBottom = fishHitboxY + fish.hitboxHeight;
            const poleHitboxOffsetX = (pole.width - pole.hitboxWidth) / 2;
            const poleHitboxLeft = pole.x + poleHitboxOffsetX;
            const poleHitboxRight = poleHitboxLeft + pole.hitboxWidth;

            if (fishHitboxRight > poleHitboxLeft && fishHitboxX < poleHitboxRight) {
                if (fishHitboxY < pole.topHeight || fishHitboxBottom > canvas.height - pole.bottomHeight) {
                    setGameOver();
                }
            }

            if (!pole.scored && pole.x + pole.width < fish.x) {
                score++;
                pole.scored = true;
                if (Math.random() < 0.5) {
                    spawnPearl(pole);
                }
            }
        });

        poles = poles.filter(pole => pole.x + pole.width > 0);

        // Cập nhật tốc độ game dựa trên điểm số
        if (score >= 20) {
            poleSpeed = 6.0;
        } else if (score >= 10) {
            poleSpeed = 5.5;
        } else {
            poleSpeed = poleSpeedInitial;
        }
    } catch (e) {
        console.error('Error in updatePoles:', e);
    }
}

// Cập nhật ngọc trai
function updatePearls() {
    try {
        pearls.forEach((pearl, index) => {
            pearl.x -= poleSpeed;

            const dx = fish.x + fish.width / 2 - pearl.x;
            const dy = fish.y + fish.height / 2 - pearl.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < fish.width / 2 + pearl.radius) {
                score += 2;
                pearls.splice(index, 1);
            }
        });

        pearls = pearls.filter(pearl => pearl.x + pearl.radius > 0);
    } catch (e) {
        console.error('Error in updatePearls:', e);
    }
}

// Đặt trạng thái game over
function setGameOver() {
    try {
        gameState = 'end';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'block';
        finalScoreElement.textContent = score;
        restartButton.style.display = 'block';
        if (backgroundMusic) {
            backgroundMusic.pause();
        }
    } catch (e) {
        console.error('Error in setGameOver:', e);
    }
}

// Reset game
function resetGame() {
    try {
        fish.y = canvas.height / 2;
        fish.velocity = 0;
        poles = [];
        pearls = [];
        score = 0;
        frameCount = 0;
        gameState = 'start';
        isMoving = false;
        startScreen.style.display = 'block';
        gameOverScreen.style.display = 'none';
        restartButton.style.display = 'none';
        poleSpeed = poleSpeedInitial;
        spawnPole();
        if (backgroundMusic) {
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().catch(e => {
                console.error("Audio playback failed:", e);
                errorMessage.style.display = 'block';
            });
        }
    } catch (e) {
        console.error('Error in resetGame:', e);
    }
}

// Xử lý sự kiện nhấn phím
document.addEventListener('keydown', (e) => {
    try {
        if (e.code === 'Space') {
            if (gameState === 'start') {
                gameState = 'play';
                isMoving = true;
                startScreen.style.display = 'none';
                if (backgroundMusic) {
                    backgroundMusic.currentTime = 0;
                    backgroundMusic.play().catch(e => {
                        console.error("Audio playback failed:", e);
                        errorMessage.style.display = 'block';
                    });
                }
            } else if (gameState === 'play') {
                fish.velocity = fish.jump;
            } else if (gameState === 'end') {
                resetGame();
            }
        }
    } catch (e) {
        console.error('Error in keydown event:', e);
    }
});

// Xử lý sự kiện nhấn button Restart
restartButton.addEventListener('click', () => {
    try {
        resetGame();
    } catch (e) {
        console.error('Error in restartButton click:', e);
    }
});

// Vòng lặp chính của trò chơi
function gameLoop() {
    try {
        if (gameState === 'play') {
            updateFish();
            updatePoles();
            updatePearls();
        }

        drawBackground();
        drawPoles();
        drawPearls();
        drawFish();
        drawScore();

        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error('Error in gameLoop:', e);
    }
}

// Đợi hình ảnh tải xong trước khi bắt đầu trò chơi
Promise.all([
    new Promise((resolve, reject) => {
        characterImage.onload = () => {
            console.log('Character image loaded successfully.');
            resolve();
        };
        characterImage.onerror = () => {
            console.error('Failed to load character image at:', characterImage.src);
            resolve(); // Tiếp tục với placeholder
        };
    }),
    new Promise((resolve, reject) => {
        poleTopImage.onload = () => {
            console.log('Pole top image loaded successfully.');
            resolve();
        };
        poleTopImage.onerror = () => {
            console.error('Failed to load pole top image at:', poleTopImage.src);
            resolve(); // Tiếp tục với placeholder
        };
    }),
    new Promise((resolve, reject) => {
        poleBottomImage.onload = () => {
            console.log('Pole bottom image loaded successfully.');
            resolve();
        };
        poleBottomImage.onerror = () => {
            console.error('Failed to load pole bottom image at:', poleBottomImage.src);
            resolve(); // Tiếp tục với placeholder
        };
    })
]).then(() => {
    console.log('All images loaded successfully or using placeholders.');
    spawnPole();
    gameLoop();
}).catch(err => {
    console.error('Unexpected error loading resources:', err);
    errorMessage.style.display = 'block';
    startScreen.style.display = 'block';
    spawnPole();
    gameLoop();
});
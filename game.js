// PROTENIA QUEST - El Viaje de la Proteína
// Un juego tipo Mario Bros educativo
// NUEVO NOMBRE: TRIPTOFANITO - Un Viaje por el Cuerpo Humano

const canvas = document.getElementById('gameCanvas');
if (!canvas) {
    alert('Error: Canvas no encontrado. Revisa el HTML.');
    throw new Error('Canvas not found');
}
const ctx = canvas.getContext('2d');

// ==================== VARIABLES GLOBALES ====================
let gameRunning = false;
let gamePaused = false;
let gameStarted = false;
let score = 0;
let lives = 5;
let level = 1;
let camera = { x: 0, y: 0 };
let levelGoal = 2000; // Distancia para completar cada nivel
let currentLevelName = '';
let currentObjective = '';
let vitaminsCollected = 0;
let nutrientsCollected = 0;
let heartOrbsCollected = 0;
let neuralSignalsCollected = 0;
let renalFiltersCollected = 0;
let objectiveCompleted = false;
let powerActive = false;
let powerType = '';
let powerTime = 0;
let shieldActive = false;
let dashAvailable = false;
let magnetActive = false;
let magnetTime = 0;
let energy = 0;
let maxEnergy = 100;
let waterGunEquipped = false;
let projectiles = [];
let bossRocks = [];
let boss = null;
const MAX_LIVES = 5;

const levelNames = {
    1: '🫀 BOCA - Entrada al Viaje',
    2: '🫀 ESTÓMAGO - Digestión',
    3: '💓 SISTEMA CIRCULATORIO - Transporte',
    4: '❤️ CORAZÓN - Latidos Vitales',
    5: '🧠 SISTEMA NERVIOSO - Señales Rápidas',
    6: '🧬 RIÑONES - Filtrar y Equilibrar'
};

const levelObjectives = {
    1: 'Recolecta 3 vitaminas para teletransportarte al siguiente nivel',
    2: 'Absorbe 2 nutrientes para teletransportarte al siguiente nivel',
    3: 'Llega al final del sistema circulatorio para teletransportarte al corazón',
    4: 'Reúne 3 orbes de energía del corazón para avanzar',
    5: 'Activa 4 señales nerviosas para avanzar',
    6: 'Recolecta 3 filtros renales y derrota al jefe final con la Pistola de Agua'
};

// ==================== CLASE JUGADOR (PROTEÍNA) ====================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.velocityX = 0;
        this.velocityY = 0;
        this.jumping = false;
        this.onGround = false;
        this.speed = 5;
        this.jumpPower = 12;
        this.gravity = 0.6;
        this.maxVelocityY = 15;
    }

    update() {
        // Aplicar gravedad
        if (this.velocityY < this.maxVelocityY) {
            this.velocityY += this.gravity;
        }

        // Actualizar posición
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Detener movimiento horizontal gradualmente
        if (keys['ArrowLeft'] || keys['a']) {
            this.velocityX = -this.speed;
        } else if (keys['ArrowRight'] || keys['d']) {
            this.velocityX = this.speed;
        } else {
            this.velocityX = 0;
        }

        // Saltar
        if (keys[' '] || keys['w']) {
            if (this.onGround) {
                this.velocityY = -this.jumpPower;
                this.jumping = true;
                this.onGround = false;
            } else if (dashAvailable) {
                // dash en el aire
                this.velocityY = -this.jumpPower * 1.6;
                dashAvailable = false;
            }
        }

        // Colisiones con plataformas
        this.onGround = false;
        platforms.forEach(platform => {
            const platformY = typeof platform.getY === 'function' ? platform.getY() : platform.y;
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y < platformY + platform.height &&
                this.y + this.height > platformY) {
                if (this.velocityY > 0) {
                    this.y = platformY - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                    this.jumping = false;
                }
            }
        });

        // Colisiones con enemigos
        enemies.forEach((enemy, index) => {
            if (this.isCollidingWith(enemy)) {
                if (this.velocityY > 0) {
                    enemy.alive = false;
                    score += 100;
                } else {
                    if (shieldActive) {
                        shieldActive = false; // consume shield
                    } else {
                        lives--;
                        if (lives <= 0) {
                            endGame(false);
                        }
                    }
                }
            }
        });

        // Colisiones con items
        let shouldAdvanceLevel = false;
        items.forEach((item, index) => {
            if (this.isCollidingWith(item)) {
                let multiplier = (powerActive && powerType === 'neurotransmitter') ? 2 : 1;
                score += item.points * multiplier;
                if (item.type === 'vitamin') {
                    vitaminsCollected++;
                } else if (item.type === 'nutrient') {
                    nutrientsCollected++;
                    if (level === 2 && nutrientsCollected >= 2) {
                        shouldAdvanceLevel = true;
                    }
                } else if (item.type === 'heart') {
                    heartOrbsCollected++;
                    if (level === 4 && heartOrbsCollected >= 3) {
                        shouldAdvanceLevel = true;
                    }
                } else if (item.type === 'heartFalse') {
                    // Falso corazón: no cuenta para el objetivo
                    score -= 20;
                } else if (item.type === 'signal') {
                    neuralSignalsCollected++;
                    if (level === 5 && neuralSignalsCollected >= 4) {
                        shouldAdvanceLevel = true;
                    }
                } else if (item.type === 'filter') {
                    renalFiltersCollected++;
                    if (level === 6 && renalFiltersCollected >= 3) {
                        shouldAdvanceLevel = true;
                    }
                } else if (item.type === 'waterGun') {
                    waterGunEquipped = true;
                    if (inventory.length < MAX_INVENTORY) {
                        inventory.push({name: 'Pistola de Agua', effect: 'waterGun', points: 0});
                    }
                    alert('¡Has encontrado la Pistola de Agua! Presiona F para disparar al jefe.');
                } else if (item.type === 'muscle') {
                    powerActive = true;
                    powerType = 'muscle';
                    powerTime = 10000; // 10 segundos
                    this.speed += 2;
                    this.jumpPower += 2;
                } else if (item.type === 'skin') {
                    lives = Math.min(5, lives + 1); // +1 vida
                } else if (item.type === 'neurotransmitter') {
                    powerActive = true;
                    powerType = 'neurotransmitter';
                    powerTime = 15000; // 15 segundos
                    // Doble puntos temporal
                }
                items.splice(index, 1);
            }
        });

        electricHazards.forEach((hazard, index) => {
            if (this.isCollidingWith(hazard)) {
                hazard.alive = false;
                if (shieldActive) {
                    shieldActive = false;
                } else {
                    lives--;
                    if (lives <= 0) {
                        endGame(false);
                    }
                }
            }
        });

        if (boss && boss.alive && this.isCollidingWith(boss)) {
            // El jefe final no daña por contacto directo; solo sus subditos rocosos son peligrosos.
        }

        if (shouldAdvanceLevel) {
            if (level === 6) {
                boss = new Boss(1700, 260, 10);
                objectiveCompleted = true;
                updateLevelInfo();
                currentObjective = 'Usa la pistola de agua y derrota al jefe final.';
                alert('¡Has recolectado los 3 filtros! Ahora derrota al jefe con la Pistola de Agua.');
                return;
            }
            level++;
            score += 500;
            initLevel(level);
            return;
        }

        // Manejar poderes temporales
        if (powerActive) {
            powerTime -= 16; // ~60fps
            if (powerTime <= 0) {
                powerActive = false;
                if (powerType === 'muscle') {
                    this.speed -= 2;
                    this.jumpPower -= 2;
                } else if (powerType === 'adrenaline') {
                    this.speed -= 3;
                }
                powerType = '';
            }
        }

        // Pérdida de vida por caída
        if (this.y > canvas.height) {
            if (level === 1) {
                level = 6;
                initLevel(6);
                return;
            }
            if (level === 6) {
                this.y = 520;
                this.velocityY = 0;
            } else {
                lives--;
                if (lives <= 0) {
                    endGame(false);
                } else {
                    resetLevel();
                }
            }
        }

        // Ganar nivel
        if (objectiveCompleted && this.x > levelGoal) {
            if (level >= 6) {
                endGame(true);
            } else {
                level++;
                score += 500;
                initLevel(level);
            }
        }

        // Actualizar cámara
        camera.x = Math.max(0, this.x - canvas.width / 4);
    }

    isCollidingWith(object) {
        return this.x < object.x + object.width &&
               this.x + this.width > object.x &&
               this.y < object.y + object.height &&
               this.y + this.height > object.y;
    }

    draw() {
        // Cuerpo (círculo - ovalado como una proteína)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, 
                   this.width / 2.5, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ojos
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 28, this.y + 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Boca
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 22, 3, 0, Math.PI);
        ctx.stroke();
    }
}

// ==================== CLASE ENEMIGOS ====================
class Enemy {
    constructor(x, y, type = 'virus') {
        this.x = x;
        this.y = y;
        this.width = 35;
        this.height = 35;
        this.type = type; // 'virus', 'bacteria' o 'rock'
        this.alive = true;
        this.direction = 1;
        if (type === 'rock') {
            this.velocityX = 1.8;
            this.velocityY = 2.5;
            this.direction = -1;
        } else {
            this.velocityX = 3;
            this.velocityY = 0;
        }
    }

    update() {
        if (this.type === 'rock') {
            this.x += this.velocityX * this.direction;
            this.y += this.velocityY;
            if (this.x < 0 || this.x + this.width > level * 2000) {
                this.direction *= -1;
            }
            if (this.y > canvas.height) {
                this.alive = false;
            }
        } else {
            this.x += this.velocityX * this.direction;
            if (this.x < 0 || this.x + this.width > level * 2000) {
                this.direction *= -1;
            }
        }
    }

    draw() {
        if (!this.alive) return;
        if (this.type === 'rock') {
            ctx.fillStyle = '#7A7A7A';
            ctx.beginPath();
            ctx.moveTo(this.x + 8, this.y);
            ctx.lineTo(this.x + this.width - 4, this.y + 10);
            ctx.lineTo(this.x + this.width, this.y + this.height - 6);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height);
            ctx.lineTo(this.x + 4, this.y + this.height - 10);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            return;
        }

        if (this.type === 'virus') {
            // Virus - forma punteada roja
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 
                   this.width / 2, 0, Math.PI * 2);
            ctx.fill();

            // Púas del virus
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const startX = this.x + this.width / 2 + Math.cos(angle) * (this.width / 2);
                const startY = this.y + this.height / 2 + Math.sin(angle) * (this.height / 2);
                const endX = this.x + this.width / 2 + Math.cos(angle) * (this.width / 2 + 8);
                const endY = this.y + this.height / 2 + Math.sin(angle) * (this.height / 2 + 8);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (this.type === 'bacteria') {
            // Bacteria - forma de bastón verde
            ctx.fillStyle = '#00AA00';
            ctx.fillRect(this.x, this.y + this.height / 3, this.width, this.height / 3);
            
            // Flagelos
            ctx.strokeStyle = '#00AA00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.quadraticCurveTo(
                this.x + this.width + 10,
                this.y + this.height / 2 - 5,
                this.x + this.width - 5,
                this.y + this.height / 2
            );
            ctx.stroke();
        }
    }
}

// ==================== CLASE ITEMS ====================
class Item {
    constructor(x, y, type = 'vitamin') {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type; // 'vitamin', 'nutrient', 'muscle', 'skin', 'neurotransmitter', 'heart', 'heartFalse', 'signal', 'filter'
        this.points = type === 'vitamin' ? 50 : type === 'nutrient' ? 25 : type === 'heartFalse' ? 0 : 100;
        this.bounce = 0;
    }

    update() {
        this.bounce += 0.1;
    }

    draw() {
        const bounceOffset = Math.sin(this.bounce) * 3;

        if (this.type === 'vitamin') {
            // Vitamina - estrella
            ctx.fillStyle = '#FF00FF';
            drawStar(this.x + this.width / 2, this.y + this.width / 2 + bounceOffset, 5, 10, 5);
        } else if (this.type === 'nutrient') {
            // Nutriente - gota
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + 8 + bounceOffset, this.width / 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'muscle') {
            // Músculo - cuadrado rojo
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(this.x + 2, this.y + 2 + bounceOffset, this.width - 4, this.height - 4);
            ctx.strokeStyle = '#CC0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x + 2, this.y + 2 + bounceOffset, this.width - 4, this.height - 4);
        } else if (this.type === 'skin') {
            // Piel - óvalo marrón
            ctx.fillStyle = '#D2691E';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2 + bounceOffset, 
                       this.width / 2.5, this.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'neurotransmitter') {
            // Neurotransmisor - rayo amarillo
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.moveTo(this.x + 5, this.y + 5 + bounceOffset);
            ctx.lineTo(this.x + 10, this.y + 10 + bounceOffset);
            ctx.lineTo(this.x + 8, this.y + 15 + bounceOffset);
            ctx.lineTo(this.x + 15, this.y + 8 + bounceOffset);
            ctx.lineTo(this.x + 12, this.y + 18 + bounceOffset);
            ctx.lineTo(this.x + this.width - 5, this.y + this.height - 5 + bounceOffset);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'heart') {
            // Orbe de corazón verdadero - forma de corazón rojo
            ctx.fillStyle = '#FF4D4D';
            ctx.strokeStyle = '#CC0033';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height - 4 + bounceOffset);
            ctx.bezierCurveTo(this.x + this.width / 2 + 8, this.y + this.height / 2 + bounceOffset,
                              this.x + this.width - 2, this.y + 5 + bounceOffset,
                              this.x + this.width / 2, this.y + 10 + bounceOffset);
            ctx.bezierCurveTo(this.x + 2, this.y + 5 + bounceOffset,
                              this.x + this.width / 2 - 8, this.y + this.height / 2 + bounceOffset,
                              this.x + this.width / 2, this.y + this.height - 4 + bounceOffset);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'heartFalse') {
            // Orbe falso - corazón gris
            ctx.fillStyle = '#CCCCCC';
            ctx.strokeStyle = '#777777';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height - 4 + bounceOffset);
            ctx.bezierCurveTo(this.x + this.width / 2 + 8, this.y + this.height / 2 + bounceOffset,
                              this.x + this.width - 2, this.y + 5 + bounceOffset,
                              this.x + this.width / 2, this.y + 10 + bounceOffset);
            ctx.bezierCurveTo(this.x + 2, this.y + 5 + bounceOffset,
                              this.x + this.width / 2 - 8, this.y + this.height / 2 + bounceOffset,
                              this.x + this.width / 2, this.y + this.height - 4 + bounceOffset);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'signal') {
            // Señal nerviosa - rayo verde
            ctx.fillStyle = '#00FF99';
            ctx.beginPath();
            ctx.moveTo(this.x + 10, this.y + 2 + bounceOffset);
            ctx.lineTo(this.x + this.width - 4, this.y + this.height / 2 + bounceOffset);
            ctx.lineTo(this.x + this.width / 2 + 2, this.y + this.height / 2 + bounceOffset);
            ctx.lineTo(this.x + this.width - 6, this.y + this.height - 2 + bounceOffset);
            ctx.lineTo(this.x + 4, this.y + this.height / 2 + bounceOffset);
            ctx.lineTo(this.x + this.width / 2 - 2, this.y + this.height / 2 + bounceOffset);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'filter') {
            // Filtro renal - cubo azul translúcido
            ctx.fillStyle = '#66CCFF';
            ctx.fillRect(this.x + 4, this.y + 4 + bounceOffset, this.width - 8, this.height - 8);
            ctx.strokeStyle = '#0077CC';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x + 4, this.y + 4 + bounceOffset, this.width - 8, this.height - 8);
        } else if (this.type === 'waterGun') {
            // Pistola de agua - icono azul
            ctx.fillStyle = '#66CCFF';
            ctx.fillRect(this.x + 4, this.y + 8 + bounceOffset, this.width - 8, this.height - 12);
            ctx.fillRect(this.x + 10, this.y + 2 + bounceOffset, this.width - 16, 6);
            ctx.strokeStyle = '#004C99';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x + 4, this.y + 8 + bounceOffset, this.width - 8, this.height - 12);
            ctx.beginPath();
            ctx.moveTo(this.x + 4, this.y + 14 + bounceOffset);
            ctx.lineTo(this.x + 2, this.y + 18 + bounceOffset);
            ctx.lineTo(this.x + 6, this.y + 18 + bounceOffset);
            ctx.stroke();
        }
    }
}

class Projectile {
    constructor(x, y, vx) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 8;
        this.vx = vx;
        this.alive = true;
    }

    update() {
        this.x += this.vx;
        if (this.x > level * 2000 || this.x < -50) {
            this.alive = false;
        }
    }

    draw() {
        ctx.fillStyle = '#00BFFF';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class BossRock {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.width = 18;
        this.height = 18;
        this.vx = vx;
        this.vy = vy;
        this.alive = true;
        this.spawnTimer = 12; // tiempo seguro antes de que pueda dañar al jugador
    }

    update() {
        if (player) {
            const targetX = player.x + player.width / 2;
            const targetY = player.y + player.height / 2;
            let dx = targetX - (this.x + this.width / 2);
            let dy = targetY - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.vx = (dx / dist) * 1.8;
                this.vy = (dy / dist) * 1.8;
            }
        }
        if (this.spawnTimer > 0) {
            this.spawnTimer--;
        }
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < camera.x - 250 || this.x > camera.x + canvas.width + 250 ||
            this.y < -250 || this.y > canvas.height + 250) {
            this.alive = false;
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = '#7A7A7A';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
        ctx.restore();
    }
}

class Boss {
    constructor(x, y, health = 10) {
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 140;
        this.health = health;
        this.maxHealth = health;
        this.alive = true;
        this.offset = 0;
        this.direction = 1;
        this.attackTimer = 0;
        this.attackInterval = 70;
    }

    update() {
        this.offset += 0.5 * this.direction;
        if (this.offset > 10 || this.offset < -10) this.direction *= -1;
        this.attackTimer++;
        if (this.attackTimer >= this.attackInterval) {
            this.attackTimer = 0;
            this.spawnAttack();
        }
    }

    spawnAttack() {
        // El jefe final solamente invoca a sus subditos rocosos.
        const offsetY = 20 + Math.random() * (this.height - 40);
        bossRocks.push(new BossRock(this.x - 22, this.y + offsetY, 0, 0));
        bossRocks.push(new BossRock(this.x + this.width + 4, this.y + offsetY, 0, 0));
    }

    draw() {
        if (!this.alive) return;
        const drawY = this.y + this.offset;
        ctx.fillStyle = '#7A7A7A';
        ctx.fillRect(this.x, drawY, this.width, this.height);
        ctx.fillStyle = '#5B5B5B';
        ctx.fillRect(this.x + 10, drawY + 20, this.width - 20, this.height - 30);
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x + 24, drawY + 30, 20, 20);
        ctx.fillRect(this.x + 76, drawY + 30, 20, 20);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + 30, drawY + 90);
        ctx.lineTo(this.x + 90, drawY + 90);
        ctx.stroke();

        // Health hearts
        for (let i = 0; i < this.maxHealth; i++) {
            const heartX = this.x + 8 + (i % 5) * 18;
            const heartY = drawY - 18 - Math.floor(i / 5) * 18;
            ctx.fillStyle = i < this.health ? '#FF4D4D' : '#CCCCCC';
            ctx.beginPath();
            ctx.moveTo(heartX + 6, heartY + 12);
            ctx.bezierCurveTo(heartX + 6, heartY + 4, heartX, heartY, heartX - 6, heartY + 4);
            ctx.bezierCurveTo(heartX - 12, heartY + 8, heartX + 6, heartY + 22, heartX + 6, heartY + 22);
            ctx.bezierCurveTo(heartX + 6, heartY + 22, heartX + 18, heartY + 8, heartX + 12, heartY + 4);
            ctx.bezierCurveTo(heartX + 12, heartY, heartX + 6, heartY + 4, heartX + 6, heartY + 12);
            ctx.closePath();
            ctx.fill();
        }
    }
}

// ==================== CLASE PLATAFORMAS ====================
class Platform {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'normal', 'moving', 'spike'
        this.offset = 0;
        this.direction = 1;
        this.range = 60;
    }

    getY() {
        return this.type === 'moving' ? this.y + this.offset : this.y;
    }

    update() {
        if (this.type === 'moving') {
            this.offset += 1.8 * this.direction;
            if (this.offset > this.range || this.offset < -this.range) {
                this.direction *= -1;
            }
        }
    }

    draw() {
        const drawY = this.getY();

        // Colores temáticos por nivel
        let fillColor = '#00AA00';
        let strokeColor = '#005500';
        if (level === 1) { // Boca - dientes blancos
            fillColor = '#FFFFFF';
            strokeColor = '#CCCCCC';
        } else if (level === 2) { // Estómago - amarillo ácido
            fillColor = '#FFD700';
            strokeColor = '#FFA500';
        } else if (level === 3) { // Circulatorio - rojo sanguíneo
            fillColor = '#FF6B6B';
            strokeColor = '#CC0000';
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(this.x, drawY, this.width, this.height);

        if (this.type === 'spike') {
            ctx.fillStyle = '#FF0000';
            for (let i = 0; i < this.width; i += 15) {
                ctx.beginPath();
                ctx.moveTo(this.x + i, drawY);
                ctx.lineTo(this.x + i + 7, drawY - 10);
                ctx.lineTo(this.x + i + 15, drawY);
                ctx.fill();
            }
        }

        // Bordes temáticos
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, drawY, this.width, this.height);

        // Detalles temáticos
        if (level === 1) {
            // Dientes: agregar líneas verticales
            ctx.strokeStyle = '#AAAAAA';
            ctx.lineWidth = 1;
            for (let i = 10; i < this.width; i += 20) {
                ctx.beginPath();
                ctx.moveTo(this.x + i, drawY + 5);
                ctx.lineTo(this.x + i, drawY + this.height - 5);
                ctx.stroke();
            }
        } else if (level === 2) {
            // Estómago: ondas para simular ácido
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, drawY + this.height / 2);
            for (let i = 0; i < this.width; i += 10) {
                ctx.lineTo(this.x + i, drawY + this.height / 2 + Math.sin(i / 10) * 5);
            }
            ctx.stroke();
        } else if (level === 3 && this.type !== 'spike') {
            // Circulatorio: líneas curvas para venas
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x + 5, drawY + this.height / 2);
            ctx.bezierCurveTo(
                this.x + this.width / 3, drawY + 10,
                this.x + 2 * this.width / 3, drawY + this.height - 10,
                this.x + this.width - 5, drawY + this.height / 2
            );
            ctx.stroke();
        }
    }
}

// ==================== FUNCIONES AUXILIARES ====================
function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
        rot += step;

        ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

function drawBackgroundHeart(cx, cy, size) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 77, 77, 0.15)';
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.25);
    ctx.bezierCurveTo(cx + size * 0.4, cy - size * 0.2,
                      cx + size * 0.9, cy + size * 0.35,
                      cx, cy + size * 0.85);
    ctx.bezierCurveTo(cx - size * 0.9, cy + size * 0.35,
                      cx - size * 0.4, cy - size * 0.2,
                      cx, cy + size * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawElectricBackground() {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 51, 204, 0.18)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
        const startX = 80 + i * 140;
        const startY = 40;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 20, startY + 60);
        ctx.lineTo(startX - 10, startY + 90);
        ctx.lineTo(startX + 30, startY + 150);
        ctx.lineTo(startX + 10, startY + 210);
        ctx.stroke();
    }
    ctx.restore();
}

class ElectricHazard {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 32;
        this.speed = 4 + Math.random() * 2;
        this.alive = true;
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.alive = false;
        }
    }

    draw() {
        ctx.save();
        ctx.strokeStyle = '#00CCFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x + 8, this.y);
        ctx.lineTo(this.x + 3, this.y + 14);
        ctx.lineTo(this.x + 12, this.y + 14);
        ctx.lineTo(this.x + 6, this.y + 28);
        ctx.stroke();
        ctx.restore();
    }
}

// ==================== CONTROL DE JUEGO ====================
class Shop {
    constructor(x, y, items = []) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 60;
        this.items = items; // {name, price, effect}
    }

    draw() {
        // themed stall + egg vendor graphic
        ctx.save();
        // stall base
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x - 40, this.y - 10, this.width + 40, this.height);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x - 40, this.y - 24, this.width + 40, 14);
        // egg vendor to the left
        const ex = this.x - 60;
        const ey = this.y - 10;
        // egg body
        ctx.fillStyle = '#FFF8E1';
        ctx.beginPath();
        ctx.ellipse(ex, ey + 10, 18, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#E6D8B7';
        ctx.lineWidth = 2;
        ctx.stroke();
        // eyes
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(ex - 6, ey + 5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 6, ey + 5, 3, 0, Math.PI * 2); ctx.fill();
        // smile
        ctx.beginPath(); ctx.arc(ex, ey + 12, 6, 0, Math.PI); ctx.stroke();
        // little hat
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath(); ctx.moveTo(ex - 8, ey - 8); ctx.lineTo(ex, ey - 18); ctx.lineTo(ex + 8, ey - 8); ctx.closePath(); ctx.fill();
        // stall text
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText('TIENDA', this.x - 18, this.y + 40);
        ctx.restore();
        
        // Si la tienda está abierta, dibujar menú de compra en overlay
        if (shopOpen && currentShop) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(80, 80, 640, 440);
            ctx.fillStyle = '#FFF';
            ctx.font = '18px Arial';
            ctx.fillText('TIENDA - Presiona 1-6 para comprar (añade al inventario)', 100, 110);
            // dibujar items
            currentShop.items.forEach((it, i) => {
                const y = 150 + i * 50;
                ctx.fillStyle = '#FFF';
                ctx.fillText((i+1) + '. ' + it.name + ' - ' + it.price + ' pts', 120, y);
            });
            ctx.fillText('Presiona Esc para cerrar', 100, 420);
            ctx.restore();
        }

        // Dibujar inventario en DOM bar
        const invBar = document.getElementById('inventoryBar');
        if (invBar) {
            invBar.innerHTML = '';
            inventory.forEach((it, i) => {
                const btn = document.createElement('button');
                btn.textContent = (i+1) + ': ' + it.name;
                btn.style.margin = '4px';
                btn.onclick = () => { useInventoryItem(i); };
                invBar.appendChild(btn);
            });
            if (inventory.length === 0) invBar.textContent = 'Inventario vacío';
        }

        // Si inventario abierto, dibujar overlay para usar items
        if (inventoryOpen) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(150, 150, 500, 300);
            ctx.fillStyle = '#FFF';
            ctx.font = '18px Arial';
            ctx.fillText('INVENTARIO - Presiona 1-' + Math.min(inventory.length,6) + ' para usar', 180, 180);
            inventory.forEach((it, i) => {
                ctx.fillText((i+1) + '. ' + it.name, 180, 220 + i*30);
            });
            ctx.fillText('Presiona I para cerrar', 180, 420);
            ctx.restore();
        }
    }
}
let player;
let platforms = [];
let enemies = [];
let items = [];
let electricHazards = [];
let hazardSpawnTimer = 0;
let hazardSpawnInterval = 90;
let shops = [];
let shopOpen = false;
let currentShop = null;
let inventory = [];
let inventoryOpen = false;
const MAX_INVENTORY = 6;

const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// One-off keyboard handlers for shop and purchases
window.addEventListener('keydown', (e) => {
    if (!gameStarted) return;
    if (e.key === 'e' || e.key === 'E') {
        if (shopOpen) {
            shopOpen = false;
            currentShop = null;
            gamePaused = false;
        } else {
            // open nearest shop
            if (!player) return;
            const near = shops.find(s => Math.abs((player.x + player.width / 2) - s.x) < 200);
            if (near) {
                shopOpen = true;
                currentShop = near;
                gamePaused = true;
            }
        }
    }

    if (e.key === 'i' || e.key === 'I') {
        inventoryOpen = !inventoryOpen;
        if (inventoryOpen) {
            gamePaused = true;
        } else {
            gamePaused = false;
        }
    }

    if ((e.key === 'f' || e.key === 'F') && waterGunEquipped && boss && boss.alive) {
        const projectile = new Projectile(player.x + player.width, player.y + player.height / 2 - 4, 12);
        projectiles.push(projectile);
    }

    if (shopOpen) {
        if (e.key === '1') buyShopItem(0);
        else if (e.key === '2') buyShopItem(1);
        else if (e.key === '3') buyShopItem(2);
        else if (e.key === '4') buyShopItem(3);
        else if (e.key === '5') buyShopItem(4);
        else if (e.key === '6') buyShopItem(5);
        else if (e.key === 'Escape') {
            shopOpen = false; currentShop = null; gamePaused = false;
        }
    }

    if (inventoryOpen) {
        if (e.key >= '1' && e.key <= '6') {
            const idx = parseInt(e.key) - 1;
            useInventoryItem(idx);
        }
    }
});

function buyShopItem(idx) {
    if (!currentShop) return;
    const it = currentShop.items[idx];
    if (!it) return;
    if (score < it.price) { alert('No tienes suficientes puntos'); return; }
    score -= it.price;
    // Add purchased item to inventory instead of applying immediately
    if (inventory.length >= MAX_INVENTORY) { alert('Inventario lleno'); return; }
    inventory.push(Object.assign({}, it));
    alert('Artículo añadido al inventario: ' + it.name);
    shopOpen = false; currentShop = null; gamePaused = false;
}

function togglePause() {
    if (!gameStarted) return;
    gamePaused = !gamePaused;
    document.getElementById('pauseScreen').classList.toggle('hidden');
}

function useInventoryItem(idx) {
    if (idx < 0 || idx >= inventory.length) return;
    const it = inventory[idx];
    // Apply effect similar to previous buy logic
    if (it.effect === 'life') {
        lives = Math.min(MAX_LIVES, lives + 1);
    } else if (it.effect === 'muscle') {
        powerActive = true; powerType = 'muscle'; powerTime = 10000; player.speed += 2; player.jumpPower += 2;
    } else if (it.effect === 'points') {
        score += it.points || 200;
    } else if (it.effect === 'dash') {
        dashAvailable = true;
    } else if (it.effect === 'shield') {
        shieldActive = true;
    } else if (it.effect === 'adrenaline') {
        powerActive = true; powerType = 'adrenaline'; powerTime = 10000; player.speed += 3;
    } else if (it.effect === 'water') {
        lives = MAX_LIVES;
    } else if (it.effect === 'waterGun') {
        waterGunEquipped = true;
        alert('¡Pistola de Agua equipada! Presiona F para disparar al jefe.');
    } else if (it.effect === 'vitaminB12') {
        maxEnergy += 20; energy = maxEnergy;
    } else if (it.effect === 'magnet') {
        magnetActive = true; magnetTime = 20000;
    }
    // remove from inventory
    inventory.splice(idx, 1);
}

function startGame() {
    alert('Botón presionado - iniciando juego...');
    document.getElementById('startScreen').classList.add('hidden');
    gameStarted = true;
    gameRunning = true;
    initLevel(1);
}

function initLevel(levelNum) {
    platforms = [];
    enemies = [];
    items = [];
    shops = [];
    player = new Player(50, 400);
    waterGunEquipped = false;
    projectiles = [];
    bossRocks = [];
    boss = null;
    
    // Ajustar física según nivel para mayor unicidad
    if (levelNum === 1) {
        player.speed = 5; // Normal en boca
        player.jumpPower = 12;
        player.gravity = 0.6;
    } else if (levelNum === 2) {
        player.speed = 5; // Más velocidad en estómago
        player.jumpPower = 14; // Más salto en estómago
        player.gravity = 0.8; // Más pesado
    } else if (levelNum === 3) {
        player.speed = 6; // Más rápido en circulación
        player.jumpPower = 14; // Más fácil saltar
        player.gravity = 0.4; // Más ligero
    }
    
    levelGoal = 1800; // Todos los niveles tienen 1800 de largo

    level = levelNum;
    currentLevelName = levelNames[levelNum];
    currentObjective = levelObjectives[levelNum];
    vitaminsCollected = 0;
    nutrientsCollected = 0;
    heartOrbsCollected = 0;
    neuralSignalsCollected = 0;
    renalFiltersCollected = 0;
    electricHazards = [];
    hazardSpawnTimer = 0;
    objectiveCompleted = false;
    powerActive = false;
    powerType = '';
    powerTime = 0;
    updateLevelInfo();

    // Nivel 1 - BOCA
    if (levelNum === 1) {
        // Plataforma inicial (entrada a la boca)
        platforms.push(new Platform(0, 550, 150, 50, 'normal'));
        
        // Dientes (plataformas)
        platforms.push(new Platform(200, 500, 80, 20, 'normal'));
        platforms.push(new Platform(320, 460, 80, 20, 'normal'));
        platforms.push(new Platform(440, 420, 80, 20, 'normal'));
        platforms.push(new Platform(560, 380, 80, 20, 'normal'));
        platforms.push(new Platform(680, 340, 80, 20, 'normal'));
        platforms.push(new Platform(800, 300, 80, 20, 'normal'));
        
        // Saliva (plataforma móvil mejor accesible)
        platforms.push(new Platform(1020, 420, 140, 20, 'moving'));
        platforms.push(new Platform(1220, 350, 100, 20, 'normal'));
        
        // Lengua (plataforma grande final)
        platforms.push(new Platform(1450, 450, 350, 30, 'normal'));

        // Bacterias en la boca
        enemies.push(new Enemy(300, 350, 'bacteria'));
        enemies.push(new Enemy(700, 250, 'virus'));
        enemies.push(new Enemy(1100, 300, 'bacteria'));

        // Items nutritivos
        items.push(new Item(200, 470, 'vitamin'));
        items.push(new Item(560, 350, 'nutrient'));
        items.push(new Item(1020, 390, 'vitamin'));
        items.push(new Item(1450, 430, 'vitamin'));
        items.push(new Item(1600, 420, 'nutrient'));
        
        // Poder: fusión con piel
        items.push(new Item(800, 320, 'skin'));
        
        // Ajustar velocidad de enemigos
        enemies.forEach(e => e.vel_x = 3);
    }

    // Nivel 2 - ESTÓMAGO
    if (levelNum === 2) {
        // Entrada al estómago
        platforms.push(new Platform(0, 500, 150, 50, 'normal'));
        
        // Paredes del estómago (plataformas móviles)
        platforms.push(new Platform(150, 480, 100, 20, 'moving'));
        platforms.push(new Platform(350, 420, 120, 20, 'normal'));
        
        // Ácido gástrico (plataformas irregulares)
        platforms.push(new Platform(550, 460, 90, 20, 'normal'));
        platforms.push(new Platform(680, 400, 100, 20, 'normal'));
        platforms.push(new Platform(820, 440, 90, 20, 'moving'));
        platforms.push(new Platform(970, 380, 100, 20, 'normal'));
        
        // Movimiento digestivo
        platforms.push(new Platform(1120, 420, 110, 20, 'moving'));
        platforms.push(new Platform(1290, 350, 120, 20, 'normal'));
        
        // Salida del estómago (píloro)
        platforms.push(new Platform(1500, 500, 300, 30, 'normal'));

        // Virus y bacterias dañinos
        enemies.push(new Enemy(300, 350, 'virus'));
        enemies.push(new Enemy(600, 350, 'virus'));
        enemies.push(new Enemy(950, 300, 'bacteria'));
        enemies.push(new Enemy(1200, 250, 'bacteria'));

        // Nutrientes para absorber
        items.push(new Item(350, 390, 'nutrient'));
        items.push(new Item(680, 370, 'vitamin'));
        items.push(new Item(1120, 390, 'nutrient'));
        items.push(new Item(1600, 470, 'vitamin'));
        
        // Poder: fusión con músculo
        items.push(new Item(900, 320, 'muscle'));
        
        // Ajustar velocidad de enemigos (más lentos en estómago)
        enemies.forEach(e => e.vel_x = 2);
        // Añadir tienda en nivel 2
        shops.push(new Shop(120, 430, [
            {name: 'Burbuja de Oxígeno', price: 300, effect: 'dash'},
            {name: 'Escudo de Anticuerpos', price: 350, effect: 'shield'},
            {name: 'Shot de Adrenalina', price: 220, effect: 'adrenaline'},
            {name: 'Frasco de Agua Destilada', price: 400, effect: 'water'},
            {name: 'Vitamina B12', price: 500, effect: 'vitaminB12'},
            {name: 'Imán de Hierro', price: 300, effect: 'magnet'}
        ]));
    }

    // Nivel 3 - SISTEMA CIRCULATORIO
    if (levelNum === 3) {
        // Entrada a las venas
        platforms.push(new Platform(0, 450, 150, 50, 'normal'));
        
        // Venas y arterias (plataformas móviles)
        platforms.push(new Platform(150, 420, 80, 15, 'moving'));
        platforms.push(new Platform(320, 380, 80, 15, 'normal'));
        platforms.push(new Platform(480, 340, 80, 15, 'moving'));
        platforms.push(new Platform(640, 300, 80, 15, 'normal'));
        
        // Corazón (zona peligrosa con púas)
        platforms.push(new Platform(800, 280, 100, 15, 'spike'));
        platforms.push(new Platform(950, 340, 100, 15, 'normal'));
        
        // Circulación de retorno
        platforms.push(new Platform(1100, 400, 80, 15, 'moving'));
        platforms.push(new Platform(1260, 360, 80, 15, 'normal'));
        platforms.push(new Platform(1420, 420, 80, 15, 'moving'));
        
        // Salida (capilares)
        platforms.push(new Platform(1600, 500, 200, 30, 'normal'));

        // Virus muy peligrosos
        enemies.push(new Enemy(250, 300, 'virus'));
        enemies.push(new Enemy(480, 250, 'virus'));
        enemies.push(new Enemy(850, 200, 'virus'));
        enemies.push(new Enemy(1100, 300, 'bacteria'));
        enemies.push(new Enemy(1400, 350, 'bacteria'));

        // Células saludables
        items.push(new Item(320, 350, 'vitamin'));
        items.push(new Item(640, 270, 'nutrient'));
        items.push(new Item(950, 310, 'vitamin'));
        items.push(new Item(1260, 330, 'nutrient'));
        items.push(new Item(1600, 470, 'vitamin'));
        
        // Poder: fusión con neurotransmisor
        items.push(new Item(700, 250, 'neurotransmitter'));
        
        // Ajustar velocidad de enemigos (más rápidos en circulación)
        enemies.forEach(e => e.vel_x = 4);
        // Tienda en nivel 3
        shops.push(new Shop(120, 360, [
            {name: 'Burbuja de Oxígeno', price: 300, effect: 'dash'},
            {name: 'Escudo de Anticuerpos', price: 350, effect: 'shield'},
            {name: 'Shot de Adrenalina', price: 220, effect: 'adrenaline'},
            {name: 'Frasco de Agua Destilada', price: 400, effect: 'water'},
            {name: 'Vitamina B12', price: 500, effect: 'vitaminB12'},
            {name: 'Imán de Hierro', price: 300, effect: 'magnet'}
        ]));
    }

    if (level === 4) {
        // Entrada al corazón
        platforms.push(new Platform(0, 500, 150, 50, 'normal'));
        platforms.push(new Platform(220, 450, 120, 20, 'normal'));
        platforms.push(new Platform(420, 390, 100, 20, 'moving'));
        platforms.push(new Platform(620, 340, 120, 20, 'normal'));
        platforms.push(new Platform(860, 300, 140, 20, 'spike'));
        platforms.push(new Platform(1080, 360, 120, 20, 'moving'));
        platforms.push(new Platform(1300, 420, 200, 30, 'normal'));

        enemies.push(new Enemy(300, 360, 'virus'));
        enemies.push(new Enemy(700, 280, 'bacteria'));
        enemies.push(new Enemy(1000, 320, 'virus'));

        items.push(new Item(220, 420, 'heart'));
        items.push(new Item(340, 380, 'heartFalse'));
        items.push(new Item(460, 350, 'heart'));
        items.push(new Item(560, 320, 'heartFalse'));
        items.push(new Item(700, 300, 'heart'));
        items.push(new Item(820, 280, 'heartFalse'));
        items.push(new Item(900, 330, 'heart'));
        items.push(new Item(1020, 340, 'heartFalse'));
        items.push(new Item(1220, 390, 'heart'));
        items.push(new Item(1380, 380, 'heartFalse'));
        items.push(new Item(1520, 420, 'vitamin'));
        items.push(new Item(1400, 400, 'skin'));

        enemies.forEach(e => e.vel_x = 3);
        // Tienda en nivel 4 (corazón)
        shops.push(new Shop(120, 380, [
            {name: 'Burbuja de Oxígeno', price: 300, effect: 'dash'},
            {name: 'Escudo de Anticuerpos', price: 350, effect: 'shield'},
            {name: 'Shot de Adrenalina', price: 220, effect: 'adrenaline'},
            {name: 'Frasco de Agua Destilada', price: 400, effect: 'water'},
            {name: 'Vitamina B12', price: 500, effect: 'vitaminB12'},
            {name: 'Imán de Hierro', price: 300, effect: 'magnet'}
        ]));
    }

    if (level === 5) {
        // Entrada al sistema nervioso
        platforms.push(new Platform(0, 520, 150, 50, 'normal'));
        platforms.push(new Platform(220, 470, 100, 20, 'moving'));
        platforms.push(new Platform(420, 420, 110, 20, 'normal'));
        platforms.push(new Platform(620, 370, 90, 20, 'moving'));
        platforms.push(new Platform(820, 320, 130, 20, 'normal'));
        platforms.push(new Platform(1060, 280, 100, 20, 'moving'));
        platforms.push(new Platform(1260, 340, 140, 20, 'normal'));
        platforms.push(new Platform(1520, 390, 180, 30, 'normal'));

        enemies.push(new Enemy(260, 430, 'virus'));
        enemies.push(new Enemy(540, 380, 'bacteria'));
        enemies.push(new Enemy(820, 300, 'virus'));
        enemies.push(new Enemy(1180, 260, 'bacteria'));

        items.push(new Item(240, 430, 'signal'));
        items.push(new Item(480, 390, 'signal'));
        items.push(new Item(760, 310, 'signal'));
        items.push(new Item(1140, 250, 'signal'));
        items.push(new Item(1480, 360, 'vitamin'));

        enemies.forEach(e => e.vel_x = 3);
        // Tienda en nivel 5 (nervioso)
        shops.push(new Shop(120, 360, [
            {name: 'Burbuja de Oxígeno', price: 300, effect: 'dash'},
            {name: 'Escudo de Anticuerpos', price: 350, effect: 'shield'},
            {name: 'Shot de Adrenalina', price: 220, effect: 'adrenaline'},
            {name: 'Frasco de Agua Destilada', price: 400, effect: 'water'},
            {name: 'Vitamina B12', price: 500, effect: 'vitaminB12'},
            {name: 'Imán de Hierro', price: 300, effect: 'magnet'}
        ]));
    }

    if (level === 6) {
        // Piso fijo para pelear con el jefe sin caer
        platforms.push(new Platform(0, 560, 1900, 40, 'normal'));
        platforms.push(new Platform(0, 500, 150, 50, 'normal'));
        platforms.push(new Platform(220, 470, 120, 20, 'normal'));
        platforms.push(new Platform(420, 430, 100, 20, 'normal'));
        platforms.push(new Platform(620, 390, 100, 20, 'moving'));
        platforms.push(new Platform(820, 350, 130, 20, 'normal'));
        platforms.push(new Platform(1060, 310, 100, 20, 'moving'));
        platforms.push(new Platform(1260, 270, 120, 20, 'normal'));
        platforms.push(new Platform(1460, 330, 200, 30, 'normal'));

        enemies.push(new Enemy(280, 430, 'bacteria'));
        enemies.push(new Enemy(540, 390, 'virus'));
        enemies.push(new Enemy(820, 350, 'bacteria'));

        items.push(new Item(120, 470, 'waterGun'));
        items.push(new Item(260, 420, 'filter'));
        items.push(new Item(520, 380, 'filter'));
        items.push(new Item(860, 340, 'filter'));
        items.push(new Item(1180, 290, 'nutrient'));
        items.push(new Item(1440, 320, 'skin'));

        boss = new Boss(1700, 260, 10);
        boss.spawnAttack();
        boss.spawnAttack();
        enemies.forEach(e => e.vel_x = 2);
    }
}

function updateLevelInfo() {
    let objectiveText = currentObjective;
    if (objectiveCompleted) {
        if (level === 6 && boss && boss.alive) {
            objectiveText = '¡Has activado al jefe final! Usa la Pistola de Agua y baja sus 10 corazones.';
        } else {
            objectiveText = '¡Objetivo completado! Llega al final para continuar al siguiente nivel';
        }
    }
    document.getElementById('levelInfo').innerHTML = currentLevelName + '<br><small>' + objectiveText + '</small>';
}

function resetLevel() {
    initLevel(level);
}

function endGame(won) {
    gameRunning = false;
    const gameOverScreen = document.getElementById('gameOverScreen');
    const title = document.getElementById('gameOverTitle');
    const message = document.getElementById('gameOverMessage');

    if (won) {
        title.textContent = '¡TRIPTOFANITO LO HIZO!';
        message.textContent = 'Completaste el viaje por el cuerpo humano. ¡Felicidades!';
    } else {
        title.textContent = 'GAME OVER';
        message.textContent = 'Triptofanito no sobrevivió el viaje...';
    }

    gameOverScreen.classList.remove('hidden');
}

// ==================== LOOP PRINCIPAL ====================
function updateUI() {
    document.getElementById('lives').textContent = Math.max(0, lives);
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = currentLevelName ? level + ' - ' + currentLevelName.split(' ')[1] : level;
    
    // Actualizar contador según nivel
    const counterLabel = document.getElementById('counterLabel');
    const counter = document.getElementById('counter');
    if (level === 1) {
        counterLabel.textContent = 'VITAMINAS:';
        counter.textContent = vitaminsCollected + '/3';
    } else if (level === 2) {
        counterLabel.textContent = 'NUTRIENTES:';
        counter.textContent = nutrientsCollected + '/2';
    } else if (level === 4) {
        counterLabel.textContent = 'ORBES:';
        counter.textContent = heartOrbsCollected + '/3';
    } else if (level === 5) {
        counterLabel.textContent = 'SEÑALES:';
        counter.textContent = neuralSignalsCollected + '/4';
    } else if (level === 6) {
        counterLabel.textContent = 'FILTROS:';
        counter.textContent = renalFiltersCollected + '/3';
    } else {
        counterLabel.textContent = '';
        counter.textContent = '';
    }

    // Mostrar poder activo o estado del jefe
    const powerDisplay = document.getElementById('powerDisplay');
    if (level === 6 && objectiveCompleted && boss && boss.alive) {
        powerDisplay.textContent = '🔫 Jefe: ' + boss.health + '/10 corazones';
        powerDisplay.style.display = 'block';
        return;
    }
    if (powerActive) {
        let powerName = '';
        if (powerType === 'muscle') powerName = '💪 MÚSCULO';
        else if (powerType === 'skin') powerName = '🧴 PIEL';
        else if (powerType === 'neurotransmitter') powerName = '⚡ NEUROTRANSMISOR';
        if (powerType === 'adrenaline') powerName = '⚡ ADRENALINA';
        powerDisplay.textContent = powerName + ' (' + Math.ceil(powerTime / 1000) + 's)';
        powerDisplay.style.display = 'block';
    } else {
        // Mostrar estados pasivos como escudo/imán/dash y ATP
        let extras = [];
        if (shieldActive) extras.push('🛡️ Escudo');
        if (magnetActive) extras.push('🧲 Imán');
        if (dashAvailable) extras.push('💨 Burbuja');
        extras.push('ATP: ' + Math.floor(energy) + '/' + maxEnergy);
        powerDisplay.textContent = extras.join(' | ');
        powerDisplay.style.display = 'block';
    }
}

function update() {
    if (!gameRunning || gamePaused || !gameStarted) return;

    if (player) player.update();
    
    platforms.forEach(p => p.update());
    
    enemies.forEach(enemy => {
        enemy.update();
    });
    enemies = enemies.filter(e => e.alive);

    items.forEach(item => item.update());

    // Magnet behavior: atraer items cercanos cuando está activo
    if (magnetActive && player) {
        items.forEach(item => {
            if ((item.points || 0) > 0) {
                const dx = (player.x + player.width/2) - (item.x + item.width/2);
                const dy = (player.y + player.height/2) - (item.y + item.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 200) {
                    item.x += dx * 0.12;
                    item.y += dy * 0.12;
                }
            }
        });
        magnetTime -= 16;
        if (magnetTime <= 0) magnetActive = false;
    }

    electricHazards.forEach(hazard => hazard.update());
    electricHazards = electricHazards.filter(hazard => hazard.alive);

    projectiles.forEach(projectile => projectile.update());
    projectiles = projectiles.filter(projectile => projectile.alive);

    bossRocks.forEach(rock => rock.update());
    bossRocks = bossRocks.filter(rock => rock.alive);

    if (boss && boss.alive) {
        boss.update();
        projectiles.forEach(projectile => {
            if (projectile.x + projectile.width > boss.x && projectile.x < boss.x + boss.width &&
                projectile.y + projectile.height > boss.y && projectile.y < boss.y + boss.height) {
                projectile.alive = false;
                boss.health = Math.max(0, boss.health - 1);
                if (boss.health <= 0) {
                    boss.alive = false;
                    endGame(true);
                }
            }
        });
    }

    bossRocks.forEach(rock => {
        projectiles.forEach(projectile => {
            if (!projectile.alive || !rock.alive) return;
            if (projectile.x + projectile.width > rock.x && projectile.x < rock.x + rock.width &&
                projectile.y + projectile.height > rock.y && projectile.y < rock.y + rock.height) {
                projectile.alive = false;
                rock.alive = false;
                score += 75;
            }
        });
    });

    if (boss && boss.alive) {
        bossRocks.forEach(rock => {
            if (rock.spawnTimer > 0) return;
            if (player && rock.x < player.x + player.width && rock.x + rock.width > player.x &&
                rock.y < player.y + player.height && rock.y + rock.height > player.y) {
                rock.alive = false;
                if (shieldActive) {
                    shieldActive = false;
                } else {
                    lives--;
                    if (lives <= 0) {
                        endGame(false);
                    }
                }
            }
        });
    }

    if (level === 5) {
        hazardSpawnTimer++;
        if (hazardSpawnTimer >= hazardSpawnInterval) {
            hazardSpawnTimer = 0;
            const x = 50 + Math.random() * (canvas.width - 100);
            electricHazards.push(new ElectricHazard(x, -40));
        }
    }

    // Shop interaction hint: if near shop, show small prompt (handled in draw)

    // Verificar si se completó el objetivo
    if (!objectiveCompleted) {
        let met = false;
        if (level === 1 && vitaminsCollected >= 3) {
            met = true;
            // Teletransportar inmediatamente al siguiente nivel
            level++;
            score += 500;
            initLevel(level);
            return; // Salir para evitar continuar con este nivel
        } else if (level === 2 && nutrientsCollected >= 2) {
            met = true;
            // Teletransportar inmediatamente al siguiente nivel
            level++;
            score += 500;
            initLevel(level);
            return; // Salir para evitar continuar con este nivel
        } else if (level === 3 && player && player.x > levelGoal) {
            met = true; // Completó el objetivo al llegar al final
        }
        if (met) {
            objectiveCompleted = true;
            updateLevelInfo();
        }
    }

    updateUI();
}

function draw() {
    // Limpiar canvas con color específico del nivel
    let bgColor1 = '#87CEEB';
    let bgColor2 = '#E0F6FF';
    let accentColor = '#00AA00';

    if (level === 1) { // Boca
        bgColor1 = '#FFB6C1';
        bgColor2 = '#FFC0CB';
        accentColor = '#FF69B4';
    } else if (level === 2) { // Estómago
        bgColor1 = '#FFD700';
        bgColor2 = '#FFA500';
        accentColor = '#FF8C00';
    } else if (level === 3) { // Sistema Circulatorio
        bgColor1 = '#FF6B6B';
        bgColor2 = '#FF8585';
        accentColor = '#FF0000';
    } else if (level === 4) { // Corazón
        bgColor1 = '#FFC0D6';
        bgColor2 = '#FF8AB8';
        accentColor = '#CC0044';
    } else if (level === 5) { // Sistema Nervioso
        bgColor1 = '#E8E8FF';
        bgColor2 = '#C8D4FF';
        accentColor = '#0033CC';
    } else if (level === 6) { // Riñones
        bgColor1 = '#D6EEFF';
        bgColor2 = '#A7D7FF';
        accentColor = '#006699';
    }

    // Dibujar fondo degradado
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, bgColor1);
    gradient.addColorStop(1, bgColor2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (level === 4) {
        drawBackgroundHeart(canvas.width / 2, canvas.height / 2 - 30, 260);
    }
    if (level === 5) {
        drawElectricBackground();
    }

    // Guardar contexto y aplicar cámara
    ctx.save();
    ctx.translate(-camera.x, 0);

    // Dibujar plataformas
    platforms.forEach(platform => platform.draw());

    // Dibujar tiendas
    shops.forEach(s => s.draw());

    // Indicador de interacción si estás cerca de una tienda
    if (!shopOpen && player) {
        const near = shops.find(s => Math.abs((player.x + player.width / 2) - s.x) < 100);
        if (near) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(10, canvas.height - 60, 240, 40);
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.fillText('Presiona E para abrir la tienda (1-3 para comprar)', 18, canvas.height - 34);
            ctx.restore();
        }
    }

    // Dibujar items
    items.forEach(item => item.draw());

    // Dibujar jefe final
    if (boss && boss.alive) {
        boss.draw();
    }

    // Dibujar proyectiles
    projectiles.forEach(projectile => projectile.draw());

    // Dibujar subditos rocosos del jefe
    bossRocks.forEach(rock => rock.draw());

    // Dibujar enemigos
    enemies.forEach(enemy => enemy.draw());

    // Dibujar descargas eléctricas
    electricHazards.forEach(hazard => hazard.draw());

    // Dibujar jugador
    if (player) player.draw();

    ctx.restore();

    // Dibujar UI
    updateUI();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ==================== INICIAR JUEGO ====================
// Mostrar pantalla de inicio
document.getElementById('startScreen').classList.remove('hidden');

// Iniciar loop
gameLoop();

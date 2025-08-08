
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        this.gameState = 'title';
        this.score = 0;
        this.strikes = 0;
        this.gameTime = 0;
        this.lastTime = 0;
        
        this.player = new Player();
        this.entities = [];
        this.particles = [];
        this.rules = [];
        this.ruleChangeTimer = 0;
        this.ruleChangeInterval = 5000; // 5 seconds
        
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.colorShift = { hue: 0, saturation: 0 };
        
        this.ruleGenerator = new RuleGenerator();
        this.collisionSystem = new CollisionSystem();
        this.particleSystem = new ParticleSystem();
        this.audioSystem = new AudioSystem(this.audioContext);
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        this.generateInitialRules();
        this.gameLoop();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('exit-btn').addEventListener('click', () => {
            this.exitGame();
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.strikes = 0;
        this.gameTime = 0;
        this.ruleChangeTimer = 0;
        this.entities = [];
        this.particles = [];
        
        this.player.x = window.innerWidth / 2;
        this.player.y = window.innerHeight / 2;
        this.player.velocity = { x: 0, y: 0 };
        this.player.powerups.clear();
        this.player.shield = false;
        this.player.magnet = false;
        this.player.maxSpeed = 5;
        
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.showScreen('game-screen');
        this.generateInitialRules();
        this.audioSystem.playSound('start');
    }
    
    restartGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.strikes = 0;
        this.gameTime = 0;
        this.ruleChangeTimer = 0;
        this.entities = [];
        this.particles = [];
        this.player.x = window.innerWidth / 2;
        this.player.y = window.innerHeight / 2;
        this.player.velocity = { x: 0, y: 0 };
        this.player.powerups.clear();
        this.player.shield = false;
        this.player.magnet = false;
        this.player.maxSpeed = 5;
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.showScreen('game-screen');
        this.generateInitialRules();
        this.audioSystem.playSound('start');
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('final-score').textContent = this.score;
        this.showScreen('game-over-screen');
        this.audioSystem.playSound('gameOver');
    }
    
    exitGame() {
        this.gameState = 'title';
        this.showScreen('title-screen');
        this.audioSystem.playSound('start');
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
    
    generateInitialRules() {
        this.rules = this.ruleGenerator.generateRules(3);
        this.updateRulesDisplay();
    }
    
    changeRules() {
        const oldRules = [...this.rules];
        this.rules = this.ruleGenerator.generateRules(3);
        this.updateRulesDisplay();
        
        this.particleSystem.createRuleChangeEffect(this.canvas.width / 2, this.canvas.height / 2);
        this.audioSystem.playSound('ruleChange');
        this.addScreenShake(0.5);
        
        const rulesDisplay = document.getElementById('rules-display');
        rulesDisplay.style.animation = 'none';
        setTimeout(() => {
            rulesDisplay.style.animation = 'ruleChangeFlash 0.5s ease';
        }, 10);
    }
    
    updateRulesDisplay() {
        const rulesList = document.getElementById('rules-list');
        rulesList.innerHTML = '';
        
        this.rules.forEach((rule, index) => {
            const ruleElement = document.createElement('div');
            ruleElement.className = 'rule';
            ruleElement.textContent = `${index + 1}. ${rule.description}`;
            ruleElement.dataset.ruleId = index;
            rulesList.appendChild(ruleElement);
            
            setTimeout(() => {
                ruleElement.style.animation = 'ruleAppear 0.3s ease';
            }, index * 100);
        });
    }
    
    addStrike() {
        this.strikes++;
        this.score = Math.max(0, this.score - 5);
        
        this.audioSystem.playSound('strike');
        this.addScreenShake(0.5);
        
        if (this.strikes >= 3) {
            this.strikes = 1;
            
            this.audioSystem.playSound('strike');
            this.addScreenShake(0.8);
        }
    }
    
    addScreenShake(intensity) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    }
    
    updateScreenShake(deltaTime) {
        if (this.screenShake.intensity > 0) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity * 10;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity * 10;
            this.screenShake.intensity *= 0.95;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
        }
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (this.gameState === 'playing') {
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        this.ruleChangeTimer += deltaTime;
        
        document.getElementById('score-value').textContent = this.score;
        document.getElementById('timer-value').textContent = Math.floor(this.gameTime / 1000);
        
        if (this.ruleChangeTimer >= this.ruleChangeInterval) {
            this.changeRules();
            this.ruleChangeTimer = 0;
        }
        
        this.player.update(deltaTime, this.keys);
        
        this.entities.forEach(entity => entity.update(deltaTime));
        this.entities = this.entities.filter(entity => entity.active);
        
        this.particleSystem.update(deltaTime);
        this.checkCollisions();
        this.checkRuleViolations();
        this.updateScreenShake(deltaTime);
        this.audioSystem.update(deltaTime);
        
        if (Math.random() < 0.02) {
            this.spawnEntity();
        }
    }
    
    spawnEntity() {
        const types = ['collectible', 'obstacle', 'powerup'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const entity = new Entity(
            Math.random() * this.canvas.width,
            Math.random() * this.canvas.height,
            type
        );
        
        this.entities.push(entity);
    }
    
    checkCollisions() {
        this.entities.forEach(entity => {
            if (this.collisionSystem.checkCollision(this.player, entity)) {
                this.handleCollision(this.player, entity);
            }
        });
        
        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                if (this.collisionSystem.checkCollision(this.entities[i], this.entities[j])) {
                    this.handleEntityCollision(this.entities[i], this.entities[j]);
                }
            }
        }
    }
    
    handleCollision(player, entity) {
        switch (entity.type) {
            case 'collectible':
                this.score += 10;
                this.particleSystem.createCollectEffect(entity.x, entity.y);
                this.audioSystem.playSound('collect');
                entity.active = false;
                break;
            case 'obstacle':
                this.addStrike();
                entity.active = false;
                break;
            case 'powerup':
                this.activatePowerup(entity);
                entity.active = false;
                break;
        }
    }
    
    handleEntityCollision(entity1, entity2) {
        if (entity1.type === 'obstacle' && entity2.type === 'collectible') {
            entity2.active = false;
            this.particleSystem.createDestroyEffect(entity2.x, entity2.y);
        }
    }
    
    activatePowerup(entity) {
        const powerups = ['speed', 'shield', 'magnet'];
        const powerup = powerups[Math.floor(Math.random() * powerups.length)];
        
        this.player.activatePowerup(powerup);
        this.particleSystem.createPowerupEffect(entity.x, entity.y, powerup);
        this.audioSystem.playSound('powerup');
    }
    
    checkRuleViolations() {
        this.rules.forEach((rule, index) => {
            if (rule.checkViolation(this.player, this.entities)) {
                this.violateRule(index);
            }
        });
    }
    
    violateRule(ruleIndex) {
        const ruleElement = document.querySelector(`[data-rule-id="${ruleIndex}"]`);
        ruleElement.classList.add('violated');
        
        setTimeout(() => {
            ruleElement.classList.remove('violated');
        }, 1000);
        
        this.addStrike();
    }
    
    render() {
        this.ctx.save();
        
        this.ctx.translate(this.screenShake.x, this.screenShake.y);
        
        this.ctx.fillStyle = '#0f0f23';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        
        this.entities.forEach(entity => entity.render(this.ctx));
        
        this.player.render(this.ctx);
        
        this.particleSystem.render(this.ctx);
        
        this.ctx.restore();
    }
    
    drawBackground() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
}

class RuleGenerator {
    constructor() {
        this.ruleTemplates = [
            {
                type: 'movement',
                templates: [
                    { description: 'Keep moving', check: (player) => {
                        const magnitude = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
                        return magnitude < 0.1;
                    }},
                    { description: 'Do not stop', check: (player) => {
                        const magnitude = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
                        return magnitude === 0;
                    }},
                    { description: 'Move horizontally', check: (player) => Math.abs(player.velocity.x) < 0.1 },
                    { description: 'Move vertically', check: (player) => Math.abs(player.velocity.y) < 0.1 }
                ]
            },
            {
                type: 'position',
                templates: [
                    { description: 'Stay in center', check: (player, entities) => {
                        const centerX = window.innerWidth / 2;
                        const centerY = window.innerHeight / 2;
                        const distance = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
                        return distance > 200;
                    }},
                    { description: 'Avoid edges', check: (player, entities) => {
                        return player.x < 50 || player.x > window.innerWidth - 50 || 
                               player.y < 50 || player.y > window.innerHeight - 50;
                    }},
                    { description: 'Stay in top half', check: (player, entities) => player.y > window.innerHeight / 2 }
                ]
            },
            {
                type: 'interaction',
                templates: [
                    { description: 'Collect blue items', check: (player, entities) => {
                        const blueItems = entities.filter(e => e.type === 'collectible' && e.color === '#4ecdc4');
                        return blueItems.length > 0 && blueItems.some(item => {
                            const distance = Math.sqrt((player.x - item.x) ** 2 + (player.y - item.y) ** 2);
                            return distance < 100;
                        });
                    }},
                    { description: 'Avoid red objects', check: (player, entities) => {
                        const redObjects = entities.filter(e => e.color === '#ff6b6b' || e.color === '#ff7675' || e.color === '#fd79a8');
                        return redObjects.some(obj => {
                            const distance = Math.sqrt((player.x - obj.x) ** 2 + (player.y - obj.y) ** 2);
                            return distance < 80;
                        });
                    }},
                    { description: 'Touch green items', check: (player, entities) => {
                        const greenItems = entities.filter(e => e.type === 'collectible' && e.color === '#26de81');
                        return greenItems.length > 0 && !greenItems.some(item => {
                            const distance = Math.sqrt((player.x - item.x) ** 2 + (player.y - item.y) ** 2);
                            return distance < 60;
                        });
                    }}
                ]
            },
            {
                type: 'collection',
                templates: [
                    { description: 'Collect 3 items', check: (player, entities) => {
                        const collectibles = entities.filter(e => e.type === 'collectible');
                        return collectibles.length >= 3;
                    }},
                    { description: 'Avoid powerups', check: (player, entities) => {
                        const powerups = entities.filter(e => e.type === 'powerup');
                        return powerups.some(powerup => {
                            const distance = Math.sqrt((player.x - powerup.x) ** 2 + (player.y - powerup.y) ** 2);
                            return distance < 60;
                        });
                    }}
                ]
            },
            {
                type: 'boundary',
                templates: [
                    { description: 'Stay in left half', check: (player, entities) => {
                        return player.x > window.innerWidth / 2;
                    }},
                    { description: 'Stay in right half', check: (player, entities) => {
                        return player.x < window.innerWidth / 2;
                    }},
                    { description: 'Stay in bottom half', check: (player, entities) => {
                        return player.y < window.innerHeight / 2;
                    }}
                ]
            }
        ];
    }
    
    generateRules(count) {
        const rules = [];
        const usedTypes = new Set();
        
        while (rules.length < count) {
            const ruleType = this.ruleTemplates[Math.floor(Math.random() * this.ruleTemplates.length)];
            
            if (!usedTypes.has(ruleType.type)) {
                const template = ruleType.templates[Math.floor(Math.random() * ruleType.templates.length)];
                rules.push({
                    description: template.description,
                    checkViolation: template.check,
                    type: ruleType.type
                });
                usedTypes.add(ruleType.type);
            }
        }
        
        return rules;
    }
}

class CollisionSystem {
    constructor() {
        this.spatialHash = new Map();
        this.cellSize = 100;
    }
    
    updateSpatialHash(entities) {
        this.spatialHash.clear();
        
        entities.forEach(entity => {
            const cells = this.getEntityCells(entity);
            cells.forEach(cell => {
                if (!this.spatialHash.has(cell)) {
                    this.spatialHash.set(cell, []);
                }
                this.spatialHash.get(cell).push(entity);
            });
        });
    }
    
    getEntityCells(entity) {
        const cells = [];
        const minX = Math.floor((entity.x - entity.radius) / this.cellSize);
        const maxX = Math.floor((entity.x + entity.radius) / this.cellSize);
        const minY = Math.floor((entity.y - entity.radius) / this.cellSize);
        const maxY = Math.floor((entity.y + entity.radius) / this.cellSize);
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                cells.push(`${x},${y}`);
            }
        }
        
        return cells;
    }
    
    checkCollision(obj1, obj2) {
        const distance = Math.sqrt((obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2);
        return distance < (obj1.radius + obj2.radius);
    }
    
    getNearbyEntities(entity, radius) {
        const nearby = [];
        const cells = this.getEntityCells({ x: entity.x, y: entity.y, radius });
        
        cells.forEach(cell => {
            const cellEntities = this.spatialHash.get(cell) || [];
            cellEntities.forEach(other => {
                if (other !== entity) {
                    const distance = Math.sqrt((entity.x - other.x) ** 2 + (entity.y - other.y) ** 2);
                    if (distance <= radius) {
                        nearby.push(other);
                    }
                }
            });
        });
        
        return nearby;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    createParticle(x, y, vx, vy, life, color, size) {
        this.particles.push({
            x, y, vx, vy,
            life, maxLife: life,
            color, size,
            alpha: 1
        });
    }
    
    createCollectEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            this.createParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                1000,
                '#4ecdc4',
                3
            );
        }
    }

    
    createRuleChangeEffect(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            this.createParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2000,
                '#f9ca24',
                2
            );
        }
    }
    
    createPowerupEffect(x, y, type) {
        const colors = { speed: '#4ecdc4', shield: '#a55eea', magnet: '#26de81' };
        const color = colors[type] || '#ffffff';
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            this.createParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                1200,
                color,
                3
            );
        }
    }
    
    createDestroyEffect(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            this.createParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                800,
                '#ff7675',
                2
            );
        }
    }
    

    
    update(deltaTime) {
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= deltaTime;
            particle.alpha = particle.life / particle.maxLife;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
        });
        
        this.particles = this.particles.filter(particle => particle.life > 0);
    }
    
    render(ctx) {
        this.particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
}

class AudioSystem {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sounds = {};
        this.masterGain = audioContext.createGain();
        this.masterGain.connect(audioContext.destination);
        this.masterGain.gain.value = 0.3;
        
        this.initSounds();
    }
    
    initSounds() {
        this.createSound('collect', 200, 'sine', 0.1);
        this.createSound('strike', 100, 'sawtooth', 0.2);
        this.createSound('ruleChange', 300, 'square', 0.15);
        this.createSound('powerup', 400, 'triangle', 0.1);
        this.createSound('start', 500, 'sine', 0.2);
        this.createSound('gameOver', 150, 'sawtooth', 0.3);
    }
    
    createSound(name, frequency, type, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        this.sounds[name] = { oscillator, gainNode, duration };
    }
    
    playSound(name) {
        if (this.sounds[name]) {
            const sound = this.sounds[name];
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.type = sound.oscillator.type;
            oscillator.frequency.setValueAtTime(sound.oscillator.frequency.value, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + sound.duration);
        }
    }
    
    update(deltaTime) {
    }
}

class Player {
    constructor() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.radius = 15;
        this.velocity = { x: 0, y: 0 };
        this.maxSpeed = 5;
        this.acceleration = 0.5;
        this.friction = 0.9;
        this.lastMoveTime = Date.now();
        
        this.powerups = new Map();
        this.shield = false;
        this.magnet = false;
    }
    
    update(deltaTime, keys) {
        let inputX = 0;
        let inputY = 0;
        
        if (keys['KeyW'] || keys['ArrowUp']) inputY -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) inputY += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;
        

        if (inputX !== 0 && inputY !== 0) {
            inputX *= 0.707;
            inputY *= 0.707;
        }
        
        this.velocity.x += inputX * this.acceleration;
        this.velocity.y += inputY * this.acceleration;
        
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
        }
        
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        this.x = Math.max(this.radius, Math.min(window.innerWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(window.innerHeight - this.radius, this.y));
        
        if (inputX !== 0 || inputY !== 0) {
            this.lastMoveTime = Date.now();
        }
        this.updatePowerups(deltaTime);
    }
    
    updatePowerups(deltaTime) {
        this.powerups.forEach((powerup, type) => {
            powerup.duration -= deltaTime;
            if (powerup.duration <= 0) {
                this.powerups.delete(type);
                this.deactivatePowerup(type);
            }
        });
    }
    
    activatePowerup(type) {
        const duration = 5000; 
        this.powerups.set(type, { duration });
        
        switch (type) {
            case 'speed':
                this.maxSpeed = 8;
                break;
            case 'shield':
                this.shield = true;
                break;
            case 'magnet':
                this.magnet = true;
                break;
        }
    }
    
    deactivatePowerup(type) {
        switch (type) {
            case 'speed':
                this.maxSpeed = 5;
                break;
            case 'shield':
                this.shield = false;
                break;
            case 'magnet':
                this.magnet = false;
                break;
        }
    }
    
    render(ctx) {
        ctx.save();
        
        if (this.shield) {
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.fillStyle = this.shield ? '#4ecdc4' : '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(angle) * (this.radius + 5),
                this.y + Math.sin(angle) * (this.radius + 5)
            );
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

class Entity {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type === 'obstacle' ? 20 : 12;
        this.active = true;
        this.velocity = { x: 0, y: 0 };
        
        this.color = this.getColor();
        this.pulse = 0;
    }
    
    getColor() {
        const colors = {
            collectible: ['#4ecdc4', '#26de81', '#a55eea'],
            obstacle: ['#ff6b6b', '#ff7675', '#fd79a8'],
            powerup: ['#f9ca24', '#fdcb6e', '#e17055']
        };
        
        return colors[this.type][Math.floor(Math.random() * colors[this.type].length)];
    }
    
    update(deltaTime) {
        this.pulse += deltaTime * 0.005;
        
        if (this.type === 'collectible') {
            this.velocity.x += (Math.random() - 0.5) * 0.1;
            this.velocity.y += (Math.random() - 0.5) * 0.1;
            
            this.velocity.x *= 0.98;
            this.velocity.y *= 0.98;
            
            this.x += this.velocity.x;
            this.y += this.velocity.y;
        }
        this.x = Math.max(this.radius, Math.min(window.innerWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(window.innerHeight - this.radius, this.y));
    }
    
    render(ctx) {
        ctx.save();
        
        const pulseScale = 1 + Math.sin(this.pulse) * 0.1;
        ctx.translate(this.x, this.y);
        ctx.scale(pulseScale, pulseScale);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        if (this.type === 'collectible') {
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else if (this.type === 'obstacle') {
            ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else if (this.type === 'powerup') {
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius * 0.7, this.radius * 0.7);
            ctx.lineTo(-this.radius * 0.7, this.radius * 0.7);
            ctx.closePath();
        }
        
        ctx.fill();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
    }
}

window.addEventListener('load', () => {
    new GameEngine();
}); 
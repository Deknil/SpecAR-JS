class Module extends SpecAR.baseClasses.BaseModuleApp {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'Module-SnakeGame',
            translationPrefix: 'MODULE_SNAKEGAME',
            version: '1.0',
            mode: this.MODULE_MODE.APPLICATION,
        };

        // Объект с кнопками управления змейкой
        this.buttons = {};

        // Направление змейки
        this.direction = 'up';

        // Игровое поле
        this.canvas = null;
        this.ctx = null;
        this.snake = [];
        this.apple = {};
        this.gameWidth = 32; // ширина игрового поля в блоках
        this.gameHeight = 32; // высота игрового поля в блоках
        this.intervalId = null;

        // Игровые очки
        this.scoreElement = null;
        this.score = 0;
    }

    // Выход из приложения
    onExit() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    // Рендер приложения
    async onRender() {
        // Инициализируем кнопки
        this.initButtons();

        // Инициализируем игровое поле
        this.initGameCanvas();

        // Инициализация игровых очков
        this.initGameScore();

        // Запускаем игру
        this.startGame();
    }

    // Обновление игровых очков
    gameScoreUpdate() {
        this.scoreElement.innerText = this.getModuleTranslate('SCORE', { score: this.score });
    }

    // Инициализация игровых очков
    initGameScore() {
        this.scoreElement = document.getElementById('Application-Game-Score');
        this.gameScoreUpdate();
    }

    // Сброс позиции яблока
    resetApple() {
        this.apple = {
            x: Math.floor(Math.random() * this.gameWidth),
            y: Math.floor(Math.random() * this.gameHeight),
        };
    }

    // Сброс позиции змейки
    resetSnake() {
        this.snake = [
            { x: Math.floor(this.gameWidth / 2), y: Math.floor(this.gameHeight / 2) },
            { x: Math.floor(this.gameWidth / 2) - 1, y: Math.floor(this.gameHeight / 2) },
            { x: Math.floor(this.gameWidth / 2) - 2, y: Math.floor(this.gameHeight / 2) },
            { x: Math.floor(this.gameWidth / 2) - 3, y: Math.floor(this.gameHeight / 2) },
            { x: Math.floor(this.gameWidth / 2) - 4, y: Math.floor(this.gameHeight / 2) },
        ];
    }

    // Начало игры
    startGame() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.score = 0; // сброс счета при старте новой игры
        this.resetApple();
        this.resetSnake();
        this.intervalId = setInterval(() => this.gameLoop(), 100);
    }

    // Основной цикл игры
    gameLoop() {
        this.updateSnake();
        this.drawEverything();
    }

    // Обновление позиции змейки
    updateSnake() {
        let head = Object.assign({}, this.snake[0]); // копируем голову
        switch (this.direction) {
            case 'up':
                head.y -= 1;
                break;
            case 'down':
                head.y += 1;
                break;
            case 'left':
                head.x -= 1;
                break;
            case 'right':
                head.x += 1;
                break;
        }

        const widthInBlocks = this.gameWidth;
        const heightInBlocks = this.gameHeight;

        // Телепортация змейки при достижении стенки
        if (head.x < 0) head.x = widthInBlocks - 1;
        if (head.x >= widthInBlocks) head.x = 0;
        if (head.y < 0) head.y = heightInBlocks - 1;
        if (head.y >= heightInBlocks) head.y = 0;

        // Проверка столкновения с яблоком
        if (head.x === this.apple.x && head.y === this.apple.y) {
            this.score++; // увеличиваем счет
            this.gameScoreUpdate();
            this.resetApple();
        } else if (this.checkCollision(head)) {
            this.startGame();
            return;
        } else {
            this.snake.pop(); // убираем последний элемент змейки, если не съели яблоко
        }

        this.snake.unshift(head);
    }

    // Проверка столкновения змейки с самой собой
    checkCollision(head) {
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                return true;
            }
        }
        return false;
    }

    // Отрисовка змейки и яблока
    drawEverything() {
        // Очищаем поле
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Отрисовываем змейку
        this.ctx.fillStyle = 'green';
        for (let i = 0; i < this.snake.length; i++) {
            this.ctx.fillRect(
                this.offsetX + this.snake[i].x * this.blockSize,
                this.offsetY + this.snake[i].y * this.blockSize,
                this.blockSize,
                this.blockSize
            );
        }

        // Отрисовываем яблоко
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(
            this.offsetX + this.apple.x * this.blockSize,
            this.offsetY + this.apple.y * this.blockSize,
            this.blockSize,
            this.blockSize
        );
    }

    // Инициализация игрового поля
    initGameCanvas() {
        this.canvas = document.getElementById('Application-GameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Вычисляем размер блока в зависимости от размера канваса и игрового поля
        const canvasRatio = this.canvas.width / this.canvas.height;
        const gameRatio = this.gameWidth / this.gameHeight;
        let blockSize;

        if (canvasRatio < gameRatio) {
            // Ширина канваса меньше, привязываем размер блока к ширине канваса
            blockSize = this.canvas.width / this.gameWidth;
        } else {
            // Высота канваса меньше или равна, привязываем размер блока к высоте канваса
            blockSize = this.canvas.height / this.gameHeight;
        }

        // Вычисляем смещение, чтобы отцентрировать игровое поле
        const offsetX = (this.canvas.width - blockSize * this.gameWidth) / 2;
        const offsetY = (this.canvas.height - blockSize * this.gameHeight) / 2;

        this.blockSize = blockSize;
        this.offsetX = offsetX;
        this.offsetY = offsetY;

        this.resetApple();
        this.resetSnake();
    }

    // Инициализация кнопок управления змейкой
    initButtons() {
        this.buttons.up = document.getElementById('Application-Game-Controls-Up');
        this.buttons.down = document.getElementById('Application-Game-Controls-Down');
        this.buttons.left = document.getElementById('Application-Game-Controls-Left');
        this.buttons.right = document.getElementById('Application-Game-Controls-Right');

        this.buttons.up.addEventListener('click', () => {
            if (this.direction !== 'down') this.direction = 'up';
        });
        this.buttons.down.addEventListener('click', () => {
            if (this.direction !== 'up') this.direction = 'down';
        });
        this.buttons.left.addEventListener('click', () => {
            if (this.direction !== 'right') this.direction = 'left';
        });
        this.buttons.right.addEventListener('click', () => {
            if (this.direction !== 'left') this.direction = 'right';
        });
    }
}

module.exports = { Module };

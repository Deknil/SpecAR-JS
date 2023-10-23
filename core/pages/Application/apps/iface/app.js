class App extends SpecAR.baseClasses.BaseApp {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'Module-Gunzar-Face',
            translationPrefix: 'MODULE_GUNZAR_FACE',
            version: '2.0',
        };

        /**
         * Поток с вебкамеры
         */
        this._webcamStream = null;
    }

    /**
     * Выход из приложения
     */
    onExit() {
        if (this._webcamStream) {
            // Завершаем процесс с потоком видео
            this._webcamStream.kill();

            // Сбрасываем переменную
            this._webcamStream = null;
        }
    }

    /**
     * Запуск потока с веб камеры с помощью Python скрипта
     */
    async startWebCamStream() {
        let pythonExecutable;

        if (SpecAR.os.platform() === 'linux') {
            pythonExecutable = SpecAR.getPath('core/python/venv/bin/python');
        } else {
            throw logger.error({ title: this.appID, message: 'Unsupported platform' });
        }

        if (this._webcamStream == null) {
            const assetsPath = SpecAR.path.join(__dirname, 'assets');
            try {
                const pythonProcess = SpecAR.execFile(
                    pythonExecutable,
                    [SpecAR.path.join(__dirname, 'python/main.py'), assetsPath],
                    (error, stdout, stderr) => {
                        // Очищаем стрим после завершения скрипта
                        this._webcamStream = null;
                    }
                );
                // Сохраняем процесс в переменную
                this._webcamStream = pythonProcess;
            } catch (error) {
                SpecAR.logger.error({ title: this.appID, message: error });
            }
        }
    }

    /**
     * Получение и рендеринг потока с камеры из сервера
     */
    async _wardrobeRender() {
        // Запускаем поток с камеры
        this.startWebCamStream();

        // Находим элемент для видео
        const videoEl = document.getElementById(`${this.appID}_webcam-video`);

        // Ждем пока поток с видео поступит
        while (true) {
            try {
                const response = await fetch('http://localhost:12345/');
                if (response.ok) {
                    videoEl.src = 'http://localhost:12345/';
                    videoEl.style.display = 'unset';
                    break;
                }
            } catch (error) {}
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Рендер приложения
     */
    async onRender() {
        // Запускаем рендеринг
        this._wardrobeRender();
    }
}

module.exports = { App };

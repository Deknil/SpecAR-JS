class App extends SpecAR.baseClasses.BaseApp {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'App-Camera',
            translationPrefix: 'APP_CAMERA',
            version: '1.0',
        };

        /**
         * Дополнительные аргументы для рендера шаблона
         */
        this._renderTemplateArg = {};

        // Поле потока
        this._videoStream;
    }

    /**
     * Сохранить фотографию с веб-камеры
     */
    async takePhoto() {
        // Получаем элемент с изображением
        const videoEl = document.getElementById(`${this.appID}__webCam-video`);

        // Создаем холст
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 1280;
        const context = canvas.getContext('2d');

        // Создаем временный холст для поворота видео
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoEl.videoHeight;
        tempCanvas.height = videoEl.videoWidth;
        const tempContext = tempCanvas.getContext('2d');

        // Поворачиваем видео на временном холсте
        tempContext.translate(tempCanvas.width, 0);
        tempContext.rotate(Math.PI / 2);
        tempContext.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);

        // Отражаем основной холст по горизонтали
        context.scale(-1, 1);

        // Рисуем повернутое видео с временного холста на основной холст
        context.drawImage(tempCanvas, -canvas.width, 0, canvas.width, canvas.height);

        // Преобразование canvas в blob-объект
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));

        // Создание файла и сохранение его в папку по пути __dirname
        const dirPath = SpecAR.getPath('DCIM');

        // Проверяем наличие папки DCIM
        if (!SpecAR.fs.existsSync(dirPath)) {
            SpecAR.fs.mkdirSync(dirPath, { recursive: true });
        }

        const uniqueID = Math.round(Date.now() / 1000) + Math.round(Math.random() * 10000);
        const fileName = `photo-ID${uniqueID}.jpg`;
        const filePath = SpecAR.path.join(dirPath, fileName);

        try {
            await SpecAR.fs.promises.writeFile(filePath, Buffer.from(await blob.arrayBuffer()));
        } catch (err) {
            SpecAR.logger.error({ title: this.appID, message: `Error when saving a photo: ${err}` });
        }

        SpecAR.Notify.success(SpecAR.Translator.translate('APP_CAMERA_TAKE_PHOTO_SUCCESSFUL'));
    }

    /**
     * Выход из приложения
     */
    onExit() {
        // Завершаем все потоки
        if (this._videoStream) {
            this._videoStream.getTracks().forEach(track => track.stop());
        }
    }

    /**
     * Запуск потока видео из веб камеры
     */
    async runWebCam() {
        // Получаем элемент видео
        const videoEl = document.getElementById(`${this.appID}__webCam-video`);
        try {
            const constraints = {
                video: {
                    width: 1280,
                    height: 720,
                },
                audio: false,
            };

            // Запускаем поток
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoEl.srcObject = stream;
            videoEl.play();

            this._videoStream = stream;
        } catch (err) {
            SpecAR.logger.error({ title: this.appID, message: `Camera access error: ${err}` });
        }
    }

    /**
     * Рендер приложения
     */
    async onRender() {
        // Запускаем камеру
        await this.runWebCam();
    }
}
module.exports = { App };

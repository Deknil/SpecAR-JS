class Module extends SpecAR.baseClasses.BaseModule {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'iAssistant',
            translationPrefix: 'MODULE_IASSISTANT',
            version: '1.0',
            mode: this.MODULE_MODE.LIBRARY,

            // Имя голосового ассистента
            iaName: 'Саманта',
            // API ключ к ChatGPT
            APIKeyChatGPT: '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',
        };

        this.speakLocaleFromConfig = SpecAR.Config.getData.locale.substring(0, 2);
        this.currentAudioPath = null;
        this.currentAudioPlayer = null;
        this.pythonProcess = null;
    }

    /**
     * Получение органов управления виджетом
     * @returns {string} Код HTML элементов
     */
    moduleControls() {
        const mControls = `
            <div class="SpecAR-UIKIT-accordion__content__controls">
                <div class="SpecAR-UIKIT-textEntry">
                    <span class="SpecAR-UIKIT-textEntry__title"> {{inputIANameTitle}}</span>
                    <input class="SpecAR-UIKIT-textEntry__input" type="text" id="{{moduleID}}_ianame" data-onchange="changeIAName" data-module-id="{{moduleID}}" value="{{iaName}}" disabled>
                </div>
            </div>
        `;
        // Рендерим через nunjucs
        const njHtml = SpecAR.nunjucks.renderString(mControls, {
            moduleID: this.moduleID,
            iaName: this.config.iaName,
            inputIANameTitle: this.getModuleTranslate('CONTROLS_IANAME_TITLE'),
        });

        return njHtml;
    }

    /**
     * API модуля
     */
    moduleAPI = {
        changeIAName: input => {
            const iaName = SpecAR.tools.capitalize(input.value);
            const iaNameInput = document.getElementById(`${this.moduleID}_city`);

            // Если ничего не передано
            if (!iaName) {
                iaNameInput.value = this.config.iaName;
                return;
            }

            this.config.iaName = iaName;
        },
    };

    /**
     * Озвучивание текста с помощью синтезатора голоса
     * @param {string} text Текст для озвучки
     */
    async speak(text, lang = 'ru') {
        // Проверяем, если уже идет воспроизведение, останавливаем его
        if (this.currentAudioPlayer) {
            await this.currentAudioPlayer.pause();
            this.currentAudioPlayer.currentTime = 0;
            await SpecAR.promisify(SpecAR.fs.unlink)(this.currentAudioPath);
            this.currentAudioPath = null;
        }

        // Логируем слова ассистента
        SpecAR.logger.info({ title: this.moduleID, message: `Speak: ${text}` });

        // Исправляем текст для запроса
        let urlText = encodeURIComponent(text);

        // Формируем URL
        let url = `https://translate.google.com.vn/translate_tts?ie=UTF-8&q=${urlText}&tl=${lang}&client=tw-ob`;

        try {
            // Получаем аудио данные в бинарном виде
            let response = await SpecAR.axios({
                url: url,
                method: 'GET',
                responseType: 'arraybuffer',
            });

            // Создаем буфер из бинарных данных
            const buffer = Buffer.from(response.data, 'binary');

            // Формируем путь в выходному файлу
            const filePath = await SpecAR.getPath(`temp/${new Date().getTime()}-tts.mp3`);

            // Записываем содержимое буфера в файл
            await SpecAR.promisify(SpecAR.fs.writeFile)(filePath, buffer); // Записываем содержимое буфера в файл

            // Создаем экземпляр аудиоэлемента и воспроизводим файл
            const audio = new Audio(filePath);
            audio.addEventListener('ended', () => {
                // Удаляем файл после воспроизведения
                SpecAR.promisify(SpecAR.fs.unlink)(filePath);

                this.currentAudioPlayer = null;
                this.currentAudioPath = null;
            });
            audio.volume = SpecAR.Config.getData.applicationVolume * 0.01;
            audio.play();

            // Сохраняем текущий путь и аудиоэлемент
            this.currentAudioPath = filePath;
            this.currentAudioPlayer = audio;
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: `TTS error: ${error}` });
        }
    }

    /**
     * Генерация текста по заданному запросу
     * @param {string} promt Запрос для ChatGPT
     * @returns {string} Сгенерированый ответ от ChatGPT 3.5
     */
    async getGPTText(promt = 'Привет!') {
        // Promt
        const newPromt = `Напиши краткий ответ в двух коротких предложениях на следующий вопрос: ${promt}`;

        // Формируем заголовки
        const openai = SpecAR.axios.create({
            baseURL: 'https://api.openai.com/v1',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.config.APIKeyChatGPT}`,
            },
        });

        // Сообщение
        const messages = [
            {
                role: 'user',
                content: newPromt,
            },
        ];

        // Опции к запросу
        const options = {
            temperature: 0.5,
            max_tokens: 50,
        };

        // Отправка запроса
        try {
            const response = await openai.post('/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages,
                ...options,
            });

            const result = response.data.choices[0].message.content;
            return result;
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: `Error creating chat completion: ${error}` });
            return 'К сожалению, в данный момент я не могу ответить на ваш вопрос';
        }
    }

    /**
     * Запуск локального сервера распознавания голоса
     */
    async startRecognitionServer() {
        let pythonExecutable;
        if (SpecAR.os.platform() === 'linux') {
            pythonExecutable = SpecAR.getPath('core/python/venv/bin/python');
        } else {
            throw logger.error({ title: this.moduleID, message: 'Unsupported platform' });
        }

        try {
            this.pythonProcess = SpecAR.execFile(
                pythonExecutable,
                [SpecAR.path.join(__dirname, 'python/iAssistant.py')],
                (error, stdout, stderr) => {}
            );
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: error });
        }
    }

    /**
     * Анализ ответов сервера распознавания голоса
     * @param {string} text Ответ сервера распознавания голоса
     */
    async analyzeRecognition(text) {
        // Логи ответов (разработка)
        SpecAR.logger.debug({ title: this.moduleID, message: `SpeechRecognition: ${text}` });

        // Разбиваем ответ на отдельные слова
        const words = text.split(' ');

        if (words[0] == 'ошибка') {
            SpecAR.logger.error({ title: this.moduleID, message: `Answer Error: ${text}` });
            return;
        }

        // Игнорируем всю речь, если не было прямого обращения к ассистенту
        let canSpeak = false;
        for (const word of words) {
            if (word === this.config.iaName.toLowerCase()) {
                canSpeak = true;
                break;
            }
        }

        if (!canSpeak) {
            return;
        }

        // Формируем команду
        const command = words.join(' ');
        SpecAR.logger.info({ title: this.moduleID, message: `Command: ${command}` });

        await this.speak(await this.getGPTText(command));
    }

    /**
     * Распознавание голоса через локальный сервер speech_recognition (python Flask)
     */
    async recognizeSpeech() {
        try {
            // Получаем запрос через через long pool
            const response = await SpecAR.axios.get('http://localhost:11111/assistant');
            const data = response.data;

            // Анализируем ответ
            this.analyzeRecognition(data);

            // Начинаем новый опрос, только когда предыдущий запрос завершился
            this.recognizeSpeech();
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: `Error: ${error}` });
            this.recognizeSpeech();
        }
    }

    /**
     * Инициализация
     */
    async afterInit() {
        if (process.env.NODE_ENV === 'development') { return }

        // Слушаем выход из приложения
        window.addEventListener('onAppExit', e => {
            if (this.pythonProcess) {
                this.pythonProcess.kill();
            }
        });
        // Запускаем сервер распознавания голоса
        this.startRecognitionServer();

        // Слушаем сервер
        this.recognizeSpeech();


        setTimeout(() => {
            this.speak(
                this.getModuleTranslate('TEXTARRAY_HELLO_WORLD', { iaName: this.config.iaName }),
                this.speakLocaleFromConfig
            );}, 3000);


        // Слушаем изменение профиля
        window.addEventListener('onProfileChanged', () => this.profileChangedHook());
    }

    profileChangedHook() {
        // Если гостевой профиль
        if (SpecAR.Profile.activeProfile.id === 'Guest') {
            return;
        }
        const profileName = SpecAR.Profile.activeProfile.profileName;
        this.speak(this.getModuleTranslate('TEXTARRAY_PROFILE_DETECT', { userName: profileName }), this.speakLocaleFromConfig);
    }
}

module.exports = { Module };

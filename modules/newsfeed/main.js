class Module extends SpecAR.baseClasses.BaseModule {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'Module-NewsFeed',
            translationPrefix: 'MODULE_NEWSFEED',
            version: '1.0',
            mode: this.MODULE_MODE.WIDGET,
            orientation: { x: 'right', y: 'top' },
            position: { x: 10, y: 150 },
            size: { w: 500, h: 300 },

            // API ключ для новостей, 100 запросов в сутки
            apiKey: '1cfcea445163a7cbf5405804512ed915',

            // Количество статей за один запрос
            articleShowCount: 8,
            // Время обновления новостей в мс
            updateTimer: 1800000,
        };
    }

    /**
     * API Модуля
     */
    moduleAPI = {
        changePosX: input => {
            const value = input.value;
            const widgetElement = document.getElementById(this.moduleID);
            widgetElement.style[this.config.orientation.x] = `${value}px`;

            this.config.position.x = value;
            this.updateConfig();
        },
        changePosY: input => {
            const value = input.value;
            const widgetElement = document.getElementById(this.moduleID);
            widgetElement.style[this.config.orientation.y] = `${value}px`;
            this.config.position.y = value;
            this.updateConfig();
        },
    };

    /**
     * Получение органов управления виджетом
     * @returns {string} Код HTML элементов
     */
    moduleControls() {
        const mControls = `
            <div class="SpecAR-UIKIT-accordion__content__controls">
                <div class="SpecAR-UIKIT-slider">
                    <span class="SpecAR-UIKIT-slider__title"> {{inputPosXTitle}}</span>
                    <input  type="range" id="{{moduleID}}_city" data-onchange="changePosX" min="0" max="{{maxPosX}}" data-module-id="{{moduleID}}" value="{{currentPosX}}">
                </div>
                <div class="SpecAR-UIKIT-slider">
                    <span class="SpecAR-UIKIT-slider__title"> {{inputPosYTitle}}</span>
                    <input type="range" id="{{moduleID}}_city" data-onchange="changePosY" min="0" max="{{maxPosY}}" data-module-id="{{moduleID}}" value="{{currentPosY}}">
                </div>
            </div>
        `;
        // Рендерим через nunjucs
        const njHtml = SpecAR.nunjucks.renderString(mControls, {
            moduleID: this.moduleID,
            inputPosXTitle: this.getModuleTranslate('POSITION_X'),
            inputPosYTitle: this.getModuleTranslate('POSITION_X'),
            maxPosX: window.innerWidth,
            maxPosY: window.innerHeight,
            currentPosX: this.config.position.x,
            currentPosY: this.config.position.y,
        });

        return njHtml;
    }

    /**
     * Дополнительная инициализация
     */
    async afterInit() {
        // Подгружаем актуальные данные
        this.updateInformation();

        // Цикл обновления данных
        setInterval(() => {
            this.updateInformation();
        }, this.config.updateTimer);
    }

    /**
     * Получение актуальных данных новостей
     */
    updateInformation() {
        SpecAR.deviceAPI.isInternetConnection(connected => {
            if (connected) {
                this._fetchNewsData()
                    .then(NewsData => {
                        this._updateNewsData(NewsData);
                    })
                    .catch(error => {
                        SpecAR.logger.warn({ title: this.config.id, message: `${error}` });
                    });
            }
        });
    }

    /**
     * Получение данных новостей с сервера NewsApi
     * @returns Объект с данными
     */
    async _fetchNewsData() {
        try {
            const url = `https://gnews.io/api/v4/top-headlines?token=${this.config.apiKey}&max=${
                this.config.articleShowCount
            }&lang=${SpecAR.Config.getData.locale.slice(0, 2).toLowerCase()}&country=${SpecAR.Config.getData.locale
                .slice(-2)
                .toLowerCase()}`;

            const response = await fetch(url);
            if (response.status === 404) {
                SpecAR.logger.error({ title: this.moduleID, message: 'News search error!' });
                return;
            }

            const data = await response.text();
            return JSON.parse(data);
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: 'An error occurred while fetching news data or parsing JSON.' });
            console.error(error);
        }
    }

    /**
     * Изменение новостей и дальнейший ререндеринг шаблона
     * @param {object} newData Объект с данными о погоде
     */
    _updateNewsData(newData) {
        const articleArray = newData.articles;

        // Время запроса
        const fetchTime = `${new Date().getHours().toString().padStart(2, '0')}:${new Date()
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;

        /**
         * Преобразует ISO время в формат HH:MM
         * @param {string} isoTimeString Время в формате ISO
         * @returns {string} Время в формате HH:MM
         */
        const convertToReadTime = isoTimeString =>
            new Date(isoTimeString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        this.reloadTemplate({ articleArray: articleArray, fetchTime, convertToReadTime });
    }
}

module.exports = { Module };

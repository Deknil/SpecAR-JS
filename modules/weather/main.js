class Module extends SpecAR.baseClasses.BaseModule {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'Module-Weather',
            translationPrefix: 'MODULE_WEATHER',
            version: '1.0',
            mode: this.MODULE_MODE.WIDGET,
            orientation: { x: 'right', y: 'top' },
            position: { x: 0, y: 0 },
            size: { w: 300, h: 130 },

            /**
             * Ключ API для сайта OWM
             */
            apiKey: '9c261192b94b0fdd5a09f23247a7279f',

            /**
             * Город по умолчанию
             */
            city: 'Краснодар',

            /**
             * Время обновления данных в мс
             */
            updateTimer: 60000,
        };
    }

    /**
     * API модуля
     */
    moduleAPI = {
        changeCity: input => {
            this.changeCity(SpecAR.tools.capitalize(input.value));
        },
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
                <div class="SpecAR-UIKIT-textEntry">
                    <span class="SpecAR-UIKIT-textEntry__title"> {{inputCityTitle}}</span>
                    <input class="SpecAR-UIKIT-textEntry__input" type="text" id="{{moduleID}}_city" data-onchange="changeCity" data-module-id="{{moduleID}}" value="{{currentCity}}">
                </div>
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
            inputCityTitle: this.getModuleTranslate('INPUT_CITY'),
            inputPosXTitle: this.getModuleTranslate('POSITION_X'),
            inputPosYTitle: this.getModuleTranslate('POSITION_X'),
            maxPosX: window.innerWidth,
            maxPosY: window.innerHeight,
            currentCity: this.config.city,
            currentPosX: this.config.position.x,
            currentPosY: this.config.position.y,
        });

        return njHtml;
    }

    /**
     * Инициализация
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
     * Получение актуальных данных погоды по городу
     * @param {string} city Название города
     */
    updateInformation(city = this.config.city) {
        SpecAR.deviceAPI.isInternetConnection(connected => {
            if (connected) {
                this._fetchWeatherData(city)
                    .then(weatherData => {
                        this._updateWeatherData(weatherData);
                    })
                    .catch(error => {
                        SpecAR.logger.warn({ title: this.config.id, message: `${error}` });
                    });
            }
        });
    }

    /**
     * Изменение данных о погоде в соответствии с новым городом
     * @param {string} city Название города
     */
    changeCity(city = this.config.city) {
        const cityInput = document.getElementById(`${this.moduleID}_city`);

        // Если ничего не передано
        if (!city) {
            cityInput.value = this.config.city;

            SpecAR.Notify.error(this.getModuleTranslate('CITY_ERROR'));
            SpecAR.logger.error({ title: this.moduleID, message: 'The name of the city is incorrect!' });
            return;
        }
        SpecAR.deviceAPI.isInternetConnection(connected => {
            if (connected) {
                this._fetchWeatherData(city)
                    .then(weatherData => {
                        this.updateInformation(weatherData.name);
                        cityInput.value = weatherData.name;
                        this.config.city = weatherData.name;

                        this.updateConfig();
                        SpecAR.Notify.success(this.getModuleTranslate('CITY_CHANGED', { city: weatherData.name }));
                    })
                    .catch(error => {});
            }
        });
    }

    /**
     * Получение данных о погоде с сервером OWM
     * @param {string} city Название города
     * @returns Объект с данными
     */
    async _fetchWeatherData(city) {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${
            this.config.apiKey
        }&units=metric&lang=${SpecAR.Config.getData.locale.slice(0, 2)}`;
        const response = await fetch(url);
        if (response.status === 404) {
            try {
                const cityInput = document.getElementById(`${this.moduleID}_city`);
                cityInput.value = this.config.city;
            } catch (error) {}

            SpecAR.Notify.error(this.getModuleTranslate('CITY_ERROR'));
            SpecAR.logger.error({ title: this.moduleID, message: 'The name of the city is incorrect!' });
            return;
        }

        const data = await response.text();
        return JSON.parse(data);
    }

    /**
     * Изменение данных о погоде и дальнейший ререндеринг шаблона
     * @param {object} newData Объект с данными о погоде
     */
    _updateWeatherData(newData) {
        const weatherData = {
            temperature: newData.main.temp.toFixed(0),
            sky: SpecAR.tools.capitalize(newData.weather[0].description),
            iconID: newData.weather[0].icon,
        };

        if (!this.cachedData || JSON.stringify(this.cachedData) != JSON.stringify(weatherData)) {
            const time = new Date();
            const hours = time.getHours().toString().padStart(2, '0');
            const minutes = time.getMinutes().toString().padStart(2, '0');

            const timeText = `${hours}:${minutes}`;

            this.cachedData = { ...weatherData };
            this.reloadTemplate({ ...this.cachedData, city: this.config.city, fetchTime: timeText });
        }
    }
}

module.exports = { Module };

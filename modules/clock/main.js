class Module extends SpecAR.baseClasses.BaseModule {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'Module-Clock',
            translationPrefix: 'MODULE_CLOCK',
            version: '1.0',
            mode: this.MODULE_MODE.WIDGET,
            orientation: { x: 'right', y: 'top' },
            position: { x: 300, y: 20 },
            size: { w: 200, h: 100 },

            // Время обновления значений часов
            updateTimer: 5000,
        };
    }

    /**
     * API модуля
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
     * Обновление данных часов
     */
    updateInformation() {
        /**
         * Контейнеры
         */
        const containerTimeHM = document.querySelector(`#${this.moduleID}-hour_minute`);
        const containerDate = document.querySelector(`#${this.moduleID}-date`);

        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const months = [
            this.getModuleTranslate('JANUARY'),
            this.getModuleTranslate('FEBRUARY'),
            this.getModuleTranslate('MARCH'),
            this.getModuleTranslate('APRIL'),
            this.getModuleTranslate('MAY'),
            this.getModuleTranslate('JUNE'),
            this.getModuleTranslate('JULY'),
            this.getModuleTranslate('AUGUST'),
            this.getModuleTranslate('SEPTEMBER'),
            this.getModuleTranslate('OCTOBER'),
            this.getModuleTranslate('NOVEMBER'),
            this.getModuleTranslate('DECEMBER'),
        ];
        const day = now.getDate().toString().padStart(2, '0');
        const month = months[now.getMonth()];
        const year = now.getFullYear();

        if (containerTimeHM.textContent != `${hours}:${minutes}`) {
            containerTimeHM.innerText = `${hours}:${minutes}`;
        }
        if (containerDate.textContent != `${day} ${month} ${year}`) {
            containerDate.innerText = `${day} ${month} ${year}`;
        }
    }

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
}

module.exports = { Module };

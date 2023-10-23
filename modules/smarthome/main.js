class Module extends SpecAR.baseClasses.BaseModule {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'Module-SmartHome',
            translationPrefix: 'MODULE_SMARTHOME',
            version: '1.0',
            mode: this.MODULE_MODE.LIBRARY,

            /**
             * Ключ api HomeAssistant
             */
            APIKey: '',

            /**
             * URL сервера HomeAssistant
             */
            URL: '',

            /**
            * Частота обновления состояния в секундах
             */
            updateFrequency: 10,
        };

        /**
         * Кнопки состояний
         */
        this.appState = {
            'shutdown': 'off',
            'reboot': 'off',
        };
    }

    /**
     * Получение органов управления виджетом
     * @returns {string} Код HTML элементов
     */
    moduleControls() {
        const mControls = `
            <div class="SpecAR-UIKIT-accordion__content__controls">
                <div class="SpecAR-UIKIT-textEntry">
                    <span class="SpecAR-UIKIT-textEntry__title"> {{inputAPIKeyTitle}}</span>
                    <input class="SpecAR-UIKIT-textEntry__input" type="text" id="{{moduleID}}_apikey" data-onchange="changeAPI" data-module-id="{{moduleID}}" value="{{APIKey}}" placeholder="API key">
                </div>
                <div class="SpecAR-UIKIT-textEntry">
                    <span class="SpecAR-UIKIT-textEntry__title"> {{inputURLTitle}}</span>
                    <input class="SpecAR-UIKIT-textEntry__input" type="text" id="{{moduleID}}_URL" data-onchange="changeURL" data-module-id="{{moduleID}}" value="{{URL}}" placeholder="192.168.1.2:13373">
                </div>
            </div>
        `;
        // Рендерим через nunjucs
        const njHtml = SpecAR.nunjucks.renderString(mControls, {
            inputAPIKeyTitle: this.getModuleTranslate('CONTROLS_APIKEY_TITLE'),
            inputURLTitle: this.getModuleTranslate('CONTROLS_URL_TITLE'),
            moduleID: this.moduleID,
            APIKey: this.config.APIKey,
            URL: this.config.URL
        });

        return njHtml;
    }

    /**
     * API модуля
     */
    moduleAPI = {
        changeAPI: input => {
            const key = input.value;
            const keyInput = document.getElementById(`${this.moduleID}_apikey`);

            // Если ничего не передано
            if (!key) {
                keyInput.value = this.config.APIKey;
                return;
            }

            this.config.APIKey = key;

            this.updateConfig();
        },
        changeURL: input => {
            const url = input.value;
            const urlInput = document.getElementById(`${this.moduleID}_URL`);

            // Если ничего не передано
            if (!url) {
                urlInput.value = this.config.URL;
                return;
            }

            this.config.URL = url;

            this.updateConfig();
        },
    };

    /**
     * Устанавливаем новое состояние и, если необходимо, выполняем действия.
     * @param entity_id ID Сущности
     * @param new_state Новое состояние
     */
    async setAndPerformAction(entity_id, new_state) {
        const response = await this.setState(entity_id, new_state);
        if (response && response.state == 'on') {
            if (entity_id == 'shutdown') {
                SpecAR.deviceAPI.deviceShutdown(1);
            } else if (entity_id == 'reboot') {
                SpecAR.deviceAPI.deviceRestart(1);
            }
            // Обновляем состояние обратно на 'off' после выполнения действия
            await this.setState(entity_id, 'off');
        }
        return response;
    }


    /**
     * Получить состояние
     * @param entity_id id сущности
     */
    async getState(entity_id) {
        try {
            const response = await SpecAR.axios.get(`${this.config.URL}/api/states/${entity_id}`, {
                headers: {
                    Authorization: `Bearer ${this.config.APIKey}`
                }
            });

            return response.data.state;
        } catch (error) {
            console.error(`Failed to get state for ${entity_id}`, error);
        }
    }

    /**
     * Обновление состояние приложения
     */
    async checkStateUpdates() {
        for (let entity_id in this.appState) {
            const newState = await this.getState(entity_id);
            if (newState !== this.appState[entity_id]) {
                this.appState[entity_id] = newState;
                await this.setAndPerformAction(entity_id, newState);
            }
        }
    }

    /**
     * Устанавливает состояние сущности
     * @param entity_id ID Сущности
     * @param new_state Новое состояние
     * @param attributes Необязательные атрибуты
     */
    async setState(entity_id, new_state, attributes = {}) {
        try {
            const response = await SpecAR.axios.post(`${this.config.URL}/api/states/${entity_id}`, {
                state: new_state,
                attributes: attributes
            }, {
                headers: {
                    Authorization: `Bearer ${this.config.APIKey}`
                }
            });

            return response.data;
        } catch (error) {
            console.error(`Failed to set state for ${entity_id}`, error);
        }
    }


    /**
     * Инициализация
     */
    async afterInit() {
        // Создаем сущности в Home Assistant
        await this.setState('shutdown', 'off', {friendly_name: 'Выключение'});
        await this.setState('reboot', 'off', {friendly_name: 'Перезагрузка'});
        // Запускаем проверку обновлений состояния каждые N секунд
        setInterval(() => this.checkStateUpdates(), this.config.updateFrequency * 1000);
    }
}
module.exports = { Module };
class Config {
    /**
     * Настройки по умолчанию
     */
    static DEFAULT_CONFIG_SETTINGS = {
        VOLUME: {
            MAIN: 35,
            NOTIFY: 100,
            APPLICATION: 100,
        },
        DISPLAY: {
            LOCALE: 'ru_RU',
            BACKGROUND_COLOR: '#000000',
            TEXT_PRIMARY_COLOR: '#ffffff',
            TEXT_SECONDARY_COLOR: '#646464',
            ACCENT_COLOR: '#986df2',
            ICON_COLOR: '#ffffff',
            PAGE_BACKGROUND_PRIMARY_COLOR: '#26232a',
            PAGE_BACKGROUND_SECONDARY_COLOR: '#2a272e',
        },
        PROFILE: {
            AUTODETECT: true,
            AUTOEXIT: true,
        },
    };

    /**
     * Обновление API конфига в глобальной переменной SpecAR
     */
    static _updateAPI() {
        SpecAR.Config = {
            getData: {
                mainVolume: parseInt(this._config['VOLUME']['MAIN']),
                notifyVolume: parseInt(this._config['VOLUME']['NOTIFY']),
                applicationVolume: parseInt(this._config['VOLUME']['APPLICATION']),

                locale: this._config['DISPLAY']['LOCALE'],
                backgroundColor: this._config['DISPLAY']['BACKGROUND_COLOR'],
                textPrimaryColor: this._config['DISPLAY']['TEXT_PRIMARY_COLOR'],
                textSecondaryColor: this._config['DISPLAY']['TEXT_SECONDARY_COLOR'],
                accentColor: this._config['DISPLAY']['ACCENT_COLOR'],
                iconColor: this._config['DISPLAY']['ICON_COLOR'],
                pageBackgroundPrimaryColor: this._config['DISPLAY']['PAGE_BACKGROUND_PRIMARY_COLOR'],
                pageBackgroundSecondaryColor: this._config['DISPLAY']['PAGE_BACKGROUND_SECONDARY_COLOR'],

                profileAutoDetect: this._config['PROFILE']['AUTODETECT'],
                profileAutoExit: this._config['PROFILE']['AUTOEXIT'],
            },
            defaultConfig: JSON.parse(JSON.stringify(this.DEFAULT_CONFIG_SETTINGS)),
            API: this.API,
        };

        // Объявляем гостевые настройки
        try {
            if (SpecAR.Profile.activeProfile.id === 'Guest') {
                SpecAR.Config.guestConfig = this._config;
            }
        } catch (error) {}

        // Вызываем хук изменения настроек
        window.dispatchEvent(new Event('onConfigChanged'));
    }

    /**
     * Хук изменения профиля
     */
    static _handleProfileChanged() {
        // Находим активный профиль
        const curProfile = SpecAR.Profile.activeProfile;
        // Применяем его конфиг
        this._config = { ...this._config, ...curProfile.config };
        // Обновляем API
        this._updateAPI();

        // Изменяем уровень звука системы
        SpecAR.execCommand(`pulsemixer --set-volume ${this._config['VOLUME']['MAIN']}`).catch(error => {
            SpecAR.logger.error({ title: 'Config', message: `Error setting volume: ${error.message}` });
        });

        // Меняем цвета
        for (let colorName in this._config['DISPLAY']) {
            const value = this._config['DISPLAY'][colorName];
            colorName = colorName.toLowerCase().replace(/_/g, '-');

            // Пропускаем, если это не цвет
            if (!value.startsWith('#')) continue;

            // Применяем тему к странице
            document.documentElement.style.setProperty(`--${colorName}`, value);
        }
    }
    /**
     * Изменение значений конфига: применяет изменения и записывает их
     * @param {string} cat Категория настроек (VOLUNE, DISPLAT, etc)
     * @param {string} subcat Подкатегория настроек (LANGUAGE, ACCENT_COLOR, etc)
     * @param {*} value Значение параметра
     */
    static _setConfigData(cat, subcat, value) {
        // Проверяем, существуют ли такие категория и подкатегория
        if (typeof this._config[cat][subcat] === 'undefined') {
            SpecAR.logger.error({
                title: 'Config',
                message: 'This subcategory or category is not declared in the application settings',
            });
            return;
        }

        if (SpecAR.Profile.activeProfile.id !== 'Guest' && typeof SpecAR.Profile.activeProfile.config[cat] !== 'undefined') {
            SpecAR.Profile.activeProfile.config[cat][subcat] = value;
            this._updateAPI();

            window.dispatchEvent(new Event('onConfigProfileChanged'));
            return;
        }

        // Вносим изменения
        this._config[cat][subcat] = value;
        this._updateAPI();

        // Записываем изменения в файл
        SpecAR.fs.writeFile(this._configFilePath, JSON.stringify(this._config), err => {
            if (err)
                throw SpecAR.logger.error({
                    title: 'Config',
                    message: err,
                });
        });
    }

    /**
     * Инициализация системы конфигурации
     */
    static async init() {
        const startTime = new Date().getTime();
        await SpecAR.logger.info({
            title: 'Config',
            message: 'Initializing the configuration file...',
        });

        const access = SpecAR.util.promisify(SpecAR.fs.access);
        const mkdir = SpecAR.util.promisify(SpecAR.fs.mkdir);

        // Поле с настройками
        this._config = {};

        // Путь до конфигурационного файла
        this._configFilePath = SpecAR.getPath('data/config/guest.json');
        this._configDirPath = SpecAR.getPath('data/config');

        //Пробуем загрузить конфигурационный файл
        try {
            const configData = await SpecAR.fs.promises.readFile(this._configFilePath, 'utf8');

            SpecAR.logger.info({
                title: 'Config',
                message: `Configuration file found, settings loading`,
            });

            // Переобразуем в JS объект
            const configObj = JSON.parse(configData);

            // Присваем данные полю
            this._config = configObj;
        } catch (err) {
            SpecAR.logger.info({
                title: 'Config',
                message: `Configuration file not found, loading default settings`,
            });

            // Устанавливаем стандартные настройки

            this._config = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG_SETTINGS));

            // Проверяем есть ли временная папка и создаем ее при необходимости
            try {
                await access(this._configDirPath);
            } catch (err) {
                await mkdir(this._configDirPath, { recursive: true });
            }
            // Создаем новый конфигурационный файл
            SpecAR.fs.writeFile(this._configFilePath, JSON.stringify(this._config), err => {
                if (err)
                    SpecAR.logger.error({
                        title: 'Config',
                        message: err,
                    });
            });
        }

        // Обновление глобальной функции получения и изменения настроек
        this._updateAPI();

        // Применяем начальные настройки
        this._applyStartUpSettings();

        // Объявляем гостевые настройки
        SpecAR.Config.guestConfig = this._config;

        // Слушаем изменение профиля
        window.addEventListener('onProfileChanged', this._handleProfileChanged.bind(this));

        /**
         * Подведение итогов загрузки модулей
         */
        const endTime = new Date().getTime();
        const deltaTime = ((endTime - startTime) / 1000).toFixed(3);

        await SpecAR.logger.info({
            title: 'Config',
            message: `The configuration file is loaded for ${deltaTime} seconds`,
        });
    }

    /**
     * Методы применения настроек
     */
    static API = {
        /**
         * Изменение локали приложения
         * @param {string} locale Код новой локали (ru_RU, en_US, etc)
         */
        setLocale: async locale => {
            // Если переданная локаль соответствует текущей - игнорируем
            if (locale === this._config['DISPLAY']['LOCALE']) {
                return;
            }
            // Если не указана новая локаль игнорируем
            if (!locale) {
                return;
            }

            // Изменяем локаль в конфиге
            this._setConfigData('DISPLAY', 'LOCALE', locale);

            // Обновляем название профиля по умолчанию
            await SpecAR.Profile.changeLocaleGuestProfile();

            // Ререндерим страницу
            if (SpecAR.Navigation.isCurrentRoute('SETTINGS')) {
                SpecAR.Navigation.pageList.SETTINGS.updateRouteTemplate();
            }
        },
        setVolumeMain: value => {
            // Если не указано новое значение - игнорируем
            if (!value) {
                return;
            }
            // Изменяем локаль в конфиге
            this._setConfigData('VOLUME', 'MAIN', value);

            // Изменяем уровень звука системы
            SpecAR.execCommand(`pulsemixer --set-volume ${value}`).catch(error => {
                SpecAR.logger.error({ title: 'Config', message: `Error setting volume: ${error.message}` });
            });
        },
        setVolumeNotify: value => {
            // Если не указано новое значение - игнорируем
            if (!value) {
                return;
            }
            // Изменяем локаль в конфиге
            this._setConfigData('VOLUME', 'NOTIFY', value);
        },
        setVolumeApplication: value => {
            // Если не указано новое значение - игнорируем
            if (!value) {
                return;
            }
            // Изменяем локаль в конфиге
            this._setConfigData('VOLUME', 'APPLICATION', value);
        },
        setThemeColor: el => {
            // Если элемент не передан - игнорируем
            if (!el) {
                return;
            }

            // Если цвет не передан, задаем из конфига
            if (!el.value) {
                el.value = this._config['DISPLAY'][el.dataset.category];
            }

            // Переводим название настройки в вид --{название-цвета}
            const colorName = el.dataset.category.toLowerCase().replace(/_/g, '-');

            // Применяем в конфиг
            this._setConfigData('DISPLAY', el.dataset.category, el.value);

            // Применяем тему к странице
            document.documentElement.style.setProperty(`--${colorName}`, el.value);
        },
        setProfileAutoDetect: value => {
            // Если не указано новое значение - игнорируем
            if (typeof value === 'undefined') {
                return;
            }
            // Изменяем данные в конфиге
            this._setConfigData('PROFILE', 'AUTODETECT', value);
        },
        setProfileAutoExit: value => {
            // Если не указано новое значение - игнорируем
            if (typeof value === 'undefined') {
                return;
            }

            // Изменяем данные в конфиге
            this._setConfigData('PROFILE', 'AUTOEXIT', value);
        },
    };

    /**
     * Применение всех начальных настроек
     */
    static _applyStartUpSettings() {
        // Изменяем уровень звука системы
        SpecAR.execCommand(`pulsemixer --set-volume ${this._config['VOLUME']['MAIN']}`).catch(error => {
            SpecAR.logger.error({ title: 'Config', message: `Error setting volume: ${error.message}` });
        });

        // Применяем настройки темы
        for (let colorName in this._config['DISPLAY']) {
            const value = this._config['DISPLAY'][colorName];
            colorName = colorName.toLowerCase().replace(/_/g, '-');

            // Пропускаем, если это не цвет
            if (!value.startsWith('#')) continue;

            // Применяем тему к странице
            document.documentElement.style.setProperty(`--${colorName}`, value);
        }
    }
}

module.exports = { Config };

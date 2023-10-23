/**
 * Класс-шаблон для модулей
 */
class BaseModule {
    /**
     * Контейнер по умолчанию, в который будут добавляться все виджеты
     */
    WIDGET_CONTAINER = 'grid-container';

    /**
     * Базовые режимы модуля
     */
    MODULE_MODE = {
        WIDGET: { title: SpecAR.Translator.translate('MODULE_MODE_WIDGET'), renderTemplate: true, addStyleFile: true },
        LIBRARY: { title: SpecAR.Translator.translate('MODULE_MODE_LIBRARY'), renderTemplate: false, addStyleFile: false },
        APPLICATION: { title: SpecAR.Translator.translate('MODULE_MODE_APPLICATION'), renderTemplate: false, addStyleFile: true },
    };

    /**
     * API модуля
     */
    moduleAPI = {};
    /**
     * Конструктор класса
     * @param {path} direction Путь к папке модуля
     */
    constructor(direction) {
        this._direction = direction;
        this._iconPath = SpecAR.path.join(direction, 'icon.png');
        this._templatePath = SpecAR.path.join(direction, 'template.html');
        this._widgetContainer = document.getElementById(this.WIDGET_CONTAINER);
        this._defaultTemplateArg = {
            translator: (key, replacements) => SpecAR.Translator.translate(key, replacements),
            SpecAR: SpecAR,
        };

        // Таймер записи изменений конфига
        this._countdown = null;

        // Путь до конфигурационного файла
        this._configFilePath = SpecAR.path.join(direction, 'config.json');

        // Время, через которое происходит сохранение в конфигурационный файл, мс
        this._configUpdateTimer = 15000;

        // Состояние "Аккордион" меню во вкладке "Модули"
        this.isControlPanelOpen = false;
    }

    /**
     * Инициализация модуля
     */
    init() {
        /**
         * Вызываем доп. инициализацию перед основной в экземпляре модуля
         */
        this.beforeInit();

        /**
         * Загрузка словарей модуля
         */
        this._loadTranslations();

        /**
         * Загрузка конфигурационного файла
         */
        this._loadConfig();

        /**
         * Подключение файла стилей
         */
        if (this.config.mode.addStyleFile) {
            this._loadStyle();
        }

        /**
         * Рендеринг шаблона
         */
        if (this.config.mode.renderTemplate) {
            setTimeout(() => {
                this._renderTemplate(this._templateArg);
            }, 100); // Небольшая задержка, чтобы данные конфига успели обновиться
        }

        /**
         * Вызываем доп. инициализацию после основной в экземпляре модуля
         */
        setTimeout(() => {
            this.afterInit();
            this.onInit();
        }, 100); // Небольшая задержка, чтобы данные конфига успели обновиться
    }

    /**
     * Получение элемента шаблона для страницы модулей
     * @returns {string} HTML код элемента шаблона
     */
    getControlTemplate() {
        // Шаблон элемента
        const accordionItem = `
        <div class='accordion-item SpecAR-UIKIT-accordion-item'>
            <h2 class='accordion-header SpecAR-UIKIT-accordion-header'>
                <button
                    class='accordion-button collapsed'
                    type='button'
                    data-bs-toggle='collapse'
                    data-bs-target='#{{moduleID}}-accordion-collapse'
                    aria-expanded='true'
                    aria-controls='{{moduleID}}-accordion-collapse'
                >
                    <img src="{{iconPath}}" alt="Icon {{moduleID}}"/>
                    <span>{{moduleName}}</span>
                </button>
            </h2>
            <div id='{{moduleID}}-accordion-collapse' class='accordion-collapse collapse' data-bs-parent='#panel-modulesContainer'>
                <div class='accordion-body SpecAR-UIKIT-accordion-body' id='{{moduleID}}_accordion-body'>
                    <div class='SpecAR-UIKIT-accordion-body__description'>
                        <svg class='SpecAR-UIKIT-accordion-body__description__icon' xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M9 18h6q.425 0 .713-.288T16 17q0-.425-.288-.713T15 16H9q-.425 0-.713.288T8 17q0 .425.288.713T9 18Zm0-4h6q.425 0 .713-.288T16 13q0-.425-.288-.713T15 12H9q-.425 0-.713.288T8 13q0 .425.288.713T9 14Zm-3 8q-.825 0-1.413-.588T4 20V4q0-.825.588-1.413T6 2h7.175q.4 0 .763.15t.637.425l4.85 4.85q.275.275.425.638t.15.762V20q0 .825-.588 1.413T18 22H6Zm7-14q0 .425.288.713T14 9h4l-5-5v4Z"/></svg>
                        <span class='SpecAR-UIKIT-accordion-body__text'>{{moduleDescriptionTitle}}</span>
                    </div>
                    <div>{{moduleDescription}}</div>

                    <div class='SpecAR-UIKIT-accordion-body__mode'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M8.6 16.6L4 12l4.6-4.6L10 8.85L6.85 12L10 15.15L8.6 16.6ZM5 17h2v1h10v-1h2v4q0 .825-.588 1.413T17 23H7q-.825 0-1.413-.588T5 21v-4ZM7 7H5V3q0-.825.588-1.413T7 1h10q.825 0 1.413.588T19 3v4h-2V6H7v1Zm8.4 9.6L14 15.15L17.15 12L14 8.85l1.4-1.45L20 12l-4.6 4.6Z"/></svg>
                        <span class='SpecAR-UIKIT-accordion-body__mode__text'>{{moduleModeTitle}} {{moduleMode}}</span>
                    </div>
                    
                    <div class='SpecAR-UIKIT-accordion-body__version'>
                        <svg class='SpecAR-UIKIT-accordion-body__version__icon' xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17q.425 0 .713-.288T13 16v-4q0-.425-.288-.713T12 11q-.425 0-.713.288T11 12v4q0 .425.288.713T12 17Zm0-8q.425 0 .713-.288T13 8q0-.425-.288-.713T12 7q-.425 0-.713.288T11 8q0 .425.288.713T12 9Zm0 13q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Z"/></svg>
                        <span class='SpecAR-UIKIT-accordion-body__version__text'>{{moduleVersionTitle}} {{moduleVersion}}</span>
                    </div>
                </div>
            </div>
        </div>
        `;
        // Рендерим через nunjucs
        const njHtml = SpecAR.nunjucks.renderString(accordionItem, {
            moduleID: this.moduleID,
            moduleName: this.moduleName,
            iconPath: this._iconPath,
            moduleDescriptionTitle: SpecAR.Translator.translate('PMODULE_DESCRIPTION_TITLE'),
            moduleDescription: this.moduleDescription,
            moduleVersionTitle: SpecAR.Translator.translate('PMODULE_VERSION_TITLE'),
            moduleModeTitle: SpecAR.Translator.translate('PMODULE_MODE_TITLE'),
            moduleVersion: this.moduleVersion,
            moduleMode: this.config.mode.title,
        });

        // Создаем DOMParser для преобразования строки HTML в элемент
        const parser = new DOMParser();

        // Преобразование строки HTML в элемент
        const parsedHtml = parser.parseFromString(njHtml, 'text/html');

        // Извлечение элемента из разобранного HTML
        const accordionElement = parsedHtml.documentElement;
        const accordionElementBody = accordionElement.querySelector(`#${this.moduleID}_accordion-body`);

        try {
            const controlsModule = this.moduleControls();
            if (controlsModule) {
                accordionElementBody.insertAdjacentHTML('beforeend', controlsModule);
            }
        } catch (error) {
            SpecAR.logger.error({ title: 'BaseModule', message: `Load module controls error ${error}` });
        }

        return accordionElement.outerHTML;
    }

    /**
     * Загрузка конфигурационного файла модуля
     */
    async _loadConfig() {
        //Пробуем загрузить конфигурационный файл
        try {
            const configData = await SpecAR.fs.promises.readFile(this._configFilePath, 'utf8');

            // Переобразуем в JS объект
            const configObj = JSON.parse(configData);

            // Присваем данные полю
            this.config = configObj;
        } catch (err) {
            // Создаем новый конфигурационный файл
            SpecAR.fs.writeFile(this._configFilePath, JSON.stringify(this.config), err => {
                if (err)
                    SpecAR.logger.error({
                        title: this.moduleID,
                        message: err,
                    });
            });
        }
    }
    /**
     * Обновление конфигурационного файла после изменений
     */
    async updateConfig() {
        // Если обратный отсчет уже запущен, игнорируем действия
        if (this._countdown) {
            return;
        }

        // Создаем новый таймер и записываем изменения в файл по его истечению
        this._countdown = setTimeout(() => {
            // Записываем изменения в файл
            SpecAR.fs.writeFile(this._configFilePath, JSON.stringify(this.config), err => {
                if (err)
                    throw SpecAR.logger.error({
                        title: this.moduleID,
                        message: err,
                    });
            });
            // Сбрасываем таймер
            this._countdown = null;
        }, this._configUpdateTimer);
    }
    /**
     * Рендеринг шаблона модуля
     */
    async _renderTemplate() {
        const templatePath = this._templatePath;
        const container = this._widgetContainer;

        // Рендерим шаблон
        try {
            const template = await SpecAR.nunjucks.render(templatePath, {
                ...this._defaultTemplateArg,
                containerID: this.moduleID,
            });

            const { x: orientationX, y: orientationY } = this.config.orientation;
            const { x, y } = this.config.position;
            const { w, h } = this.config.size;

            // Создаем div под данный модуль
            const templateContainer = await document.createElement('div');
            templateContainer.id = this.moduleID;
            templateContainer.innerHTML = template;

            // Меняем его положение и размер
            templateContainer.style = `
            position: absolute;
            ${orientationX}: ${x}px;
            ${orientationY}: ${y}px;
            width: ${w}px;
            height: ${h}px;
        `;

            // Добавляем шаблон в контейнер
            await container.appendChild(templateContainer);
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: `Error rendering the template: ${error}` });
        }
    }

    /**
     * Ререндеринг шаблона с новыми аргументами
     * @param {object} data Аргументы для шаблона
     */
    async reloadTemplate(data = {}) {
        try {
            const element = document.getElementById(this.moduleID);
            const template = SpecAR.nunjucks.render(this._templatePath, {
                ...this._defaultTemplateArg,
                containerID: this.moduleID,
                data: { ...data },
            });

            // Временный элемент для хранения нового содержимого.
            const tempElement = document.createElement('div');
            tempElement.innerHTML = template;

            // Добавление тех же классов и идентификатора, что и у контейнера.
            if (element.classList.length != 0) {
                tempElement.classList = element.classList;
            }
            tempElement.id = element.id;
            for (let i = 0; i < element.style.length; i++) {
                const styleProperty = element.style[i];
                tempElement.style[styleProperty] = element.style[styleProperty];
            }

            // Сравнение и обновление только изменившихся элементов.
            SpecAR.morphdom(element, tempElement);
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: `Error reload the template: ${error}` });
        }
    }
    /**
     * Получение перевода по ключу из словаря модуля
     * @param {sting} key Ключ к словарю модуля без префикса
     * @returns Строка с переводом
     */
    getModuleTranslate(key, arg) {
        if (!key) {
            SpecAR.logger.error({ title: this.moduleID, message: 'Dictionary key not passed' });
            return undefined;
        }
        return SpecAR.Translator.translate(`${this.config.translationPrefix}_${key}`, arg);
    }

    /**
     * Подключение стилей модуля
     */
    async _loadStyle() {
        // Создаем элементы ссылки
        const link = document.createElement('link');

        // Добавляем стандартные атрибуты
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = SpecAR.path.join(this._direction, 'style.css');

        // Подключаем стиль к странице
        document.head.appendChild(link);
    }

    /**
     * Загрузка и добавление словарей модуля в уже существующие словари приложения
     */
    async _loadTranslations() {
        // Поиск словарей в папке translations
        const dictionaries = await SpecAR.fs.promises.readdir(SpecAR.path.join(this._direction, 'translations'), {
            withFileTypes: true,
        });

        await Promise.all(
            dictionaries.map(async dictionary => {
                // Пропускаем все файлы, отличные от json
                if (!dictionary.isFile() || !dictionary.name.endsWith('.json')) {
                    return;
                }

                // Полный путь до словаря
                const dictionaryPath = SpecAR.path.join(this._direction, 'translations', dictionary.name);
                // Обрезаем код страны
                const languageCode = dictionary.name.slice(0, -5);

                // Загружаем словарь
                try {
                    // Считываем данные словаря из .json
                    const dictionaryData = await SpecAR.fs.promises.readFile(dictionaryPath, 'utf8');
                    // Конвертируем данные json в объект JS
                    const objDictionary = JSON.parse(dictionaryData);
                    // Расширяем имеющуюся языковую базу данных
                    SpecAR.Translator.dictionaryExtension(languageCode, objDictionary);
                } catch (error) {
                    SpecAR.logger.error({
                        title: this.moduleID,
                        message: `Error loading dictionary for ${languageCode}: ${error}`,
                    });
                }
            })
        );
    }

    /**
     * Локализированное название модуля
     */
    get moduleName() {
        return SpecAR.Translator.translate(`${this.config.translationPrefix}_NAME`);
    }

    /**
     * Локализированное описание модуля
     */
    get moduleDescription() {
        return SpecAR.Translator.translate(`${this.config.translationPrefix}_DESCRIPTION`);
    }

    /**
     * ID Модуля в виде строки
     */
    get moduleID() {
        return this.config.id;
    }

    /**
     * Версия модуля в виде строки
     */
    get moduleVersion() {
        return this.config.version;
    }

    /**
     * Хук доп. иницизалиации перед основной
     */
    async beforeInit() {}

    /**
     * Хук доп. иницизалиации после основной
     */
    async afterInit() {}
    /**
     * Хук доп. иницизалиации после все инициализаций
     */
    async onInit() {}

    /**
     * Получение DOM элементов управления модулем
     */
    moduleControls() {}

    /**
     * Обновление элементов управления модуля
     */
    updateModuleControls() {}
}

/**
 * Класс-шаблон для приложений (App)
 */
class BaseApp {
    /**
     * Конструктор класса
     * @param {path} direction Путь к папке приложения
     */
    constructor(direction) {
        this._direction = direction;
        this._iconPath = SpecAR.path.join(direction, 'icon.png');
        this._templatePath = SpecAR.path.join(direction, 'template.html');
        this._defaultTemplateArg = {
            translator: (key, replacements) => SpecAR.Translator.translate(key, replacements),
            SpecAR: SpecAR,
        };
    }

    /**
     * Инициализация приложения
     */
    init() {
        /**
         * Вызываем доп. инициализацию перед основной в экземпляре приложения
         */
        this.beforeInit();

        /**
         * Загрузка словарей приложения
         */
        this._loadTranslations();

        /**
         * Подключение стилей
         */
        this._loadStyle();

        /**
         * Вызываем доп. инициализацию после основной в экземпляре приложения
         */
        setTimeout(() => {
            this.afterInit();
        }, 100); // Небольшая задержка, чтобы данные конфига успели обновиться
    }

    /**
     * Подключение стилей модуля
     */
    async _loadStyle() {
        // Создаем элементы ссылки
        const link = document.createElement('link');

        // Добавляем стандартные атрибуты
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = SpecAR.path.join(this._direction, 'style.css');

        // Подключаем стиль к странице
        document.head.appendChild(link);
    }
    /**
     * Получение шаблона приложения в виде
     * * @returns {string} Код HTML шаблона
     */
    async getHTMLTemplate() {
        const templatePath = this._templatePath;

        // Рендерим шаблон
        try {
            const template = await SpecAR.nunjucks.render(templatePath, {
                ...this._defaultTemplateArg,
                ...this._renderTemplateArg,
                appID: this.appID,
            });

            // Возвращаем шаблон в контейнере
            return template;
        } catch (error) {
            SpecAR.logger.error({ title: this.appID, message: `Error rendering the template: ${error}` });
        }
    }

    /**
     * Метод выхода из приложения
     */
    appExit() {
        this.onExit();
    }

    /**
     * Ререндеринг шаблона с новыми аргументами
     * @param {object} data Аргументы для шаблона
     */
    async reloadTemplate(data = {}) {
        try {
            const element = document.getElementById(this.appID);
            const template = SpecAR.nunjucks.render(this._templatePath, {
                ...this._defaultTemplateArg,
                ...this._renderTemplateArg,
                appID: this.appID,
                data: { ...data },
            });

            // Временный элемент для хранения нового содержимого.
            const tempElement = document.createElement('div');
            tempElement.innerHTML = template;

            // Добавление тех же классов и идентификатора, что и у контейнера.
            if (element.classList.length != 0) {
                tempElement.classList = element.classList;
            }
            tempElement.id = element.id;

            // Сравнение и обновление только изменившихся элементов.
            SpecAR.morphdom(element, tempElement);
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: `Error reload the template: ${error}` });
        }
    }

    /**
     * Загрузка и добавление словарей модуля в уже существующие словари приложения
     */
    async _loadTranslations() {
        // Поиск словарей в папке translations
        const dictionaries = await SpecAR.fs.promises.readdir(SpecAR.path.join(this._direction, 'translations'), {
            withFileTypes: true,
        });

        await Promise.all(
            dictionaries.map(async dictionary => {
                // Пропускаем все файлы, отличные от json
                if (!dictionary.isFile() || !dictionary.name.endsWith('.json')) {
                    return;
                }

                // Полный путь до словаря
                const dictionaryPath = SpecAR.path.join(this._direction, 'translations', dictionary.name);
                // Обрезаем код страны
                const languageCode = dictionary.name.slice(0, -5);

                // Загружаем словарь
                try {
                    // Считываем данные словаря из .json
                    const dictionaryData = await SpecAR.fs.promises.readFile(dictionaryPath, 'utf8');
                    // Конвертируем данные json в объект JS
                    const objDictionary = JSON.parse(dictionaryData);
                    // Расширяем имеющуюся языковую базу данных
                    SpecAR.Translator.dictionaryExtension(languageCode, objDictionary);
                } catch (error) {
                    SpecAR.logger.error({
                        title: this.appID,
                        message: `Error loading dictionary for ${languageCode}: ${error}`,
                    });
                }
            })
        );
    }

    /**
     * ID приложения в виде строки
     */
    get appID() {
        return this.config.id;
    }

    /**
     * ID приложения в виде строки
     */
    get appTitle() {
        return SpecAR.Translator.translate(`${this.config.translationPrefix}_NAME`);
    }

    /**
     * Версия приложения в виде строки
     */
    get appVersion() {
        return this.config.version;
    }

    /**
     * Функция события при клике на приложение - переход на новый маршрут и открытие прилоежния по ID
     */
    get onClickAction() {
        return `SpecAR.Navigation.changeRoute('APPLICATION', '${this.appID}')`;
    }

    /**
     * Версия приложения в виде строки
     */
    get appIcon() {
        return this._iconPath;
    }
    /**
     * Хук доп. иницизалиации перед основной
     */
    async beforeInit() {}

    /**
     * Хук доп. иницизалиации после основной
     */
    async afterInit() {}
    /**
     * Хук рендеринга
     */
    async onRender() {}
    /**
     * Хук выхода из приложения
     */
    async onExit() {}
}
/**
 * Класс-шаблон для приложений (App)
 */
class BaseModuleApp extends BaseModule {
    /**
     * Конструктор класса
     * @param {path} direction Путь к папке приложения
     */
    constructor(direction) {
        super(direction);
    }

    /**
     * Получение шаблона приложения в виде
     */
    async getHTMLTemplate() {
        // Рендерим шаблон
        try {
            const template = await SpecAR.nunjucks.render(this._templatePath, {
                ...this._defaultTemplateArg,
                ...this._renderTemplateArg,
                appID: this.appID,
            });

            // Возвращаем шаблон
            return template;
        } catch (error) {
            SpecAR.logger.error({ title: this.appID, message: `Error rendering the template: ${error}` });
        }
    }

    /**
     * Метод выхода из приложения
     */
    appExit() {
        this.onExit();
    }

    /**
     * Ререндеринг шаблона с новыми аргументами
     * @param {object} data Аргументы для шаблона
     */
    async reloadTemplate(data = {}) {
        try {
            const element = document.getElementById(this.appID);
            const template = SpecAR.nunjucks.render(this._templatePath, {
                ...this._defaultTemplateArg,
                ...this._renderTemplateArg,
                appID: this.appID,
                data: { ...data },
            });

            // Временный элемент для хранения нового содержимого.
            const tempElement = document.createElement('div');
            tempElement.innerHTML = template;

            // Добавление тех же классов и идентификатора, что и у контейнера.
            if (element.classList.length != 0) {
                tempElement.classList = element.classList;
            }
            tempElement.id = element.id;

            // Сравнение и обновление только изменившихся элементов.
            SpecAR.morphdom(element, tempElement);
        } catch (error) {
            SpecAR.logger.error({ title: this.moduleID, message: `Error reload the template: ${error}` });
        }
    }

    /**
     * Загрузка и добавление словарей модуля в уже существующие словари приложения
     */
    async _loadTranslations() {
        // Поиск словарей в папке translations
        const dictionaries = await SpecAR.fs.promises.readdir(SpecAR.path.join(this._direction, 'translations'), {
            withFileTypes: true,
        });

        await Promise.all(
            dictionaries.map(async dictionary => {
                // Пропускаем все файлы, отличные от json
                if (!dictionary.isFile() || !dictionary.name.endsWith('.json')) {
                    return;
                }

                // Полный путь до словаря
                const dictionaryPath = SpecAR.path.join(this._direction, 'translations', dictionary.name);
                // Обрезаем код страны
                const languageCode = dictionary.name.slice(0, -5);

                // Загружаем словарь
                try {
                    // Считываем данные словаря из .json
                    const dictionaryData = await SpecAR.fs.promises.readFile(dictionaryPath, 'utf8');
                    // Конвертируем данные json в объект JS
                    const objDictionary = JSON.parse(dictionaryData);
                    // Расширяем имеющуюся языковую базу данных
                    SpecAR.Translator.dictionaryExtension(languageCode, objDictionary);
                } catch (error) {
                    SpecAR.logger.error({
                        title: this.appID,
                        message: `Error loading dictionary for ${languageCode}: ${error}`,
                    });
                }
            })
        );
    }

    /**
     * Добавление в общий список приложений
     */
    async onInit() {
        await SpecAR.Navigation.pageList['APPLICATION'].addNewApplication(this);
    }
    /**
     * ID приложения в виде строки
     */
    get appID() {
        return this.config.id;
    }

    /**
     * ID приложения в виде строки
     */
    get appTitle() {
        return SpecAR.Translator.translate(`${this.config.translationPrefix}_NAME`);
    }

    /**
     * Версия приложения в виде строки
     */
    get appVersion() {
        return this.config.version;
    }

    /**
     * Функция события при клике на приложение - переход на новый маршрут и открытие прилоежния по ID
     */
    get onClickAction() {
        return `SpecAR.Navigation.changeRoute('APPLICATION', '${this.appID}')`;
    }

    /**
     * Версия приложения в виде строки
     */
    get appIcon() {
        return this._iconPath;
    }
    /**
     * Хук рендеринга
     */
    async onRender() {}
    /**
     * Хук выхода из приложения
     */
    async onExit() {}
}

/**
 * Класс-шаблон для панелей настроек
 */
class BasePanel {
    /**
     * Конструктор класса
     * @param {path} direction Путь к папке приложения
     */
    constructor(direction) {
        this._direction = direction;
        this._templateArg;
    }
    /**
     * Получение HTML кода шаблона
     * *@returns {string} HTML код отрендеренного шаблона
     */
    getHTMLTemplate() {
        const templatePath = SpecAR.path.join(this._direction, './template.html');
        const html = SpecAR.nunjucks.render(templatePath, {
            ...this._templateArg,
            getKeys: object => Object.keys(object),
            translator: (key, replacements) => SpecAR.Translator.translate(key, replacements),
            SpecAR: SpecAR,
        });
        return html;
    }
    /**
     * Добавление слушателей
     */
    attachEventListeners() {}

    /**
     * Хук, вызываемый после рендера панели
     */
    onRender() {}
}

module.exports = { BaseModule, BaseApp, BasePanel, BaseModuleApp };

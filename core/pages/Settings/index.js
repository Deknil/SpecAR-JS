/**
 * Класс Page отвечает за представление и функциональность настройки страницы.
 */
class Page {
    constructor() {
        this.BASE_PANELS = this.initBasePanels();

        this._templatePath = SpecAR.path.join(__dirname, './template.html');
        this._pageContainer = document.getElementById('pages-container');

        this.panelList = {};

        this.subRoute = 'pMain';

        this.initPanels();
    }

    /**
     * Инициализирует основные панели.
     * @returns {object} Объект с базовыми панелями.
     */
    initBasePanels() {
        return {
            pMain: this.createBasePanel('home-smile-2-fill', 'SETTINGS_PMAIN', 'pMain'),
            pProfile: this.createBasePanel('round-supervised-user-circle', 'SETTINGS_PROFILE', 'pProfile'),
            pModule: this.createBasePanel('widgets-rounded', 'SETTINGS_PMODULE', 'pModule'),
            pNotify: this.createBasePanel('bell', 'SETTINGS_PNOTIFY', 'pNotify'),
            pAbout: this.createBasePanel('info-fill', 'SETTINGS_PABOUT', 'pAbout'),
        };
    }

    /**
     * Создает объект базовой панели.
     * @param {string} icon - Иконка панели.
     * @param {string} translationKey - Ключ перевода заголовка панели.
     * @param {string} panel - Идентификатор панели.
     * @returns {object} Объект базовой панели.
     */
    createBasePanel(icon, translationKey, panel) {
        return {
            icon: SpecAR.tools.iconParser(icon),
            title: SpecAR.Translator.translate(translationKey),
            dataTranslate: translationKey,
            panel,
            action: `(()=>{SpecAR.Navigation.pageList.SETTINGS.changePanel("${panel}")})()`,
        };
    }

    /**
     * Инициализация панелей.
     */
    initPanels() {
        for (const id of Object.keys(this.BASE_PANELS)) {
            const { panel } = this.BASE_PANELS[id];
            const panelPath = SpecAR.getPath(`./core/pages/Settings/panels/${panel}/index.js`);

            try {
                const panelJs = require(panelPath);
                const panelInstance = new panelJs.Panel();
                this.panelList[id] = panelInstance;
            } catch (err) {
                SpecAR.logger.error({ title: 'SettingsPage', message: `Error init panels: ${err}` });
            }
        }
    }

    /**
     * Изменение текущей панели.
     * @param {string} panelID - Идентификатор панели.
     */
    changePanel(panelID) {
        if (panelID === this.subRoute) return;

        const contentContainer = document.getElementById('settings_body__content');
        contentContainer.innerHTML = '';

        contentContainer.innerHTML = this.getPanelContent(panelID);
        this.subRoute = panelID;
        this.updateNavigationButtons();

        this.panelList[panelID].onRender();
    }

    /**
     * Обновление состояния кнопок.
     */
    updateNavigationButtons() {
        const container = document.getElementById('settings_body__navigation__list');
        const buttons = container.querySelectorAll('.settings_body__navigation__list__item');
        buttons.forEach(button => {
            const buttonPanelID = button.dataset.panelId;
            button.classList.toggle('active', buttonPanelID === this.subRoute);
        });
    }
    /**
     * Возвращает содержимое панели.
     * @param {string} panelID - Идентификатор панели.
     * @returns {string} HTML-шаблон содержимого панели.
     */
    getPanelContent(panelID) {
        return this.panelList[panelID].getHTMLTemplate();
    }
    /**
     * Обновление заголовков в BASE_PANELS на основе текущей локали.
     */
    updateBasePanels() {
        for (let id in this.BASE_PANELS) {
            const pnl = this.BASE_PANELS[id];
            pnl.title = SpecAR.Translator.translate(pnl.dataTranslate);
        }
    }

    /**
     * Получение отрендеренного шаблона
     * @returns {string} Отрендеренные шаблон
     */
    async getRenderedTemplate() {
        const iconData = await Promise.all(Object.keys(this.BASE_PANELS).map(key => this.BASE_PANELS[key].icon));

        this.updateBasePanels();

        const navigationList = Object.keys(this.BASE_PANELS).map((key, index) => {
            const panel = this.BASE_PANELS[key];
            return {
                ...panel,
                icon: iconData[index],
            };
        });

        const { activeProfile, profileList } = SpecAR.Profile;
        const { avatarPath, profileName } = activeProfile || profileList.Guest;

        const html = SpecAR.nunjucks.render(this._templatePath, {
            profileImg: avatarPath,
            profileName,
            profileList: Object.keys(profileList),
            navigationList,
            translator: (key, replacements) => SpecAR.Translator.translate(key, replacements),
            content: this.getPanelContent(this.subRoute),
            SpecAR,
        });

        return html;
    }

    /**
     * Обновление всей страницы настроек
     */
    async updateRouteTemplate() {
        // Получаем отрендеренные шаблон
        const template = await this.getRenderedTemplate();

        // Временный элемент для хранения нового содержимого.
        const tempElement = document.createElement('div');
        tempElement.innerHTML = template;
        tempElement.classList = this._pageContainer.classList;
        tempElement.id = this._pageContainer.id;

        // Сравнение и обновление только изменившихся элементов.
        SpecAR.morphdom(this._pageContainer, tempElement);

        // Обновляем кнопки
        this.updateNavigationButtons();
    }
    /**
     * Перерисовка шаблона панелей.
     */
    async updateSubRouteTemplate() {
        const panelHtml = this.getPanelContent(this.subRoute);
        const container = document.getElementById('settings_body__content');

        // Временный элемент для хранения нового содержимого.
        const tempElement = document.createElement('div');
        tempElement.innerHTML = panelHtml;
        tempElement.classList = container.classList;
        tempElement.id = container.classList;

        // Сравнениваем и обновлением только изменившиеся элементы.
        SpecAR.morphdom(container, tempElement);
    }

    /**
     * Асинхронный рендеринг панелей.
     * @param {string} panelID - Идентификатор панели.
     */
    async render(panelID) {
        const template = await this.getRenderedTemplate();

        this._pageContainer.innerHTML = template;

        // Вызываем хуки
        this.panelList[this.subRoute].onRender();

        // Если задан аргумент с нужной панелью - меняем ее
        if (panelID) this.changePanel(panelID);

        // Обновляем кнопки
        this.updateNavigationButtons();
    }
}

module.exports = { Page };

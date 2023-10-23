class Page {
    constructor() {
        this._pageContainer = document.getElementById('fullscreen-container');

        this.init();

        this._appList = {};
        this._activeApp;
    }

    /**
     * Обновление API
     */
    async updateAPI() {
        SpecAR.appList = this._appList;
    }

    /**
     * Загрузка и подключение приложений
     */
    async _loadApps() {
        // Ищем все доступные приложения
        const appPath = SpecAR.getPath('core/pages/Application/apps');
        const appDirs = await SpecAR.fs.promises.readdir(appPath, { withFileTypes: true });

        // Проходимся по найденному
        for (const dir of appDirs) {
            // Проверяем, что это директория
            if (dir.isDirectory()) {
                // Формируем путь до главного файла
                const appJs = SpecAR.path.join(appPath, dir.name, 'app.js');
                try {
                    /* Импорт и создание экземпляра */
                    const app = await require(appJs);
                    const appInstance = await new app.App();

                    await appInstance.init();
                    /* Добавление экземпляра в список модулей */
                    this._appList[appInstance.appID] = appInstance;
                } catch (err) {
                    SpecAR.logger.error({
                        title: 'Application Loader',
                        message: `Error in app "${dir.name}": ${err.message}`,
                    });
                }
            }
        }
    }

    /**
     * Добавление нового приложения в общий список
     * @param {App} app Новое приложение
     */
    async addNewApplication(app) {
        this._appList[app.appID] = app;
        SpecAR.appList[app.appID] = app;
    }

    async init() {
        // Загружаем приложения
        await this._loadApps();

        // Обновляем API
        this.updateAPI();

        // Слушаем измнение маршрута и выключаем приложение, если он изменен
        window.addEventListener('onRouteChanged', () => {
            if (!SpecAR.Navigation.isCurrentRoute('APPLICATION') && this._pageContainer.style.display != 'none') {
                this._pageContainer.style.display = 'none';
                if (this._activeApp) {
                    this._activeApp.appExit();
                    this._activeApp = null;
                }
            }
        });
    }
    async render(subRoute) {
        // Проверяем наличие такого приложение
        if (!subRoute && !this._appList[subRoute]) {
            return;
        }

        // Находим приложение
        const app = this._appList[subRoute];

        // Устанавливаем в качестве активного
        this._activeApp = app;
        this.subRoute = subRoute;

        // Получаем шаблон
        const appTemplate = await app.getHTMLTemplate();

        // Рендерим приложение
        this._pageContainer.innerHTML = appTemplate;
        this._pageContainer.style.display = 'flex';

        app.onRender();
    }
}

module.exports = { Page };

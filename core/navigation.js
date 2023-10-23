/* 
    Главный класс навигации 
*/
class Navigation {
    /**
     * Получение текущего маршрута
     *  * @returns {string} Название текущего маршрута
     */
    static getCurrentRoute = () => this._route;

    /**
     * Базовые маршруты
     */
    static BASE_ROUTE = {
        HOME: {
            id: 'HOME',
            routeName: 'Home',
            path: '',
        }, // Пустое окно
        APPLICATION_LIST: {
            id: 'APPLICATION_LIST',
            routeName: 'Application List',
            path: 'ApplicationList',
        }, // Окно выбора приложений
        SETTINGS: {
            id: 'SETTINGS',
            routeName: 'Settings List',
            path: 'Settings',
        }, // Окно настроек
        APPLICATION: {
            id: 'APPLICATION',
            routeName: 'Application',
            path: 'Application',
        }, // Полноэкранное приложение
    };

    /**
     * Кнопки навигации
     */
    static NAVIGATION_BUTTONS = [
        {
            icon: 'home-line',
            route: this.BASE_ROUTE.HOME,
            path: '',
        },
        {
            icon: 'applications',
            route: this.BASE_ROUTE.APPLICATION_LIST,
            path: './ApplicationList',
        },
        {
            icon: 'settings-future',
            route: this.BASE_ROUTE.SETTINGS,
            path: './Settings',
        },
    ];

    /* 
    Кэширование контейнеров
*/
    static pagesContainer = document.getElementById('pages-container');
    static fsContainer = document.getElementById('fullscreen-container');
    static navContainer = document.getElementById('navigation-container');

    /**
     * Обновление API навигации
     */
    static _updateAPI() {
        SpecAR.Navigation = {
            pageList: this._pageList,
            isCurrentRoute: (page, subRoute) => this.isCurrentRoute(page, subRoute),
            changeRoute: (newRoute, subRoute) => this.changeRoute(newRoute, subRoute),
        };
    }

    /**
     * Проверяет, является ли переданный маршрут и дополнительный маршрут текущими.
     * * @param {string} page - ID страницы, который нужно проверить на совпадение с текущим маршрутом.
     * * @param {string} subRoute - ID дополнительного маршрута внутри страницы, который нужно проверить на совпадение с текущим подмаршрутом (необязательный).
     * * @returns {boolean} - Возвращает true, если переданный маршрут и дополнительный маршрут (если указан) совпадают с текущими, иначе false.
     */
    static isCurrentRoute(page, subRoute = '') {
        if (this._route.id !== page) {
            return false;
        }
        return subRoute === '' || subRoute === this._pageList[this._route.id].subRoute;
    }

    /**
     * Изменение текущего маршрута на заданный
     *  * @param {ID} - Название нового маршрута, согласно констате this.BASE_ROUTE
     *  * @param {*} - Аргументы для нового маршрута
     */
    static changeRoute(newRoute, subRoute = '') {
        // Проверяем, пришел ид или объект маршрута
        if (!this.BASE_ROUTE[newRoute] || !newRoute) {
            SpecAR.logger.error({ title: 'Navigation', message: 'The route or route ID is specified incorrectly' });
            return;
        }
        newRoute = this.BASE_ROUTE[newRoute];

        // Игнорируем, если маршрут не поменялсяc
        if (this.isCurrentRoute(newRoute.id, subRoute)) {
            return;
        }

        try {
            // Устанавливаем новый маршрут
            this._route = newRoute;

            // Загружаем новую страницу
            this.loadPage(newRoute, subRoute);

            // Обновляем кнопки
            this.updateNavButtons();

            // Хук смены маршрута
            window.dispatchEvent(new Event('onRouteChanged'));
        } catch (error) {
            SpecAR.logger.error({ title: 'Navigation', message: 'The route or route ID is specified incorrectly' });
        }
    }

    /**
     * Инициализация системы навигации
     */
    static async init() {
        /**
         * Поле, содержащее информацию о текущем маршруте
         */
        this._route = this.BASE_ROUTE.HOME;
        /**
         * Поле, содержащее экземпляры всех страниц
         */
        this._pageList = {};

        this.loadNavButtons();
        await this.initPages();
        this.loadPage(this._route);

        // Обновляем API
        this._updateAPI();
    }

    /**
     * Инициализация страниц и добавлени их в кэш
     */
    static initPages() {
        const startLoadTime = new Date().getTime();

        for (let id of Object.keys(this.BASE_ROUTE)) {
            // Объявляем объект маршрута
            const route = this.BASE_ROUTE[id];

            // Пропускаем домашнюю страницу
            if (!route.path) continue;

            const pagePath = SpecAR.getPath(`./core/pages/${route.path}/index.js`);

            try {
                // Пробуем загрузить скрипт страницы
                const pageJs = require(pagePath);

                // Создаем экземляр страницы
                const pageInstance = new pageJs.Page();

                // Добавляем страницу в кэш
                this._pageList[id] = pageInstance;
            } catch (err) {
                SpecAR.logger.error({ title: 'Navigation', message: `Failed init page: ${err}` });
            }
        }

        /**
         * Подведение итогов инициалищации маршрутов
         */
        const endLoadTime = new Date().getTime();
        const deltaTime = ((endLoadTime - startLoadTime) / 1000).toFixed(3);
        SpecAR.logger.info({
            title: 'Navigation',
            message: `Pages initialized and cached in ${deltaTime} seconds`,
        });
    }

    /**
     * Загрузка шаблона страницы текущего маршрута
     *  * @param {this.BASE_ROUTE} - Название маршрута, согласно констате this.BASE_ROUTE
     *  * @param {*} - Аргументы для маршрута
     */
    static loadPage(route, subRoute) {
        // Очищаем контейнеры
        this.pagesContainer.innerHTML = '';
        this.fsContainer.innerHTML = '';

        // Игнорируем домашнюю страницу (т.к. она пустая)
        if (route === this.BASE_ROUTE.HOME) return;

        try {
            // Пробуем отрендерить страницу
            this._pageList[route.id].render(subRoute);
        } catch (err) {
            SpecAR.logger.error({ title: 'Navigation', message: err });
        }
    }

    /**
     * Инициализация кнопок навигации
     */
    static async loadNavButtons() {
        // Подгружаем ассинхронно иконки
        const iconPromises = this.NAVIGATION_BUTTONS.map(async btn => {
            const icon = await SpecAR.tools.iconParser(btn.icon);
            return {
                ...btn,
                icon,
            };
        });
        const buttonsWithIcons = await Promise.all(iconPromises);

        buttonsWithIcons.map(async btn => {
            // Создание кнопки
            const button = document.createElement('button');
            button.classList.add('navigation-container__button');

            // Задаем каждой кнопке id маршрута
            button.dataset.routeId = btn.route.id;

            // Добавление иконки
            const icon = new DOMParser().parseFromString(btn.icon, 'image/svg+xml').documentElement;
            button.appendChild(icon);

            // Обработка нажатий
            button.addEventListener('click', () => {
                this.changeRoute(btn.route.id);
            });

            // Добавление кнопки в родительский контейнер
            this.navContainer.appendChild(button);
        });

        // Обновляем кнопки
        this.updateNavButtons();
    }

    /**
     * Обновление состояния кнопок
     */
    static updateNavButtons() {
        // Находим все кнопки
        const buttons = this.navContainer.querySelectorAll('.navigation-container__button');
        buttons.forEach(button => {
            // ID маршшрута кнопки
            const buttonRouteID = button.dataset.routeId;

            // Игнорируем кнопку "Домой" и добавляем класс 'active', если активна
            if (buttonRouteID !== this.BASE_ROUTE.HOME.id) {
                button.classList.toggle('active', buttonRouteID === this._route.id);
            }
        });
    }
}

module.exports = { Navigation };

class Notify {
    /**
     * Максимальное количество показываемых уведомлений за раз в контейнере
     */
    static _MAX_NOTIFY_COUNT = 4;

    /**
     * Время исчезновения уведомления, в мс (1 сек = 1000 мс)
     */
    static _NOTIFY_LIFETIME = 5000;

    /**
     * Время, через которое происходит запись уведомлений в файл, секунды
     */
    static _SAVE_NOTIFY_TIME = 15000;

    /**
     * Контейнер для уведомлений
     */
    static _NOTIFY_CONTAINER = document.getElementById('notify-container');

    /**
     * Иконки уведомлений
     */
    static _NOTIFY_ICONS = {
        error: SpecAR.tools.iconParser('notify_error'),
        success: SpecAR.tools.iconParser('notify_success'),
        warn: SpecAR.tools.iconParser('notify_warn'),
        info: SpecAR.tools.iconParser('notify_info'),
    };

    /**
     * Очередь уведомлений
     */
    static _notificationQueue = [];

    /**
     * Обновление API уведомлений
     */
    static _updateAPI() {
        SpecAR.Notify = {
            warn: text => {
                this._createNotification({ type: 'warn', message: text });
            },
            info: text => {
                this._createNotification({ type: 'info', message: text });
            },
            error: text => {
                this._createNotification({ type: 'error', message: text });
            },
            success: text => {
                this._createNotification({ type: 'success', message: text });
            },
            countNotify: this._notifyList.length,
            notifyList: this._notifyList,
            clearAllNotify: () => this.clearAllNotify(),
            deleteNotify: el => this.deleteNotify(el),
        };
    }

    /**
     * Кэширование иконок для уведомлений
     */
    static async cacheIcons() {
        // Получаем ключи объекта _NOTIFY_ICONS
        const iconKeys = Object.keys(this._NOTIFY_ICONS);

        // Загружаем иконки асинхронно и кэшируем их
        for (const key of iconKeys) {
            this._NOTIFY_ICONS[key] = await this._NOTIFY_ICONS[key];
        }
    }

    /**
     * Инициализация системы уведомлений
     */
    static async init() {
        const startTime = new Date().getTime();
        await SpecAR.logger.info({
            title: 'Notify',
            message: 'Initializing the notification system...',
        });

        // Кэшируем иконки
        await this.cacheIcons();

        // Таймер записи в базу данных уведомлений
        this._countdown = null;

        // Локальная перменная со всеми уведомлениями
        this._notifyList = [];

        // Путь до базы данных
        this._notifyFilePath = SpecAR.getPath('data/notifications.json');

        //Пробуем загрузить базу данных уведомлений
        try {
            const notifyData = await SpecAR.fs.promises.readFile(this._notifyFilePath, 'utf8');

            SpecAR.logger.info({
                title: 'Notify',
                message: 'Notification database found, loading...',
            });

            // Переобразуем в JS объект
            const dataObj = JSON.parse(notifyData);

            // Присваем данные полю
            this._notifyList = dataObj;
        } catch (err) {
            SpecAR.logger.info({
                title: 'Notify',
                message: 'Notification database not found',
            });

            // Проверяем наличие папки Data
            const dirData = SpecAR.getPath('data');
            SpecAR.fs.access(dirData, err => {
                if (err) {
                    // Создаем новую папку
                    SpecAR.fs.mkdirSync(dirData, { recursive: true });
                }
                return;
            });
        }

        // Обновляем API
        this._updateAPI();

        /**
         * Подведение итогов загрузки системы уведомлений
         */
        const endTime = new Date().getTime();
        const deltaTime = ((endTime - startTime) / 1000).toFixed(3);

        await SpecAR.logger.info({
            title: 'Notify',
            message: `The notification system is loaded for ${deltaTime} seconds`,
        });
    }

    /**
     * Воспроизводит звуковое уведомление.
     * * @param {string} soundName Название файла
     */
    static _playNotificationSound(soundName) {
        const notifyAudio = new Audio(SpecAR.getPath(`assets/audio/notification-${soundName}.mp3`));
        notifyAudio.volume = SpecAR.Config.getData.notifyVolume * 0.01;
        notifyAudio.play();
    }

    /**
     * Удаление всех уведомлений из базы данных
     */
    static async clearAllNotify() {
        // Игнорируем, если данных уже и так нет
        if (this._notifyList.length === 0) {
            return;
        }

        // Проигрываем звуковое уведомление
        this._playNotificationSound('clear');

        // Очищаем уведомления в локально
        this._notifyList = [];

        // Обновляем базу данных
        setTimeout(() => {
            this._updateNotifyDataBase();
        }, 300);
    }

    /**
     * Удаление данного уведомления из базы данных
     */
    static async deleteNotify(element) {
        // Проигрываем звуковое уведомление
        this._playNotificationSound('clear');

        // Получаем родителя
        const parent = element.parentNode;
        // Получаем id этого элемента
        const elementId = parent.dataset.notifyId;

        // Находим уведомление по ID в массиве и удаляем его
        const itemIndex = this._notifyList.findIndex(item => item.id === parseInt(elementId));
        if (itemIndex !== -1) {
            this._notifyList.splice(itemIndex, 1);
        }

        // Удаляем элемент из DOM
        parent.classList.add('notify-item-hide');
        parent.addEventListener('transitionend', () => {
            setTimeout(() => {
                parent.remove();

                // Обновляем базу данных
                this._updateNotifyDataBase();
            }, 300);
        });
    }

    /**
     * Обновление базы данных уведомлений
     */
    static _updateNotifyDataBase() {
        // Обновляем API
        this._updateAPI();

        // Ререндерим панель, если открыта вкладка "Настройки -> Уведомления"
        if (SpecAR.Navigation.isCurrentRoute('SETTINGS', 'pNotify')) {
            SpecAR.Navigation.pageList.SETTINGS.updateSubRouteTemplate();
        }

        // Вызываем хук
        window.dispatchEvent(new Event('onNotifyChanged'));

        // Если обратный отсчет уже запущен, игнорируем
        if (this._countdown) {
            return;
        }

        // Создаем новый таймер и обновляем базу данных
        this._countdown = setTimeout(() => {
            SpecAR.fs.writeFile(this._notifyFilePath, JSON.stringify(this._notifyList), err => {
                if (!this._notifyFilePath) {
                    throw SpecAR.logger.error({
                        title: 'Notify',
                        message: 'Notify file path is not defined',
                    });
                }

                if (err) {
                    throw SpecAR.logger.error({
                        title: 'Notify',
                        message: err,
                    });
                }
            });
            // Сбрасываем таймер
            this._countdown = null;
        }, this._SAVE_NOTIFY_TIME);
    }

    /**
     * Создание элемента уведомления
     * @param {string} type - тип уведомления (error, warn, success, info)
     * @param {string} message - текст уведомления
     * @returns {HTMLDivElement} контейнер уведомления
     */
    static _createNotificationElement(type, message) {
        // Создание контейнера уведомления
        const container = document.createElement('div');
        container.classList.add('notification-container');

        // Создание элемента уведомления и добавление классов
        const element = document.createElement('div');
        element.classList.add('notification', `notify-${type}`);

        // Добавление иконки уведомления
        const icon = new DOMParser().parseFromString(this._NOTIFY_ICONS[type], 'image/svg+xml').documentElement;
        element.appendChild(icon);

        // Добавление текста уведомления
        const text = document.createElement('span');
        text.innerHTML = message;
        element.appendChild(text);

        // Добавление элемента уведомления в контейнер
        container.appendChild(element);

        return container;
    }

    /**
     * Отображение уведомления с анимацией
     * @param {HTMLDivElement} notifyContainer - контейнер уведомления
     */
    static _handleNotifyDisplay(notifyContainer) {
        // Анимация появления уведомления
        setTimeout(() => {
            notifyContainer.classList.toggle('notify-show');
            this._handleNotifyRemoval(notifyContainer);
        }, 100);
    }

    /**
     * Удаление уведомления после определенного времени
     * @param {HTMLDivElement} notifyContainer - контейнер уведомления
     */
    static _handleNotifyRemoval(notifyContainer) {
        // Анимация удаления уведомления
        setTimeout(() => {
            notifyContainer.classList.toggle('notify-show');

            // Удаление уведомления после анимации
            if (notifyContainer.parentNode === this._NOTIFY_CONTAINER) {
                notifyContainer.addEventListener('transitionend', () => {
                    if (this._NOTIFY_CONTAINER.contains(notifyContainer)) {
                        this._NOTIFY_CONTAINER.removeChild(notifyContainer);
                        this._checkAndDisplayNextNotification();
                    }
                });
            }
        }, this._NOTIFY_LIFETIME);
    }

    /**
     * Проверка и отображение следующего уведомления из очереди
     */
    static _checkAndDisplayNextNotification() {
        const notifications = this._NOTIFY_CONTAINER.getElementsByClassName('notification');
        if (this._notificationQueue.length > 0 && notifications.length < this._MAX_NOTIFY_COUNT) {
            const nextNotification = this._notificationQueue.shift();
            this._createNotification(nextNotification);
        }
    }

    /**
     * Создание и рендеринг уведомления
     * @param {object} data объект с различными параметрами уведомлений {type - тип уведомления (error, warn, success, info), message - текст}
     */
    static _createNotification(data) {
        // Игнорируем, если ничего не передано
        if (!data) return;

        const notifications = this._NOTIFY_CONTAINER.getElementsByClassName('notification');
        // Проверяем переполненность контейнера
        if (notifications.length < this._MAX_NOTIFY_COUNT) {
            const { type, message } = data;

            // Создаем уведомлением
            const notifyContainer = this._createNotificationElement(type, message);

            // Отображаем уведомление
            this._NOTIFY_CONTAINER.appendChild(notifyContainer);
            this._handleNotifyDisplay(notifyContainer);

            // Проигрываем звуковое уведомления
            this._playNotificationSound(type);

            // Вносим в базу данных
            const timestamp = new Date().getTime();
            const id = this._notifyList.length + 1;
            this._notifyList.push({ ...data, time: timestamp, id: id });
            this._updateNotifyDataBase(data);
            SpecAR.logger.info({ title: `Notify-${type[0].toUpperCase()}${type.slice(1)}`, message: message });
        } else {
            // Добавляем в очередь
            this._notificationQueue.push(data);
        }
    }
}

module.exports = { Notify };

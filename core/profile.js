class Profile {
    /**
     * Время таймера, через которое происходит попытка определения пользователя, мс
     */
    static USER_DETECT_TIMER = 5000;

    /**
     * Обратный отчет времени бездействия пользователя, мс
     */
    static USER_IDLE_TIMEOUT = 600000;

    /**
     * ID таймера бездействия
     */
    static IDLE_TIMER_ID = null;

    /**
     * Индикатор добавления слушателей бездействия
     */
    static IDLE_EVENT_LISTENER_ADD = false;

    /**
     * Хук изменения конфига
     */
    static async _handleConfigChanged() {
        const profileID = this._activeProfile.id;
        try {
            // Путь до файла профиля
            const databaseFilePath = await SpecAR.path.join(this._profileDataBasePath, `${profileID}.json`);

            // Формируем JSON данные
            const jsonData = JSON.stringify(this._profileList[profileID], null, 2);

            // Записываем в базу данных
            await SpecAR.fs.promises.writeFile(databaseFilePath, jsonData, 'utf8');
        } catch (error) {
            SpecAR.Notify.error(SpecAR.Translator.translate('PPROFILE_CHANGED_ERROR'));
            SpecAR.logger.error({ title: 'Profile', message: `Error when changing the profile data: ${error}` });
        }
    }
    /**
     * Сброс таймера бездействия
     */
    static _resetTimerProfileIdle = () => {
        clearTimeout(this.IDLE_TIMER_ID);
        this.IDLE_TIMER_ID = setTimeout(this.onUserIdle, this.USER_IDLE_TIMEOUT);
    };

    /**
     * Событие при длительном бездействии пользователя - переключение на гостевой профиль
     */
    static onUserIdle = () => {
        this._changeActiveProfieByID('Guest');
        this.IDLE_TIMER_ID = null;
        this._removeListenerProfileIdle();
    };

    /**
     * Удаление слушателей бездействия пользователя
     */
    static _removeListenerProfileIdle = () => {
        if (this.IDLE_EVENT_LISTENER_ADD) {
            document.removeEventListener('keydown', this._resetTimerProfileIdle);
            document.removeEventListener('mousedown', this._resetTimerProfileIdle);
            this.IDLE_EVENT_LISTENER_ADD = false;
        }
    };

    /**
     * Автовыход из профиля в случае бездействия пользователя
     */
    static initProfileAutoExit() {
        // Если условие не выполняется, очищаем существующий таймер и выходим из функции
        if (!SpecAR.Config.getData.profileAutoExit || SpecAR.Profile.activeProfile.id === 'Guest') {
            this._removeListenerProfileIdle();
            if (this.IDLE_TIMER_ID) {
                clearTimeout(this.IDLE_TIMER_ID);
                this.IDLE_TIMER_ID = null;
            }
            return;
        }

        // Добавление новых обработчиков событий
        document.addEventListener('keydown', this._resetTimerProfileIdle);
        document.addEventListener('mousedown', this._resetTimerProfileIdle);

        this.IDLE_EVENT_LISTENER_ADD = true;

        // Сброс и запуск нового таймера
        this._resetTimerProfileIdle();
    }

    /**
     * Автоопределение пользовательского профиля
     */
    static async _detectUserInFrontMirror() {
        const access = SpecAR.util.promisify(SpecAR.fs.access);
        const mkdir = SpecAR.util.promisify(SpecAR.fs.mkdir);

        // Если функция отключена, открыто приложение, профиль уже выбран или моделей нет - игнорируем
        if (
            !SpecAR.Config.getData.profileAutoDetect ||
            SpecAR.Navigation.isCurrentRoute('APPLICATION') ||
            SpecAR.Profile.activeProfile.id !== 'Guest' ||
            this._faceModelList.length === 0
        ) {
            return;
        }

        // Запрос доступа к веб-камере
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });

            // Получение видео трека
            const videoTrack = stream.getVideoTracks()[0];

            // Создание объекта ImageCapture с использованием видео трека
            const imageCapture = new ImageCapture(videoTrack);

            // Получение изображения с веб-камеры
            const imageBitmap = await imageCapture.grabFrame();

            // Создание элемента canvas
            const canvas = document.createElement('canvas');
            canvas.width = 720;
            canvas.height = 1280;
            const context = canvas.getContext('2d');

            // Создаем временный холст для поворота видео
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageBitmap.height;
            tempCanvas.height = imageBitmap.width;
            const tempContext = tempCanvas.getContext('2d');

            // Поворачиваем видео на временном холсте
            tempContext.translate(tempCanvas.width, 0);
            tempContext.rotate(Math.PI / 2);
            await tempContext.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height);

            // Остановка работы веб-камеры
            stream.getTracks().forEach(track => track.stop());

            // Отражаем основной холст по горизонтали
            context.scale(-1, 1);

            // Рисуем повернутое видео с временного холста на основной холст
            context.drawImage(tempCanvas, -canvas.width, 0, canvas.width, canvas.height);
            // Преобразование canvas в blob-объект
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));

            // Создание файла и сохранение его в папку по пути
            const dirPath = SpecAR.getPath('temp/autodetect');

            // Проверяем есть ли временная папка и создаем ее при необходимости
            try {
                await access(dirPath);
            } catch (err) {
                await mkdir(dirPath, { recursive: true });
            }

            // формируем название для файла
            const now = new Date();
            const dateString = now
                .toISOString()
                .replace(/[^0-9]/g, '')
                .slice(0, 14);
            const fileName = `photo-autodetect-${dateString}.jpg`;
            const filePath = SpecAR.path.join(dirPath, fileName);

            await SpecAR.fs.promises.writeFile(filePath, Buffer.from(await blob.arrayBuffer()));

            // Запускаем Python-скрипт
            const pythonScriptPath = SpecAR.getPath('core/python/autoDetectProfile.py');

            // Пробуем узнать кто перед зеркалом
            try {
                const outProfileID = await SpecAR.execPythonScript(pythonScriptPath, filePath);
                const profileID = outProfileID.trim().replace(/\//g, '\\');

                // Меняем профиль на активный
                if (profileID !== '' && this._profileList[profileID]) {
                    this._changeActiveProfieByID(profileID);
                }
            } catch (error) {
                SpecAR.logger.error({ title: 'Profile', message: `execPythonScript error: ${error}` });
            }

            // Удаляем ненужные файлы
            SpecAR.fs.unlink(filePath, err => {
                if (err) {
                    SpecAR.logger.error({ title: 'Profile', message: `Error while deleting the file: ${err}` });
                }
            });
        } catch (err) {}
    }

    /**
     * Ререндеринг DOM элементов, относящихся к профилю
     */
    static async _reloadDOM() {
        if (SpecAR.Navigation.isCurrentRoute('SETTINGS')) {
            SpecAR.Navigation.pageList.SETTINGS.updateRouteTemplate();
        }
    }

    /**
     * Внесение изменений в базу данных
     * @param {string} profileID ID Профиля
     */
    static async _writeProfileChange(profileID) {
        try {
            // Путь до файла профиля
            const databaseFilePath = await SpecAR.path.join(this._profileDataBasePath, `${profileID}.json`);

            // Формируем JSON данные
            const jsonData = JSON.stringify(this._profileList[profileID], null, 2);

            // Записываем в базу данных
            await SpecAR.fs.promises.writeFile(databaseFilePath, jsonData, 'utf8');
            SpecAR.Notify.success(SpecAR.Translator.translate('PPROFILE_CHANGED_SUCCESSFUL'));
        } catch (error) {
            SpecAR.Notify.error(SpecAR.Translator.translate('PPROFILE_CHANGED_ERROR'));
            SpecAR.logger.error({ title: 'Profile', message: `Error when changing the profile data: ${error}` });
        }
    }

    /**
     * Обновление API конфига в глобальной переменной SpecAR
     */
    static _updateAPI() {
        SpecAR.Profile = {
            defaultProfile: this._defaultProfile,
            profileList: this._profileList,
            activeProfile: this._activeProfile,
            createProfile: () => {
                Swal.fire({
                    title: SpecAR.Translator.translate('PROFILE_CREATE_TITLE'),
                    html: `<div class="SpecAR-UIKIT-textEntry">
                            <span class="SpecAR-UIKIT-textEntry__title">${SpecAR.Translator.translate(
                                'PPROFILE_PROFILE_CONTROLS_PROFILENAME'
                            )}</span>
                            <input class="SpecAR-UIKIT-textEntry__input"
                                type="text" 
                                id="modal-creatingProfile-name"
                                placeholder="${SpecAR.Translator.translate('PPROFILE_PROFILE_CONTROLS_PROFILENAME_PLACEHOLDER')}"/>
                    </div>`,
                    showCancelButton: true,
                    cancelButtonText: SpecAR.Translator.translate('POPUP_СANCEL_BUTTON'),
                    confirmButtonText: SpecAR.Translator.translate('PROFILE_CREATE_CONFIRM'),
                    showLoaderOnConfirm: true,
                    preConfirm: () => {
                        return document.getElementById('modal-creatingProfile-name').value;
                    },
                    allowOutsideClick: () => !Swal.isLoading(),
                }).then(result => {
                    if (result.isConfirmed) {
                        if (result.value == '') {
                            SpecAR.Notify.error(SpecAR.Translator.translate('PROFILE_CREATE_NONAME'));
                            return;
                        }
                        this._createNewProfile(result.value);
                    }
                });
            },
            trainFaceProfileByID: profileID => this.trainFaceProfileByID(profileID),
            changeLocaleGuestProfile: () => this.changeLocaleGuestProfile(),
            changeProfileByID: profileID => this._changeActiveProfieByID(profileID),
            deleteProfileByID: profileID => this._deleteProfileByID(profileID),
            changeProfileNameByID: (profileID, name) => this.changeProfileNameByID(profileID, name),
            choosePhotoByID: profileID => this.choosePhotoByID(profileID),
            deletePhotoByID: profileID => this.deletePhotoByID(profileID),
            takePhotoByID: profileID => this.takePhotoByID(profileID),
            initProfileAutoExit: () => this.initProfileAutoExit(),
        };
    }

    /**
     * Обучения модели распознавания лица
     * @param {string} profileID ID профиля
     */
    static async trainFaceProfileByID(profileID) {
        // Если ничего не передано, или профиль не существует - игнорируем
        if (!profileID || !this._profileList[profileID]) {
            return;
        }

        // Проверяем наличие моделей
        if (this._profileList[profileID].faceModelPath != '' || this._profileList[profileID].faceModelPath) {
            const confirmResult = await Swal.fire({
                icon: 'warning',
                title: SpecAR.Translator.translate('POPUP_ARE_YOUR_SURE'),
                html: `<center>${SpecAR.Translator.translate('PROFILE_FACE_TRAIN_ALREADY')}</center>`,
                allowOutsideClick: false,
                showCancelButton: true,
                cancelButtonText: SpecAR.Translator.translate('POPUP_СANCEL_BUTTON'),
                confirmButtonText: SpecAR.Translator.translate('PROFILE_FACE_TRAIN_REWRITE'),
            });

            if (!confirmResult.isConfirmed) {
                return;
            }
        }
        Swal.fire({
            title: SpecAR.Translator.translate('PROFILE_FACE_TRAIN_TITLE'),
            html: `<center>${SpecAR.Translator.translate('PROFILE_FACE_TRAIN_BODY')}</center>`,
            timerProgressBar: true,
            allowOutsideClick: false,
            didOpen: async () => {
                Swal.showLoading();

                // Запускаем Python-скрипт
                const pythonScriptPath = SpecAR.getPath('core/python/profileTrainFace.py');

                const profileTransliterateName = SpecAR.tools.transliterate(this._profileList[profileID].profileName);
                const modelName = profileTransliterateName.replace(/[^\w]+/g, '').replace(/\b\w/g, l => l.toUpperCase());

                try {
                    const modelPath = await SpecAR.execPythonScript(
                        pythonScriptPath,
                        modelName,
                        this._profileList[profileID].id,
                        SpecAR.getPath('data/profiles/face_model')
                    );

                    const fixedModelPath = SpecAR.path.normalize(modelPath.trim().replace(/\//g, '\\'));

                    this._profileList[profileID].faceModelPath = fixedModelPath;
                    this._writeProfileChange(profileID);

                    // Обновляем DOM
                    this._reloadDOM();

                    this._faceModelList.push(fixedModelPath);
                } catch (error) {
                    Swal.close();
                    SpecAR.Notify.error(SpecAR.Translator.translate('PROFILE_FACE_TRAIN_ERROR'));
                    SpecAR.logger.error({ title: 'Profile', message: error });
                    return;
                }
                Swal.close();
            },
        });
    }
    /**
     * Получение и размещения фото с веб камеры в профиле
     * @param {string} profileID ID профиля
     */
    static async takePhotoByID(profileID) {
        // Если ничего не передано, или профиль не существует - игнорируем
        if (!profileID || !this._profileList[profileID]) {
            return;
        }

        // Запрос доступа к веб-камере
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
            },
        });

        // Создание элемента video
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.classList = 'webcam-video-flip-horizontal';

        Swal.fire({
            html: `<video src="" class="webcam-video-flip-horizontal" id="previewVideo" autoplay playsinline></video>`,
            confirmButtonText: SpecAR.Translator.translate('PPROFILE_MODAL_TAKE_PHOTO_BTN'),
            cancelButtonText: SpecAR.Translator.translate('POPUP_СANCEL_BUTTON'),
            showCancelButton: true,
            customClass: {
                container: 'swal2-fullscreen',
            },
            didOpen: () => {
                // Добавление видео из веб-камеры в модальное окно
                const previewVideo = document.getElementById('previewVideo');
                previewVideo.srcObject = stream;
            },
        }).then(async result => {
            if (result.isConfirmed) {
                const canvas = document.createElement('canvas');
                canvas.width = 720;
                canvas.height = 1280;
                const context = canvas.getContext('2d');

                // Создаем временный холст для поворота видео
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = videoElement.videoHeight;
                tempCanvas.height = videoElement.videoWidth;
                const tempContext = tempCanvas.getContext('2d');

                // Поворачиваем видео на временном холсте
                tempContext.translate(tempCanvas.width, 0);
                tempContext.rotate(Math.PI / 2);
                tempContext.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

                // Отражаем основной холст по горизонтали
                context.scale(-1, 1);

                // Рисуем повернутое видео с временного холста на основной холст
                context.drawImage(tempCanvas, -canvas.width, 0, canvas.width, canvas.height);
                // Преобразование canvas в blob-объект
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));

                // Создание файла и сохранение его в папку по пути __dirname
                const dirPath = SpecAR.path.join(this._profileDataBasePath, 'avatars');

                const now = new Date();
                const dateString = now
                    .toISOString()
                    .replace(/[^0-9]/g, '')
                    .slice(0, 14);
                const fileName = `photo-ID_${profileID}-${dateString}.jpg`;
                const filePath = SpecAR.path.join(dirPath, fileName);

                await SpecAR.fs.promises.writeFile(filePath, Buffer.from(await blob.arrayBuffer()));

                // Запускаем Python-скрипт
                const pythonScriptPath = SpecAR.getPath('core/python/faceRecognition.py');

                try {
                    await SpecAR.execPythonScript(pythonScriptPath, filePath);
                } catch (error) {
                    if (error.code === 1) {
                        SpecAR.logger.info({ title: 'Profile', message: 'The faces from the webcam image were not found' });
                    } else {
                        SpecAR.logger.error({ title: 'Profile', message: `execPythonScript error: ${error}` });
                    }
                }

                const normalizedPath = SpecAR.path.normalize(filePath);
                this._profileList[profileID].avatarPath = normalizedPath;

                // Вносим изменения в базу данных
                this._writeProfileChange(profileID);

                // Обновляем элементы
                this._updateAPI();
                this._reloadDOM();
            }
            // Остановка работы веб-камеры
            stream.getTracks().forEach(track => track.stop());
        });
    }

    /**
     * Удаление фото профиля
     * @param {string} profileID ID профиля
     */
    static async deletePhotoByID(profileID) {
        // Проверяем передан ли ID и новое название, и существует ли профиль с таким ID
        if (!profileID || !this._profileList[profileID]) {
            return;
        }

        // Вносим изменения
        this._profileList[profileID].avatarPath = this._profileList.Guest.avatarPath;

        // Вносим изменения в базу данных
        this._writeProfileChange(profileID);

        // Обновляем элементы
        this._updateAPI();
        this._reloadDOM();
    }
    /**
     * Выбор фото профиля из хранилища ПК
     * @param {string} profileID ID профиля
     */
    static async choosePhotoByID(profileID) {
        // Проверяем передан ли ID и новое название, и существует ли профиль с таким ID
        if (!profileID || !this._profileList[profileID]) {
            return;
        }

        const fileInput = document.getElementById('pProfile-file-input');
        const changeHandler = async event => {
            const file = event.target.files[0];
            if (file) {
                const filePath = SpecAR.path.normalize(file.path);

                // Вносим изменения
                this._profileList[profileID].avatarPath = filePath;

                // Записываем в базу данных
                this._writeProfileChange(profileID);

                this._updateAPI();
                this._reloadDOM();

                fileInput.removeEventListener('change', changeHandler);
            }
        };
        fileInput.addEventListener('change', changeHandler);
        fileInput.click();
    }

    /**
     * Изменение названия профиля по заданному ID
     * @param {string} profileID ID Профиля
     * @param {string} name Новое название
     */
    static async changeProfileNameByID(profileID, name) {
        // Проверяем передан ли ID и новое название, и существует ли профиль с таким ID
        if (!profileID || !name || !this._profileList[profileID]) {
            return;
        }

        // Вносим изменения
        this._profileList[profileID].profileName = name;

        // Записываем в базу данных
        this._writeProfileChange(profileID);

        // Обновляем API и ререндерим элемменты
        await this._updateAPI();
        this._reloadDOM();
    }

    /**
     * Удаление профиля по заданному ID
     * @param {string} profileID ID профиля
     */
    static async _deleteProfileByID(profileID) {
        // Проверяем передан ли ID и существует ли профиль с таким ID
        if (!profileID || !this._profileList[profileID]) {
            return;
        }

        // Название профиля
        const profileName = this._profileList[profileID].profileName;

        // Путь к аватару
        const avatarPath = this._profileList[profileID].avatarPath;

        // Путь к обученной модели
        const faceModelPath = this._profileList[profileID].faceModelPath.replace(/\\/g, '/');

        // Если профиль активен - меняем на гостевой
        if (this._activeProfile.id === profileID) {
            this._changeActiveProfieByID('Guest', false);
        }

        // Путь до файла профиля
        const databaseFilePath = await SpecAR.path.join(this._profileDataBasePath, `${profileID}.json`);

        // Удаляем профиль
        try {
            // Удаляем данные
            await SpecAR.fs.promises.unlink(databaseFilePath);

            // Удаляем аватар
            if (avatarPath != this._profileList.Guest.avatarPath) {
                await SpecAR.fs.promises.unlink(avatarPath);
                console.log(avatarPath);
            }

            // Удаляем модель
            if (faceModelPath != '') {
                await SpecAR.fs.promises.unlink(faceModelPath);

                let index = this._faceModelList.indexOf(this._profileList[profileID].faceModelPath);
                if (index !== -1) {
                    this._faceModelList.splice(index, 1);
                }
            }
            SpecAR.Notify.success(
                SpecAR.Translator.translate('PROFILE_DELETE_SUCCESSEFUL', {
                    profileName: profileName,
                })
            );
        } catch (err) {
            SpecAR.logger.error({ title: 'Profile', message: `Error deleting profile: ${err}` });
            SpecAR.Notify.error(SpecAR.Translator.translate('PROFILE_DELETE_ERROR'));
            return;
        }

        delete this._profileList[profileID];

        // Обновляем глобальную переменную
        this._updateAPI();

        // Ререндерим страницу
        this._reloadDOM();
    }

    /**
     * Изменение активного профиля
     * @param {string} profileID ID профиля
     * @param {boolean} showNotify Показывать уведомление об успешной смене профиля
     */
    static _changeActiveProfieByID(profileID, showNotify = true) {
        // Проверяем передан ли ID и существует ли профиль с таким ID
        if (!profileID || !this._profileList[profileID]) {
            return;
        }

        // Если профиль уже активен - игнорируем
        if (this._activeProfile.id === profileID) {
            return;
        }

        // Изменяем профиль на нужный
        this._activeProfile = this._profileList[profileID];
        if (showNotify) {
            SpecAR.Notify.info(
                SpecAR.Translator.translate('PROFILE_CHANGE_PROFILE_SUCCESSEFUL', {
                    profileName: this._profileList[profileID].profileName,
                })
            );
        }

        // Обновляем глобальную переменную
        this._updateAPI();

        // Инициализируем автовыход из профиля
        this.initProfileAutoExit();

        // Ререндерим страницу
        this._reloadDOM();

        // Вызываем ХУК
        window.dispatchEvent(new Event('onProfileChanged'));
    }

    /**
     * Создание нового профиля и добавление его в базу данных
     * @param {string} name  Данные об названии нового профиля
     */
    static async _createNewProfile(name) {
        try {
            // Создаем ID профиля
            const profileTransliterateName = SpecAR.tools.transliterate(name);
            const cleanProfileName = profileTransliterateName.replace(/[^\w]+/g, '');
            const camelCaseProfileName = cleanProfileName.replace(/\s+(.)/g, (_, char) => char.toUpperCase());
            const profileTextID = camelCaseProfileName.charAt(0).toUpperCase() + camelCaseProfileName.slice(1);
            const profileID = `PID-${SpecAR.tools.generateUniqueId(profileTextID)}`;

            const data = {
                id: profileID,
                avatarPath: this._profileList.Guest.avatarPath,
                profileName: name,
                faceModelPath: '',
                config: { DISPLAY: SpecAR.Config.defaultConfig.DISPLAY, VOLUME: SpecAR.Config.defaultConfig.VOLUME },
            };

            // Формируем путь и данные для записи
            const filePath = SpecAR.path.join(this._profileDataBasePath, `${profileID}.json`);
            const jsonData = JSON.stringify(data, null, 2);

            // Пробуем записать файл
            await SpecAR.fs.promises.writeFile(filePath, jsonData, 'utf8');

            // Добавляем новый профиль в список
            this._profileList[profileID] = data;

            // Устанавливаем в качестве активного
            this._changeActiveProfieByID(profileID, false);

            // Обновляем API
            this._updateAPI();

            // Обновляем DOM
            this._reloadDOM();

            SpecAR.Notify.success(SpecAR.Translator.translate('PROFILE_CREATE_SUCCESSEFUL', { profileName: name }));
            SpecAR.logger.info({
                title: 'Profile',
                message: `New profile "${name}" created successfully.`,
            });
        } catch (err) {
            SpecAR.logger.error({
                title: 'Profile',
                message: `Error creating new profile: ${err}`,
            });
        }
    }

    /**
     * Обновление названия профиля по умолчанию
     */
    static changeLocaleGuestProfile() {
        const newName = SpecAR.Translator.translate('PROFILE_GUEST');
        // Создаем профиль по умолчанию
        this._defaultProfile = { ...this._defaultProfile, profileName: newName };

        // Инициализация гостевого профиля
        this._profileList.Guest.profileName = newName;

        if (this._activeProfile === this._defaultProfile) {
            this._activeProfile.profileName = newName;
        }

        // Обновляем API
        this._updateAPI();
    }

    /**
     * Инициализация гостевого профиля
     */
    static async _initGuestProfile() {
        // Создаем профиль по умолчанию
        this._defaultProfile = {
            id: 'Guest',
            avatarPath: SpecAR.getPath('assets/images/guest.png'),
            profileName: SpecAR.Translator.translate('PROFILE_GUEST'),
            config: { DISPLAY: SpecAR.Config.guestConfig.DISPLAY, VOLUME: SpecAR.Config.guestConfig.VOLUME },
        };

        // Инициализация гостевого профиля
        this._profileList.Guest = this._defaultProfile;

        // Установка активного профиля на гостевой
        this._activeProfile = this._profileList.Guest;
    }

    /**
     * Инициализация системы профилей
     */
    static async init() {
        const startTime = new Date().getTime();
        await SpecAR.logger.info({
            title: 'Profile',
            message: 'Initializing the profile system...',
        });

        // Объект со всеми профилями
        this._profileList = {};

        // Объект со всеми моделями лицевого распознавания
        this._faceModelList = [];

        // Инициализация гостевого профиля и установка активного профиля
        await this._initGuestProfile();

        // Путь до папки базы данных
        this._profileDataBasePath = SpecAR.getPath('data/profiles');

        // Загружаем базу данных профилей
        await this._initProfiles();

        // Обновляем глобальную переменную SpecAR.Profile
        this._updateAPI();

        // Запускаем автоопределение пользователя
        setInterval(async () => this._detectUserInFrontMirror(), this.USER_DETECT_TIMER);

        // Слушаем изменение профиля
        window.addEventListener('onConfigProfileChanged', this._handleConfigChanged.bind(this));
        /**
         * Подведение итогов загрузки системы уведомлений
         */
        const endTime = new Date().getTime();
        const deltaTime = ((endTime - startTime) / 1000).toFixed(3);

        await SpecAR.logger.info({
            title: 'Profile',
            message: `The profile system is loaded for ${deltaTime} seconds`,
        });
    }

    /**
     * Инициализация базы данных профилей
     */
    static async _initProfiles() {
        // Путь к папке с аватарками
        const avatarsDirPath = SpecAR.path.join(this._profileDataBasePath, 'avatars');

        const access = SpecAR.util.promisify(SpecAR.fs.access);
        const mkdir = SpecAR.util.promisify(SpecAR.fs.mkdir);
        const readdir = SpecAR.util.promisify(SpecAR.fs.readdir);
        const readFile = SpecAR.util.promisify(SpecAR.fs.readFile);

        /**
         * Загрузка и добавление данных о профиле в локальную базу данных
         * @param {pathList} files Список файлов (их путь)
         */
        const loadJsonFiles = async file => {
            const profileName = SpecAR.path.parse(file).name;
            try {
                const data = await readFile(SpecAR.path.join(this._profileDataBasePath, file), 'utf8');
                const parsedData = JSON.parse(data);
                this._profileList[profileName] = parsedData;

                // Подгружаем список моделей автораспознавания
                if (parsedData.faceModelPath != '') {
                    this._faceModelList.push(parsedData.faceModelPath);
                }
            } catch (err) {
                SpecAR.logger.error({
                    title: 'Profile',
                    message: `Error reading file or parsing JSON: ${err}`,
                });
            }
        };

        /**
         * Создание папки, в случае ее отсутствия
         * @param {path} path Путь к папке
         * @param {string} title Название папки
         */
        const createDirectoryIfNotExists = async (path, title) => {
            try {
                await access(path);
                SpecAR.logger.info({ title, message: `${title} directory exists. Searching for files...` });
            } catch (err) {
                SpecAR.logger.info({ title, message: `${title} directory does not exist. Creating...` });
                await mkdir(path, { recursive: true });
                SpecAR.logger.info({ title, message: `${title} directory created successfully.` });
            }
        };

        // Проверка существование папки Profiles
        await createDirectoryIfNotExists(this._profileDataBasePath, 'Profile');
        // Проверка существование папки Avatars
        await createDirectoryIfNotExists(avatarsDirPath, 'Avatars');

        // Получение имеющихся данных из папки
        try {
            const files = await readdir(this._profileDataBasePath);
            const jsonFiles = files.filter(file => SpecAR.path.extname(file) === '.json');

            if (jsonFiles.length !== 0) {
                await Promise.all(jsonFiles.map(loadJsonFiles));
                SpecAR.logger.info({ title: 'Profile', message: 'All profile files have been loaded!' });
            } else {
                SpecAR.logger.info({ title: 'Profile', message: 'No profile files found.' });
            }
        } catch (err) {
            SpecAR.logger.error({ title: 'Profile', message: `Error reading directory: ${err}` });
        }
    }
}

module.exports = { Profile };

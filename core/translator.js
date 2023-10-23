class Translator {
    /**
     * Поле со всеми загруженными словарями
     */
    static _generalDictionary = {};

    /**
     * Расширение словаря новыми ключами
     * @param {string} code Код страны (ru_RU, en_US, etc.)
     * @param {object} keyObj Объект с кодами переводов
     */
    static async dictionaryExtension(code, keyObj) {
        SpecAR.Translator.localeList[code] = { ...SpecAR.Translator.localeList[code], ...keyObj };
        this._generalDictionary[code] = { ...this._generalDictionary[code], ...keyObj };
    }

    /**
     * Загрузка файла словаря и добавление данных в общий словарь
     * @param {string} code Код страны (ru_RU, en_US, etc.)
     * @param {string} path Абсолютный путь до файла словаря
     */
    static async _loadDictionary(code, path) {
        try {
            // Считываем данные словаря из .json
            const dictionaryData = await SpecAR.fs.promises.readFile(path, 'utf8');

            // Конвертируем данные json в объект JS
            const objDictionary = JSON.parse(dictionaryData);

            // Регистрируем новую локаль в глобальную переменную
            const newLocale = {};
            newLocale[code] = {
                name: objDictionary['LANGUAGE_NAME'],
            };
            SpecAR.Translator.localeList = { ...SpecAR.Translator.localeList, ...newLocale };

            // Назначаем данные полю
            this._generalDictionary[code] = objDictionary;
        } catch (error) {
            SpecAR.logger.error({
                title: 'Translator',
                message: `Error loading dictionary for ${code}: ${error}`,
            });
        }
    }

    /**
     * Получает перевод по ключу согласно установленной локали
     * @param {string} key Ключ словаря с переводами
     * @param {object} replacements Объект с ключами, которые необходимо заменить
     * @returns
     */
    static getTranslate(key, replacements = {}) {
        // Получаем текущую локаль системы
        const locale = SpecAR.Config.getData.locale;

        // Возвращаем null, если не передали ключ
        if (!key) {
            SpecAR.logger.error({
                title: 'Translator',
                message: 'Dictionary key not passed',
            });
            return null;
        }

        // Возвращаем null, если локаль не имеет словарей
        if (!this._generalDictionary[locale]) {
            SpecAR.logger.error({
                title: 'Translator',
                message: 'This locale is not present in the system',
            });
            return null;
        }

        // Возвращаем перевод согласно локали, если перевод существует
        if (this._generalDictionary[locale][key]) {
            const translation = this._generalDictionary[locale][key];

            if (Object.keys(replacements).length > 0) {
                return translation.replace(/{(\w+)}/g, function (match, keyArg) {
                    return typeof replacements[keyArg] !== 'undefined' ? replacements[keyArg] : match;
                });
            }
            return translation;
        }

        // Если в текущей локале нет текста у ключа, ищем в любой другой доступной
        for (const localeAr in this._generalDictionary) {
            if (!this._generalDictionary.hasOwnProperty(localeAr) || localeAr === locale) {
                continue;
            }

            if (this._generalDictionary[localeAr][key]) {
                const translation = this._generalDictionary[localeAr][key];

                SpecAR.logger.warn({
                    title: 'Translator',
                    message: `The key ${key} is missing in the current locale, but found in ${localeAr}`,
                });

                if (Object.keys(replacements).length > 0) {
                    return translation.replace(/{(\w+)}/g, function (match, keyArg) {
                        return typeof replacements[keyArg] !== 'undefined' ? replacements[keyArg] : match;
                    });
                }

                return translation;
            }

            continue;
        }
        // Возвращаем заглушку, если у ключа нет текста
        SpecAR.logger.error({
            title: 'Translator',
            message: `There is no translation for the given key - ${key}`,
        });
        return 'NO_TRANSLATE';
    }

    /**
     * Обновление API системы интернационализации
     */
    static _setAPI() {
        SpecAR.Translator = {
            translate: (key, replacements) => this.getTranslate(key, replacements),
            dictionaryExtension: (code, keyObj) => this.dictionaryExtension(code, keyObj),
        };
    }
    /**
     * Инициализация системы интернационализации
     */
    static async init() {
        const startTime = new Date().getTime();
        await SpecAR.logger.info({
            title: 'Translator',
            message: 'Loading dictionaries...',
        });

        // Объявление API
        this._setAPI();

        // Поиск словарей в папке translations
        const dirs = await SpecAR.fs.promises.readdir(SpecAR.getPath('translations'), {
            withFileTypes: true,
        });

        await Promise.all(
            dirs.map(async dictionary => {
                // Пропускаем все файлы, отличные от json
                if (SpecAR.path.extname(dictionary.name) !== '.json') {
                    return;
                }

                // Полный путь до словаря
                const dictionaryPath = SpecAR.getPath(`translations/${dictionary.name}`);
                // Обрезаем код страны
                const laungageCode = dictionary.name.slice(0, -5);

                await this._loadDictionary(laungageCode, dictionaryPath);
            })
        );

        /**
         * Подведение итогов загрузки модулей
         */
        const endTime = new Date().getTime();
        const deltaTime = ((endTime - startTime) / 1000).toFixed(3);

        await SpecAR.logger.info({
            title: 'Translator',
            message: `Loaded dictionaries in ${deltaTime} seconds`,
        });
    }
}

module.exports = { Translator };

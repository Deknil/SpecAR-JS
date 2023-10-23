// Кэш иконок
var iconCache = {};

module.exports = {
    /**
     * Возвращает строку, изменяя ее первый символ на верхний регистр, а остальные переводя в нижний
     * @param {sting} string Строка текста
     * @returns Строка, с измененным первым символом на верхний регистр, а остальные - нижний.
     */
    capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },
    /**
     * Ассинхронная прогрузка svg иконок
     * @param {string} iconName Название иконки из папки ./assets/icons
     * @returns HTML элемент с кодом <SVG></SVG>
     */
    async iconParser(iconName) {
        if (!iconName) {
            SpecAR.logger.error({
                title: 'Tools',
                message: 'Icon name is not specified',
            });
            return;
        }

        if (iconCache[iconName]) {
            // Возвращаем закэшированные данные, если они уже были загружены ранее
            return iconCache[iconName];
        }

        // Путь до иконки
        const filePath = SpecAR.getPath(`./assets/icons/${iconName}.svg`);

        try {
            const iconData = await SpecAR.fs.promises.readFile(filePath, 'utf8');
            iconCache[iconName] = iconData; // Кэшируем данные для будущих запросов
            return iconData;
        } catch (err) {
            SpecAR.logger.error({
                title: 'SettingsPage',
                message: `Failed read ${filePath}: ${err.message}`,
            });
            return '';
        }
    },
    /**
     * Сравнение двух текстов по алгоритму Левенштейна
     * @param {string} text1 Текст для сравнения
     * @param {string} text2 Сравниваемый текст
     * @returns {float} Совпадение двух текстов в долях
     */
    similarityPercentage(text1, text2) {
        const maxLength = Math.max(text1.length, text2.length);
        if (maxLength === 0) return 1.0; // Оба текста пусты, поэтому считаем совпадение 100%

        const distance = SpecAR.levenshtein.get(text1, text2);
        return 1.0 - distance / maxLength;
    },
    /**
     * Возвращает объект с кэшированными иконками
     */
    getIconCache: iconCache,
    /**
     * Обновление приложения
     */
    appUpdate() {
        console.log('UPDATE');
    },
    /**
     * Транслитерация русского текста
     * @param {string} text Текст на русском языке
     * @returns Транслитерированый текст
     */
    transliterate(text) {
        const ruToEn = {
            А: 'A',
            Б: 'B',
            В: 'V',
            Г: 'G',
            Д: 'D',
            Е: 'E',
            Ё: 'Yo',
            Ж: 'Zh',
            З: 'Z',
            И: 'I',
            Й: 'Y',
            К: 'K',
            Л: 'L',
            М: 'M',
            Н: 'N',
            О: 'O',
            П: 'P',
            Р: 'R',
            С: 'S',
            Т: 'T',
            У: 'U',
            Ф: 'F',
            Х: 'H',
            Ц: 'Ts',
            Ч: 'Ch',
            Ш: 'Sh',
            Щ: 'Sch',
            Ъ: '',
            Ы: 'Y',
            Ь: '',
            Э: 'E',
            Ю: 'Yu',
            Я: 'Ya',

            а: 'a',
            б: 'b',
            в: 'v',
            г: 'g',
            д: 'd',
            е: 'e',
            ё: 'yo',
            ж: 'zh',
            з: 'z',
            и: 'i',
            й: 'y',
            к: 'k',
            л: 'l',
            м: 'm',
            н: 'n',
            о: 'o',
            п: 'p',
            р: 'r',
            с: 's',
            т: 't',
            у: 'u',
            ф: 'f',
            х: 'h',
            ц: 'ts',
            ч: 'ch',
            ш: 'sh',
            щ: 'sch',
            ъ: '',
            ы: 'y',
            ь: '',
            э: 'e',
            ю: 'yu',
            я: 'ya',
        };

        return text
            .split('')
            .map(char => ruToEn[char] || char)
            .join('');
    },
    /**
     * Форматирует количество байтов в строку по определенному шаблону (например, 10.3 KB)
     * @param {integer} bytes Число, которое необходимо исправить
     * @param {integer} decimals Количиство знаков после запятой
     * @returns Строка формата, например, 10.3 KB
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    /**
     * Форматирует секунды в строку - сколько времени прошло с заданного значения
     * @param {integer} timestamp Количество времени в секундах
     * @returns Строка формата, например, 42 секунды назад.
     */
    timeSince: timestamp => {
        const now = new Date();
        const secondsPast = (now.getTime() - timestamp) / 1000;

        if (secondsPast < 60) {
            return `${Math.round(secondsPast)} ${SpecAR.Translator.translate('TIME_SECONDS')} ${SpecAR.Translator.translate(
                'TIME_BACK'
            )}`;
        }
        if (secondsPast < 3600) {
            return `${Math.round(secondsPast / 60)} ${SpecAR.Translator.translate('TIME_MINUTES')} ${SpecAR.Translator.translate(
                'TIME_BACK'
            )}`;
        }
        if (secondsPast <= 86400) {
            return `${Math.round(secondsPast / 3600)} ${SpecAR.Translator.translate('TIME_HOURS')} ${SpecAR.Translator.translate(
                'TIME_BACK'
            )}`;
        }
        if (secondsPast > 86400) {
            const day = new Date(timestamp);
            return `${day.getDate()}/${day.getMonth() + 1}/${day.getFullYear()}`;
        }

        if (secondsPast < 0) {
            return null;
        }
    },
    /**
     * Создание уникального ID из входного текста
     * @param {string} text Латинский текст
     * @returns Уникальный ID
     */
    generateUniqueId: text => {
        text = text + String(Math.round(Math.random() * 17605));
        const hash = SpecAR.crypto.createHash('sha256');
        hash.update(text);
        const uniqueId = `${hash.digest('hex').substring(0, 15).toUpperCase()}`;
        return uniqueId;
    },
};

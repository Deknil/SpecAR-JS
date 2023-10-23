const path = require('path');
const fs = require('fs');
const os = require('os');
const { version } = require(path.join(__dirname, 'package.json'));
const nunjucks = require('nunjucks');
const baseClasses = require('./utils/baseClasses');
const logger = require('./utils/logger');
const tools = require('./utils/tools');
const crypto = require('crypto');
const { exec, execFile, spawn } = require('child_process');
const util = require('util');
const morphdom = require('morphdom');
const axios = require('axios');
const levenshtein = require('fast-levenshtein');
const { promisify } = require('util');

/**
 * Генерация уникального ID устройства
 * @returns ID устройства
 */
const generateUniqueDeviceID = () => {
    const cpuString = os.cpus().reduce((acc, cpu) => acc + cpu.model + cpu.speed, '');
    return crypto.createHash('md5').update(cpuString).digest('hex').substr(0, 6).toUpperCase();
};

/**
 * Получение информации о дисковом пространстве
 */
exec('LC_ALL=C df', (error, stdout, stderr) => {
    if (error) {
        logger.error({ title: 'DiskInfo', message: error });
        return;
    }

    let availableSize = 0;
    let totalSize = 0;

    const lines = stdout.trim().split('\n');
    const headers = lines[0].split(/\s+/);

    const sizeIndex = headers.indexOf('1K-blocks');
    const availableIndex = headers.indexOf('Available');

    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(/\s+/);

        const size = parseInt(columns[sizeIndex]) * 1024;
        const available = parseInt(columns[availableIndex]) * 1024;

        totalSize += size;
        availableSize += available;
    }

    SpecAR.deviceAPI.aboutInfo.diskData = `${tools.formatBytes(availableSize)} / ${tools.formatBytes(totalSize)}`;
});

/**
 * API
 */
window.SpecAR = {
    hooks: {
        /**
         * Хук, создающий событие выхода из прилоежния
         */
        onAppExit: () => {
            // Создаем новый объект события
            let event = new Event('onAppExit');

            // Отправляем кастомное событие
            window.dispatchEvent(event);

            SpecAR.logger.info({ title: 'Hooks', message: `The application shutdown hook is triggered` });
        },
    },
    deviceAPI: {
        /**
         * Информация об устройстве
         */
        aboutInfo: {
            deviceName: `SpecAR-${generateUniqueDeviceID()}`,
            RAM: `${tools.formatBytes(os.freemem())} / ${tools.formatBytes(os.totalmem())}`,
            CPU: os.cpus()[0].model,
            arch: os.arch(),
            platform: os.platform(),
            release: os.release(),
            osType: os.type(),
            osVersion: os.version(),
        },
        /**
         * Версия прилоежния SpecAR
         */
        version: {
            appVersion: version,
            lastVersion: '1.0',
        },
        /**
         * Завершение работы устройства
         * @param mode Режим выключения 0 - с диалоговым окном, 1 - без диалогового окна (0 по умолчанию)
         */
        deviceShutdown: (mode = 0) => {
            if (mode === 1) {
                exec('sudo shutdown -h now', (err, stdout, stderr) => {
                    if (err) {
                        logger.error({ title: 'SHUTDOWN', message: err });
                        return;
                    }
                    logger.error({
                        title: 'SHUTDOWN',
                        message: 'Turning off the device...',
                    });
                });
                return
            }
            Swal.fire({
                title: SpecAR.Translator.translate('POPUP_ARE_YOUR_SURE'),
                text: SpecAR.Translator.translate('SETTINGS_SHUTDOWN__TEXT'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                cancelButtonText: SpecAR.Translator.translate('POPUP_СANCEL_BUTTON'),
                confirmButtonText: SpecAR.Translator.translate('SETTINGS_SHUTDOWN__CONFIRM'),
            }).then(result => {
                if (result.isConfirmed) {
                    let timerInterval;
                    Swal.fire({
                        title: SpecAR.Translator.translate('SETTINGS_SHUTDOWN__PROCCES'),
                        html: `<b>${SpecAR.Translator.translate('POPUP_СANCEL_TEXT')}<b>`,
                        timer: 2000,
                        didOpen: () => {
                            Swal.showLoading();
                        },
                        willClose: () => {
                            clearInterval(timerInterval);
                        },
                    }).then(result => {
                        if (result.dismiss === Swal.DismissReason.timer) {
                            exec('sudo shutdown -h now', (err, stdout, stderr) => {
                                if (err) {
                                    logger.error({ title: 'SHUTDOWN', message: err });
                                    return;
                                }
                                logger.error({
                                    title: 'SHUTDOWN',
                                    message: 'Turning off the device...',
                                });
                            });
                        }
                    });
                }
            });
        },
        /**
         * Перезагрузка устройства
         * @param mode Режим перезагрузки 0 - с диалоговым окном, 1 - без диалогового окна (0 по умолчанию)
         */
        deviceRestart: (mode = 0) => {
            if (mode === 1) {
                exec('sudo shutdown -r now', (err, stdout, stderr) => {
                    if (err) {
                        logger.error({ title: 'RESTART', message: err });
                        return;
                    }
                    logger.error({ title: 'RESTART', message: 'Rebooting device...' });
                });
                return
            }
            Swal.fire({
                title: SpecAR.Translator.translate('POPUP_ARE_YOUR_SURE'),
                text: SpecAR.Translator.translate('SETTINGS_RESTART__TEXT'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                cancelButtonText: SpecAR.Translator.translate('POPUP_СANCEL_BUTTON'),
                confirmButtonText: SpecAR.Translator.translate('SETTINGS_RESTART__CONFIRM'),
            }).then(result => {
                if (result.isConfirmed) {
                    let timerInterval;
                    Swal.fire({
                        title: SpecAR.Translator.translate('SETTINGS_RESTART__PROCCES'),
                        html: `<b>${SpecAR.Translator.translate('POPUP_СANCEL_TEXT')}<b>`,
                        timer: 2000,
                        didOpen: () => {
                            Swal.showLoading();
                        },
                        willClose: () => {
                            clearInterval(timerInterval);
                        },
                    }).then(result => {
                        if (result.dismiss === Swal.DismissReason.timer) {
                            exec('sudo shutdown -r now', (err, stdout, stderr) => {
                                if (err) {
                                    logger.error({ title: 'RESTART', message: err });
                                    return;
                                }
                                logger.error({ title: 'RESTART', message: 'Rebooting device...' });
                            });
                        }
                    });
                }
            });
        },
        /**
         * Проверка подключения к интернету
         * @param callback Функция, принимающая статус подключения
         */
        isInternetConnection: async callback => {
            try {
                const response = await fetch('https://gunzar.tech');
                callback(response.status === 200);
            } catch (error) {
                callback(false);
            }
        },
    },
    /**
     * Получение пути до файла/папки относительно корневой папки SpecAR
     * @param dir Путь до папки
     * @returns {string} Путь до папки относительно SpecAR
     */
    getPath: dir => path.join(__dirname, dir || ''),
    /**
     * Выполнение системной команды
     * @param command Команда
     */
    execCommand: async command => {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    },
    /**
     * Запуск скрипта python
     * @param scriptPath путь до скрипта
     * @param args аргументы запуска
     */
    execPythonScript: async (scriptPath, ...args) => {
        if (os.platform() != 'linux') {
            throw logger.error({ title: 'PythonScript', message: 'Unsupported platform' });
        }

        const pythonExecutable = path.join(__dirname, 'core', 'python', 'venv', 'bin', 'python');

        return new Promise((resolve, reject) => {
            execFile(pythonExecutable, [scriptPath, ...args], (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (stderr) {
                    reject(stderr);
                }
                resolve(stdout);
            });
        });
    },
    /**
     * Базовые классы SpecAR
     */
    baseClasses,
    path,
    fs,
    axios,
    exec,
    execFile,
    spawn,
    nunjucks,
    logger,
    os,
    tools,
    levenshtein,
    promisify,
    util,
    crypto,
    morphdom,
};

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Утилита логирования
const logger = require('./utils/logger');
logger.info({
    title: 'Application',
    message: `Launching the application in ${process.env.NODE_ENV} mode...`,
});

// Проверка режима разработчика (запуск приложения с помощью app:start-dev)
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    // Автозапуск определенных действий без пользовательского взаимодействия
    const switches = new Set(['autoplay-policy', 'no-user-gesture-required']);
    app.commandLine.appendSwitch(...switches);

    const win = new BrowserWindow({
        width: 900,
        height: 850,
        x: 0,
        y: 0,
        icon: path.join(__dirname, 'appicon.png'),
        darkTheme: true,
        // Отключение вверхней панели инструментов для production-режима
        frame: isDev,
        webPreferences: {
            // Отключение изоляции главного процесса от рендер-процессов
            contextIsolation: false,
            // Включение использования модулей Node.JS в рендер-процессы
            nodeIntegration: true,
            enableRemoteModule: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    win.loadFile(path.join(__dirname, 'web/index.html'));

    if (!isDev) {
        // Включение режима киоска
        win.setKiosk(true);
    } else {
        // Открытие инструментов разработчика
        win.webContents.once('did-finish-load', () => {
            win.webContents.openDevTools();
        });
    }

    // Удаление заголовков ответов, которые предотвращают встраивание сайтов в iframe, если они настроены
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        let curHeaders = details.responseHeaders;
        if (process.env['ignoreXOriginHeader'] || false) {
            curHeaders = Object.fromEntries(Object.entries(curHeaders).filter(header => !/x-frame-options/i.test(header[0])));
        }

        if (process.env['ignoreContentSecurityPolicy'] || false) {
            curHeaders = Object.fromEntries(Object.entries(curHeaders).filter(header => !/content-security-policy/i.test(header[0])));
        }

        callback({ responseHeaders: curHeaders });
    });

    // Слушаем событие закрытия окна
    win.on('close', e => {
        e.preventDefault(); // предотвратим стандартное закрытие окна

        // Вызов функции в рендерере процессе
        win.webContents.executeJavaScript('SpecAR.hooks.onAppExit()');

        // Закрываем окно
        win.destroy();
    });
}

// Модуль автоматической перезагрузки приложения при изменении файлов (только в режиме разработки)
if (isDev) {
    try {
        require('electron-reloader')(module, {
            // Добавление в исключение папки log, node_modules, data, temp и данных config.json
            ignore: /[/\\](log|node_modules|data|temp)|config\.json|[\/\\]\./,
        });
        logger.info({
            title: 'Application',
            message: "Launching the application's automatic reload module...",
        });
    } catch (err) {
        logger.error({
            title: 'Application',
            message: err,
        });
    }
}

app.whenReady().then(() => {
    logger.info({
        title: 'Application',
        message: 'Launching the main window...',
    });
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    logger.info({
        title: 'Application',
        message: 'The application has been successfully launched!',
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        logger.info({
            title: 'Application',
            message: 'Exiting the application...',
        });
    }
});

if (process.platform === 'win32') {
    process.on('message', data => {
        if (data === 'graceful-exit') {
            app.quit();
            logger.info({
                title: 'Application',
                message: 'Exiting the application...',
            });
        }
    });
} else {
    process.on('SIGTERM', () => {
        app.quit();
        logger.info({
            title: 'Application',
            message: 'Exiting the application...',
        });
    });
}

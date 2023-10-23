const { Translator } = require(SpecAR.getPath('./core/translator.js'));
const { Config } = require(SpecAR.getPath('./core/config.js'));
const { Navigation } = require(SpecAR.getPath('./core/navigation.js'));
const { Notify } = require(SpecAR.getPath('./core/notify.js'));
const { Profile } = require(SpecAR.getPath('./core/profile.js'));
const { loadModules } = require(SpecAR.getPath('./modules/module-loader.js'));

/* 
    Точка входа ядра 
*/
(async function () {
    const startLoadTime = new Date().getTime();
    /*
        Поиск и загрузка конфигурационного файла
    */
    SpecAR.logger.info({
        title: 'Core',
        message: 'Loading the configuration file..',
    });
    await Config.init();
    
    /*
        Система интернационалиации
    */
    SpecAR.logger.info({
        title: 'Core',
        message: 'Loading the internationalization system..',
    });
    await Translator.init();

    /*
        Система уведомлений
    */
    SpecAR.logger.info({
        title: 'Core',
        message: 'Loading the notification system..',
    });
    Notify.init();

    /*
        Система уведомлений
    */
    SpecAR.logger.info({
        title: 'Core',
        message: 'Loading the profile system..',
    });
    Profile.init();

    /*
        Система модулей
    */
    SpecAR.logger.info({
        title: 'Core',
        message: 'Loading the module system...',
    });
    loadModules();

    /*
        Система навигации
    */
    SpecAR.logger.info({
        title: 'Core',
        message: 'Loading the navigation system...',
    });
    Navigation.init();

    /**
     * Подведение итогов загрузки системы
     */
    const endLoadTime = new Date().getTime();
    const deltaTime = ((endLoadTime - startLoadTime) / 1000).toFixed(3);

    SpecAR.logger.info({
        title: 'Core',
        message: `System booted up in ${deltaTime} seconds`,
    });
})();

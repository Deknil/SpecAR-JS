/* Полный путь до папки с модулями */
const modulesFolder = SpecAR.getPath('./modules');
/* Список экземпляров модулей */
const moduleList = {};

/**
 * Функция загрузки модулей
 */
async function loadModules() {
    const startTime = new Date().getTime();
    SpecAR.logger.info({
        title: 'ModuleLoader',
        message: 'Loading modules...',
    });

    /* Поиск папок, вложенных в корневую папку modules */
    const dirs = await SpecAR.fs.promises.readdir(modulesFolder, {
        withFileTypes: true,
    });

    await Promise.all(
        dirs.map(async dir => {
            // Если путь ведет не к папке - пропускаем
            if (!dir.isDirectory()) {
                return;
            }

            /* Полный путь до главного файла модуля */
            const modulePath = SpecAR.path.join(modulesFolder, dir.name, 'main.js');
            try {
                /* Импорт и создание экземпляра */
                const module = await require(modulePath);
                const moduleInstance = await new module.Module();

                await moduleInstance.init();
                /* Добавление экземпляра в список модулей */
                moduleList[moduleInstance.moduleID] = moduleInstance;
            } catch (err) {
                SpecAR.logger.error({
                    title: 'ModuleLoader',
                    message: `Error in "${modulePath}": ${err.message}`,
                });
            }
        })
    );

    SpecAR.moduleList = moduleList;
    /**
     * Подведение итогов загрузки модулей
     */
    const endTime = new Date().getTime();
    const deltaTime = ((endTime - startTime) / 1000).toFixed(3);

    SpecAR.logger.info({
        title: 'ModuleLoader',
        message: `Loaded ${Object.keys(moduleList).length} modules in ${deltaTime} seconds: ${Object.values(moduleList)
            .map(mod => `${mod.moduleID} (v${mod.moduleVersion})`)
            .join(', ')}`,
    });
}

module.exports = { loadModules };

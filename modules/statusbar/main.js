class Module extends SpecAR.baseClasses.BaseModule {
    constructor() {
        super(__dirname);
        this.config = {
            id: 'Module-StatusBar',
            translationPrefix: 'MODULE_STATUSBAR',
            version: '1.0',
            mode: this.MODULE_MODE.WIDGET,
            orientation: { x: 'left', y: 'top' },
            position: { x: 10, y: 10 },
            size: { w: 330, h: 120 },

            // Время обновления значений часов
            updateTimer: 10000,
        };
    }

    /**
     * Дополнительная инициализация
     */
    async afterInit() {
        // Название текущей сети WIFI
        this.currentWifiSSID = '';

        this.notifyBadge = document.getElementById('statusbar-module-container-notify-badge');
        this.avatarImg = document.getElementById('statusbar-module-container-avatar');
        this.statusBarSoundSlider = document.getElementById('statusbar-module-container-sound');

        // Подгружаем актуальные данные
        this.updateInformation();

        // Цикл обновления данных
        setInterval(() => {
            this.updateInformation();
        }, this.config.updateTimer);

        window.addEventListener('onProfileChanged', () => this.updateInformation());
        window.addEventListener('onNotifyChanged', () => this.updateInformation());
        window.addEventListener('onConfigChanged', () => this.updateInformation());
        window.addEventListener('onStatusBarSoundChanged', () => this.updateInformation());
    }

    /**
     * Обновление данных
     */
    async updateInformation() {
        const currentWIFI = await this.getCurrentWifiSSID();
        this.reloadTemplate({ curConnection: currentWIFI });
    }

    /**
     * Отключение текущей сети WIFI
     */
    async disconnectWifi() {
        Swal.fire({
            title: SpecAR.Translator.translate('POPUP_ARE_YOUR_SURE'),
            text: this.getModuleTranslate('WIFI-DISCONNECT'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            cancelButtonText: SpecAR.Translator.translate('POPUP_СANCEL_BUTTON'),
            confirmButtonText: this.getModuleTranslate('WIFI-DISCONNECT_CONFIRM'),
        }).then(async result => {
            if (result.isConfirmed) {
                // Разрываем соединение
                await SpecAR.execCommand('nmcli connection down id "$(nmcli -t -f NAME connection show --active)"');
                SpecAR.Notify.info(this.getModuleTranslate('WIFI-DISCONNECT_SUCCESS', { wifiName: this.currentWifiSSID }));

                this.currentWifiSSID = '';

                this.updateInformation();
            }
        });
    }

    /**
     * Попытка подключения к WiFi сети
     * @param {string} ssid Название wifi сети
     */
    async networkConnect(ssid, isLock) {
        // Ввод пароля
        const showPasswordModal = () =>
            Swal.fire({
                title: this.getModuleTranslate('NETMANAGER'),
                input: 'text',
                inputAttributes: {
                    autocapitalize: 'off',
                    placeholder: this.getModuleTranslate('NETMANAGER_PASS_PLACEHOLDER'),
                },
                showCancelButton: true,
                cancelButtonText: SpecAR.Translator.translate('POPUP_СANCEL_BUTTON'),
                confirmButtonText: this.getModuleTranslate('NETMANAGER_CONNECT'),
                showLoaderOnConfirm: true,
                preConfirm: password => {
                    SpecAR.execCommand(`nmcli dev wifi connect "${ssid}" password "${password}"`);
                },
                allowOutsideClick: false,
            }).then(result => {
                if (result.isConfirmed) {
                    console.log(result);
                    console.log(result.value);
                } else {
                    // Открываем еще раз менеджер сетей
                    this.networkManager();
                }
            });

        // Если пароля нет
        if (isLock === '') {
            SpecAR.execCommand(`nmcli dev wifi connect "${ssid}" password ""`);
            Swal.close();
            this.updateInformation();
            return;
        }

        await showPasswordModal();
        this.updateInformation();
    }

    /**
     * Управление сетями WiFi
     */
    async networkManager() {
        const getIconBySignal = signal => {
            if (signal < 35) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.53 17.46L12 21l-3.53-3.54c.9-.9 2.15-1.46 3.53-1.46s2.63.56 3.53 1.46z"/></svg>';
            }
            if (signal < 65) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 10c3.03 0 5.78 1.23 7.76 3.22l-2.12 2.12A7.967 7.967 0 0 0 12 13c-2.2 0-4.2.9-5.64 2.35l-2.12-2.12C6.22 11.23 8.97 10 12 10zm0 6c-1.38 0-2.63.56-3.53 1.46L12 21l3.53-3.54A4.98 4.98 0 0 0 12 16z"/></svg>';
            }
            return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3l3-3a4.237 4.237 0 0 0-6 0zm-4-4l2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>';
        };

        const getWifiItems = async () => {
            const availableWifiSSIDs = await this.getAvailableWifiSSID();
            return availableWifiSSIDs
                .map(wifi => {
                    return `<li class="networkManager-wifiitem">
                        ${
                            wifi.security &&
                            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6 22q-.825 0-1.413-.588T4 20V10q0-.825.588-1.413T6 8h1V6q0-2.075 1.463-3.538T12 1q2.075 0 3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.588 1.413T18 22H6Zm6-5q.825 0 1.413-.588T14 15q0-.825-.588-1.413T12 13q-.825 0-1.413.588T10 15q0 .825.588 1.413T12 17ZM9 8h6V6q0-1.25-.875-2.125T12 3q-1.25 0-2.125.875T9 6v2Z"/></svg>'
                        }
                        ${getIconBySignal(wifi.signal)}
                        <span>${wifi.ssid}</span> 
                        <svg class="networkManager-wifiitem-connect" onClick="SpecAR.moduleList['${this.moduleID}'].networkConnect('${
                        wifi.ssid
                    }', '${
                        wifi.security
                    }')" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="currentColor" d="M25.06 13.72c-.944-5.173-5.46-9.095-10.903-9.095v4a7.104 7.104 0 0 1 7.094 7.094a7.104 7.104 0 0 1-7.093 7.092v4.002c5.442-.004 9.96-3.926 10.903-9.096h4.69v-4h-4.69zm-4.685 2a6.216 6.216 0 0 0-12.103-2.002H1.438v4h6.834a6.216 6.216 0 0 0 12.104-2z"/></svg>
                        </li>
                    `;
                })
                .join('');
        };

        Swal.fire({
            title: this.getModuleTranslate('NETMANAGER'),
            html: `<ul class="statusbar-networkmanager-list">
                <center>${this.getModuleTranslate('NETMANAGER_LOADING')}</center>
                
            </ul>`,
            showCancelButton: true,
            showConfirmButton: false,
            cancelButtonText: SpecAR.Translator.translate('POPUP_СANCEL_BUTTON'),
            allowOutsideClick: false,
            didOpen: async () => {
                const container = Swal.getHtmlContainer().querySelector('ul');
                const wifi = await getWifiItems();

                container.innerHTML = wifi;
            },
        });
    }

    /**
     * Получение имен всех доступных Wi-Fi сетей
     */
    async getAvailableWifiSSID() {
        return new Promise((resolve, reject) => {
            // Изменение параметров форматирования вывода: добавление SECURITY и SIGNAL
            SpecAR.exec('nmcli -t -f ssid,security,signal dev wifi', (error, stdout, stderr) => {
                if (error) {
                    SpecAR.logger.error({ title: this.moduleID, message: `Get wifi SSID list error: ${error}` });
                    return reject(error);
                }
                const wifiList = stdout.trim().split('\n');

                // Отсеивание пустых и уже подключенных сетей
                const filteredWifiList = wifiList
                    .map(wifi => {
                        const [ssid, security, signal] = wifi.split(':');
                        return { ssid, security, signal: parseInt(signal) };
                    })
                    .filter(wifi => wifi.ssid !== '' && wifi.ssid !== this.currentWifiSSID);

                resolve(filteredWifiList);
            });
        });
    }

    /**
     * Получение имени текущей подключенной Wi-Fi сети
     */
    async getCurrentWifiSSID() {
        return new Promise((resolve, reject) => {
            SpecAR.exec("LC_ALL=C nmcli -t -f active,ssid dev wifi | egrep '^yes' | cut -d: -f2", (error, stdout, stderr) => {
                if (error) {
                    SpecAR.logger.error({ title: this.moduleID, message: `Get current wifi SSID error: ${error}` });
                    return reject(error);
                }
                const wifiName = stdout.trim();
                this.currentWifiSSID = wifiName;
                resolve(wifiName);
            });
        });
    }
}

module.exports = { Module };

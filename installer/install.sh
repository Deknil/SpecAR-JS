#!/bin/bash

# Очистка терминала
clear

# Вывод авторских прав
echo "                                                                                                                  "
echo "                                                                                                                  "
echo "                                                                                                                  "
echo "                                                                                                                  "
echo "   _____ _____  ______ _____          _____                                                                       "
echo "  / ____|  __ \|  ____/ ____|   /\   |  __ \                                                                      "
echo " | (___ | |__) | |__ | |       /  \  | |__) |                                                                     "
echo "  \___ \|  ___/|  __|| |      / /\ \ |  _  /                                                                      "
echo "  ____) | |    | |___| |____ / ____ \| | \ \                                                                      "
echo " |_____/|_|    |______\_____/_/    \_\_|  \_\             _____                             _      _      _____   "
echo "                                      | | | |            / ____|                           | |    | |    / ____|  "
echo "  _ __   _____      _____ _ __ ___  __| | | |__  _   _  | |  __ _   _ _ __  ______ _ _ __  | |    | |   | |       "
echo " | '_ \ / _ \ \ /\ / / _ \ '__/ _ \/ _. | | '_ \| | | | | | |_ | | | | '_ \|_  / _. | '__| | |    | |   | |       "
echo " | |_) | (_) \ V  V /  __/ | |  __/ (_| | | |_) | |_| | | |__| | |_| | | | |/ / (_| | |    | |____| |___| |____   "
echo " | .__/ \___/ \_/\_/ \___|_|  \___|\__,_| |_.__/ \__, |  \_____|\__,_|_| |_/___\__,_|_|    |______|______\_____|  "
echo " | |                                              __/ |                                                           "
echo " |_|                                             |___/                                                            "
echo "                                                                                                                  "
echo "                                                                                                                  "
echo "                                                                                                                  "
echo "                                                                                                                  "
echo "                                                                                                                  "

# Устанавливаем Node.js и npm
echo " "
echo "[SpecAR-Installer]: (1/9) Downloading Node.js..."
echo " "
sudo apt update
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs


# Устанавливаем Yarn
echo " "
echo "[SpecAR-Installer]: (2/9) Downloading Yarn..."
echo " "

curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update
sudo apt install -y yarn

# Устанавливаем Python
echo " "
echo "[SpecAR-Installer]: (3/9) Downloading Python and other tools..."
echo " "
sudo apt update
sudo apt upgrade
sudo apt install -y python3 python3-venv python3-pip
sudo apt install build-essential cmake -y
sudo apt install libopenblas-dev liblapack-dev -y
sudo apt install pulsemixer network-manager -y
sudo apt install python3-pyaudio -y

# Создаем виртуальное окружение python
echo " "
echo "[SpecAR-Installer]: (4/9) Creating a Python Virtual Environment..."
echo " "

cd "$(dirname "$0")/../core/python"
python3 -m venv venv

# Активируем виртуальное окружение и устанавливаем зависимости
echo " "
echo "[SpecAR-Installer]: (5/9) Installing Python dependencies..."
echo " "

source venv/bin/activate
pip install -r requirements.txt
deactivate

# Устанавливаем права для пользователя gunzar
echo " "
echo "[SpecAR-Installer]: (6/9) Setting access rights for the Gunzar user.."
echo " "
echo 'gunzar ALL=(ALL) NOPASSWD:ALL' | sudo tee -a /etc/sudoers.d/gunzar
sudo chmod 0440 /etc/sudoers.d/gunzar

# Добавляем скрипт ./start.sh в автозапуск
echo " "
echo "[SpecAR-Installer]: (7/9) Adding an application startup script to Autorun.."
echo " "

cd ~/SpecAR/installer
sudo cp specar.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable specar.service
sudo systemctl start specar.service

# Возвращаемся в папку со скриптом и выполняем yarn app:install
cd ~/SpecAR

echo " "
echo "[SpecAR-Installer]: (8/9) Setting permissions for the startup script.."
echo " "

sudo chmod +x start.sh

echo " "
echo "[SpecAR-Installer]: (9/9) Installing dependencies for Electron.js.."
echo " "

yarn app:install

echo " "
echo "[SpecAR-Installer]: Installation completed successfully!"
echo " "
echo "[SpecAR-Installer]: After 3 seconds, the system will reboot!"
echo " "

# Задержка 3 секунд
sleep 3

# Перезапускаем систему
sudo reboot

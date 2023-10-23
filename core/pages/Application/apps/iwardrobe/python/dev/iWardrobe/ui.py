from . import button
from . import utils

import os
import cv2
import json


class iWardrobeUI:
    def __init__(self, assetsFolder: str) -> None:
        # Путь до папки с ресурсами
        self.assetsFolder = assetsFolder

        # Путь до шрифта Montserrat
        self.fontPath = os.path.join(
            self.assetsFolder, 'font/Montserrat-Regular.ttf')

        # Кнопки статического UI
        self.buttons = self._initButtons()

        # Список всех отрисованных кнопок
        self.renderedButtonList = []

        # Константы для разных видов одежды
        self.dataBaseItemOptions = self._initDataBaseItemOptions()

        # База данных ресурсов
        self.dataBase = None

        # Картинка текущего элемента гардероба
        self.currentItemImage = None

        # Путь текущего элемента гардероба
        self.currentItemImagePath = None

        # Выбранный пол
        self.sexCategorySelect = None

        # Индекс категории
        self.itemCategoryIndex = 0

        # Индекс предмета внутри категории
        self.itemIndex = 0

        # Индикатор сброса настроек после ухода пользователя
        self.isSettingReset = False

        # Максимальное время ожидания нажатия
        self.timerClickLimit = 200

        # Скорость добавление времени для нажатия кнопки
        self.timerClickSpeed = 10

        # Возможно ли сейчас отрисовать одежду. Только в том случае, если выбран пол и категория
        self.canDrawItem = False

        # Картинка для информационного окна ожидания
        self.waitImage = None

        # Инициализируем ресурсы
        self._initResources()

    def _initButtons(self):
        """
        Иницизалиция всех статических кнопок
        """
        return {
            'male': button.Button('male',
                                  os.path.join(self.assetsFolder,
                                               'ui/iconMale.png'),
                                  x=100,
                                  y=300,
                                  w=100,
                                  h=100,
                                  action=lambda: self._changeSexCategory('Мужчина')),
            'female': button.Button('female',
                                    os.path.join(self.assetsFolder,
                                                 'ui/iconFemale.png'),
                                    x=250,
                                    y=300,
                                    w=100,
                                    h=100,
                                    action=lambda: self._changeSexCategory('Женщина')),
            'backToSexSelect': button.Button('backToSexSelect',
                                             os.path.join(
                                                 self.assetsFolder, 'ui/iconBack.png'),
                                             x=50,
                                             y=50,
                                             w=64,
                                             h=64,
                                             action=lambda: self._backToSelectSexCategory(),
                                             isCircleProgressBar=True),
            'prevCategory': button.Button('prevCategory',
                                          os.path.join(
                                              self.assetsFolder, 'ui/iconPrevious.png'),
                                          x=150,
                                          y=50,
                                          w=64,
                                          h=64,
                                          action=lambda: self._selectCategory(
                                              -1),
                                          isCircleProgressBar=True),
            'nextCategory': button.Button('nextCategory',
                                          os.path.join(
                                              self.assetsFolder, 'ui/iconNext.png'),
                                          x=250,
                                          y=50,
                                          w=64,
                                          h=64,
                                          action=lambda: self._selectCategory(
                                              1),
                                          isCircleProgressBar=True),
            'prevItem': button.Button('prevItem',
                                      os.path.join(
                                          self.assetsFolder, 'ui/iconPrevious.png'),
                                      x=40,
                                      y=300,
                                      w=64,
                                      h=64,
                                      action=lambda: self._selectItemInCategory(
                                          -1),
                                      isCircleProgressBar=True),
            'nextItem': button.Button('nextItem',
                                      os.path.join(
                                          self.assetsFolder, 'ui/iconNext.png'),
                                      x=320,
                                      y=300,
                                      w=64,
                                      h=64,
                                      action=lambda: self._selectItemInCategory(
                                          1),
                                      isCircleProgressBar=True),
            'buyItem': button.Button('buyItem',
                                     os.path.join(
                                         self.assetsFolder, 'ui/iconBuy.png'),
                                     x=180,
                                     y=610,
                                     w=300,
                                     h=60,
                                     action=lambda: print('BUY - :D')),
        }

    def _selectItemInCategory(self, mode: int):
        """
        Изменение выбранной одежды в пределах категории
        """

        # Ключ текущей категории
        categoryName = list(self.dataBase[self.sexCategorySelect].keys())[
            self.itemCategoryIndex]

        # Размер всего списка категории
        ItemListLen = len(
            self.dataBase[self.sexCategorySelect][categoryName])

        if ItemListLen <= 1:
            return

        # Следующая
        if mode == 1:
            self.itemIndex = (self.itemIndex + 1) % ItemListLen
        # Предыдущая
        elif mode == -1:
            self.itemIndex = (
                self.itemIndex - 1 + ItemListLen) % ItemListLen

    def _selectCategory(self, mode: int):
        """
        Изменение выбранной категории одежды
        """
        # Размер всего словаря категорий
        categoryLen = len(self.dataBase[self.sexCategorySelect])
        if categoryLen <= 1:
            return

        # Следующая
        if mode == 1:
            self.itemCategoryIndex = (self.itemCategoryIndex + 1) % categoryLen
        # Предыдущая
        elif mode == -1:
            self.itemCategoryIndex = (
                self.itemCategoryIndex - 1 + categoryLen) % categoryLen

        # Начинаем с первого элемента в категории
        self.itemIndex = 0

    def _initDataBaseItemOptions(self):
        """
        Инициализация параметров для предметов из базы данных
        """
        return [
            {
                'category': ['Бейсболки'],
                'positionOffset': (65, -170),
                'scaleRatio': 0.8,
                'lmPivotIndex': (5, 2)
            },
            {
                'category': ['Шапки', 'Панамки'],
                'positionOffset': (65, -190),
                'scaleRatio': 0.7,
                'lmPivotIndex': (5, 2)
            },
            {
                'category': ['Маски'],
                'positionOffset': (65, 50),
                'scaleRatio': 1.0,
                'lmPivotIndex': (10, 9)
            },
            {
                'category': ['Шорты', 'Нижнее белье', 'Спортивные шорты'],
                'positionOffset': (50, 70),
                'scaleRatio': 0.58,
                'lmPivotIndex': (24, 23)
            },
            {
                'category': ['Леггинсы', 'Брюки', 'Штаны'],
                'positionOffset': (50, 200),
                'scaleRatio': 1.1,
                'lmPivotIndex': (24, 23)
            },
            {
                'category': ['Платья'],
                'positionOffset': (50, 100),
                'scaleRatio': 0.58,
                'lmPivotIndex': (12, 11)
            },
            {
                'category': ['Бомберы', 'Майки', 'Лонгсливы', 'Толстовки', 'Толстовки с капюшоном', 'Футболки',],
                'positionOffset': (50, 60),
                'scaleRatio': 0.42,
                'lmPivotIndex': (12, 11)
            }
        ]

    def _changeSexCategory(self, category: str):
        """
        Изменение категории пола
        """
        self.itemCategoryIndex = 0
        self.itemIndex = 0
        self.sexCategorySelect = category

    def _backToSelectSexCategory(self):
        """
        Изменение категории пола
        """
        self.sexCategorySelect = None

    def settingsReset(self):
        """"
        Сброс всех настроек, установленных пользователем за текущую сессию
        """
        self.sexCategorySelect = None
        self.itemCategoryIndex = 0
        self.itemIndex = 0

    def _initResources(self):
        """
        Инициализация ресурсов гардероба
        """

        # Изображение для информационно окна ожидания
        waitImg = os.path.join(self.assetsFolder, 'ui/waitPerson.png')
        self.waitImage = cv2.imread(waitImg, cv2.IMREAD_UNCHANGED)

        # Инициализация статического UI

        # Получаем путь до базы данных ресурсов
        dataBasePath = os.path.join(self.assetsFolder, 'iWardrobeData.json')

        # Считываем базу данных
        with open(dataBasePath, 'r') as f:
            self.dataBase = json.load(f)

    def _drawSexSelect(self, frame: cv2.Mat) -> cv2.Mat:
        """
        Отрисовка меню выбора пола
        """
        frame = utils.overlayTextOnFrame(
            frame, 'Укажите ваш пол:', (40, 150), self.fontPath, 30, (255, 255, 255), 1)

        # Мужской пол
        frame = self._addAndDrawButton(frame, 'male')

        # Женский пол
        frame = self._addAndDrawButton(frame, 'female')

        return frame

    def _addAndDrawButton(self, frame: cv2.Mat, buttonID: str) -> cv2.Mat:
        """
        Добавление и отрисовка кнопки
        """
        button = self.buttons[buttonID]
        self.renderedButtonList.append(button)
        return button.draw(frame, self.timerClickLimit)

    def _drawWardobeSelect(self, frame: cv2.Mat) -> cv2.Mat:
        """
        Отрисовка главного меню выбора одежды
        """

        # Кнопка к возврату выбора пола
        frame = self._addAndDrawButton(frame, 'backToSexSelect')

        # Предыдущая категория
        frame = self._addAndDrawButton(frame, 'prevCategory')

        # Следующая категория
        frame = self._addAndDrawButton(frame, 'nextCategory')

        # Название категории
        categoryName = list(self.dataBase[self.sexCategorySelect].keys())[
            self.itemCategoryIndex]
        frame = utils.overlayTextOnFrame(
            frame, f'Категория: {categoryName}', (20, 100), self.fontPath, 15, (255, 255, 255), 1)

        # Предыдущая одежда
        frame = self._addAndDrawButton(frame, 'prevItem')

        # Следующая одежда
        frame = self._addAndDrawButton(frame, 'nextItem')

        # Кнопка покупки
        frame = self._addAndDrawButton(frame, 'buyItem')

        # Информация о цене
        currentItem = self.dataBase[self.sexCategorySelect][categoryName][self.itemIndex]
        price = currentItem['price']
        frame = utils.overlayTextOnFrame(
            frame, f'Цена: {price}', (105, 530), self.fontPath, 25, (255, 255, 255), 1, 'center')
        return frame

    def drawStaticUI(self, frame: cv2.Mat) -> cv2.Mat:
        """
        Отрисовка статичных элементов пользовательского интерфейса, например, кнопок
        """

        # Очищаем список отрисованных кнопок
        self.renderedButtonList.clear()

        # Предоставляем выбор пола
        if self.sexCategorySelect == None:
            self.canDrawItem = False
            frame = self._drawSexSelect(frame)
        else:
            self.canDrawItem = True
            frame = self._drawWardobeSelect(frame)

        return frame

    def drawItemAR(self, frame: cv2.Mat, landMarks: list) -> cv2.Mat:
        """
        Отрисовка элементов гардероба в AR режиме
        """
        # Если сейчас невозможно начать отрисовку, возвращаем кадр без изменений
        if not self.canDrawItem:
            return frame

        # Если пол не выбран, возрващаем кадр без изменений
        if not self.sexCategorySelect:
            return frame

        # Название категории
        categoryName = list(self.dataBase[self.sexCategorySelect].keys())[
            self.itemCategoryIndex]

        # Путь до картинки
        itemImagePath = self.dataBase[self.sexCategorySelect][categoryName][self.itemIndex]['image']
        itemImagePath = os.path.join(self.assetsFolder, itemImagePath)

        # Переменные для сохранения значений из self.dataBaseItemOptions
        positionOffset = None
        scaleRatio = None
        lmPivotIndex = None

        # Подгружаем картинку
        if self.currentItemImagePath != itemImagePath:
            self.currentItemImagePath = itemImagePath
            self.currentItemImage = cv2.imread(
                itemImagePath, cv2.IMREAD_UNCHANGED)

        # Проходим по списку и ищем совпадение в поле 'category'
        for option in self.dataBaseItemOptions:
            if categoryName in option['category']:
                positionOffset = option['positionOffset']
                scaleRatio = option['scaleRatio']
                lmPivotIndex = option['lmPivotIndex']
                break  # Если мы нашли совпадение, прекращаем поиск

        # Если один из параметров так и не был назначен, возможно, у нас не было соответствия
        if positionOffset is None or scaleRatio is None or lmPivotIndex is None:
            print(f"Не найдены параметры для категории {categoryName}")
            return frame  # Возвращаем неизмененный кадр

        # разворачиваем список ключевых точек
        lmPivot1, lmPivot2 = lmPivotIndex

        # разворачиваем список offset
        offsetX, offsetY = positionOffset

        # размеры кадра
        frameHeight, frameWidth, _ = frame.shape

        # Получаем координаты первой точки
        lm1 = landMarks[lmPivot1]
        lm1PosX, lm1PosY = int(lm1.x * frameWidth), int(lm1.y * frameHeight)

        # Получаем координаты второй точки
        lm2 = landMarks[lmPivot2]
        lm2PosX, lm2PosY = int(lm2.x * frameWidth), int(lm2.y * frameHeight)

        # Получаем соотношение расстояния между точек для корректировки размера одежды
        deltaLmScale = ((lm2PosX - lm1PosX)**2 + (lm2PosY - lm1PosY)**2)**0.5
        deltaLmScale = deltaLmScale/100

        # Корректировка смещения от расстояния
        offsetX, offsetY = (offsetX * deltaLmScale, offsetY * deltaLmScale)

        # Вычисляем позицию для одежды
        itemPosX, itemPosY = int(lm1PosX + offsetX), int(lm1PosY + offsetY)

        # Вычисляем размеры для одежды
        defaultItemSize = 500

        itemW = itemH = int(defaultItemSize * scaleRatio * deltaLmScale)

        # Отрисовываем ее
        frame = utils.overlayImagePNG(
            frame, self.currentItemImage, itemPosX, itemPosY, itemW, itemH)

        return frame

    def isCursorOnButton(self, x: int, y: int, button: button.Button) -> bool:
        """
        Проверка кнопки по переданным координатам
        """
        inXRange = int(button.posX - button.width / 2 -
                       10) < x < int(button.posX + button.width / 2 + 10)
        inYRange = int(button.posY - button.height / 2 -
                       10) < y < int(button.posY + button.height / 2 + 10)

        return inXRange and inYRange

    def cursorPosition(self, position: tuple[int, int]):
        """
        Получение координат курсора
        """
        x, y = position

        for btn in self.renderedButtonList:
            if self.isCursorOnButton(x, y, btn):
                btn.isDrawButtonProgress = True

                if btn.clickTimer >= self.timerClickLimit:
                    btn.execAction()
                    btn.clickTimer = 0

                btn.clickTimer += self.timerClickSpeed
            else:
                btn.isDrawButtonProgress = False
                btn.clickTimer = 0

    def waitingUser(self, frame: cv2.Mat):
        """
        Вывод информационного сообщения об ожидании пользователя
        """
        self.canDrawItem = False

        frame = utils.overlayTextOnFrame(
            frame, 'iWardrobe', (45, 100), self.fontPath, 50, (255, 255, 255), 2)

        frame = utils.overlayTextOnFrame(
            frame, 'Поиск человека'.upper(), (30, 210), self.fontPath, 30, (255, 255, 255), 0)

        frame = utils.overlayImagePNG(
            frame, self.waitImage, 170, 400, 256, 256)

        return frame

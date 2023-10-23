from . import button
from . import utils
from fer import FER

import cv2
import os
import enum
import numpy as np


class iFaceMode(enum.Enum):
    NoSelected = 1
    FaceAnalyze = 2
    FaceMakeup = 3


detector = FER(mtcnn=True)


class iFaceUI:
    def __init__(self, assetsFolder: str) -> None:
        # Путь до папки с ресурсами
        self.assetsFolder = assetsFolder

        # Список всех отрисованных кнопок
        self.renderedButtonList = []

        # Кнопки статического UI
        self.buttons = self._initButtons()

        # Максимальное время ожидания нажатия1
        self.timerClickLimit = 200

        # Скорость добавление времени для нажатия кнопки
        self.timerClickSpeed = 10

        # Текущий путь до картинки макияжа
        self.currentItemMakeupImagePath = None

        # Картинка макияжа
        self.currentItemImage = None

        # Путь до шрифта Montserrat
        self.fontPath = os.path.join(
            self.assetsFolder, 'font/Montserrat-Regular.ttf')

        # Текущий режим приложения
        self.mode = iFaceMode.NoSelected

        # Индикатор сброса настроек после ухода пользователя
        self.isSettingReset = False

        # Возможность отрисовки динамичных элементов
        self.canDrawDynamic = False

        # Индекс категории макияжа
        self.makeupCategoryIndex = 0

        # Индекс элемента в категории макияжа
        self.makeupItemIndex = 0

        # Картинка для информационного окна ожидания
        waitImg = os.path.join(self.assetsFolder, 'ui/waitPerson.png')
        self.waitImage = cv2.imread(waitImg, cv2.IMREAD_UNCHANGED)

        # Категории макияжа
        self.makeupDatabase = {
            "Макияж": [
                {"color": (255, 0, 0)},
                {"color": (255, 0, 100)},
                {"color": (0, 200, 0)},
                {"color": (0, 0, 200)},
                {"color": (255, 100, 200)},
            ],
            "Растительность": [
                {'image': 'makeup/beard/1.png', "offset": (0, -10),
                    "size": (512, 427), "scale": 0.22},
                {'image': 'makeup/beard/2.png', "offset": (0, -10),
                    "size": (728, 724), "scale": 0.20},
                {'image': 'makeup/beard/3.png', "offset": (0, 0),
                    "size": (900, 255), "scale": 0.1}
            ],
            "Прически": [
                {'image': 'makeup/hair/2.png', "offset": (-10, 0),
                    "size": (860, 1250), "scale": 0.2},
                {'image': 'makeup/hair/1.png', "offset": (20, 30),
                    "size": (100, 100), "scale": 3.0}

            ]
        }

    def _initButtons(self):
        """
        Иницизалиция всех статических кнопок
        """
        return {
            'back': button.Button('male',
                                  os.path.join(self.assetsFolder,
                                               'ui/iconBack.png'),
                                  x=50,
                                  y=50,
                                  w=64,
                                  h=64,
                                  action=lambda: self._changeMode(
                                      iFaceMode.NoSelected),
                                  isCircleProgressBar=True),
            'analyze': button.Button('male',
                                     os.path.join(self.assetsFolder,
                                                  'ui/faceAnalyze.png'),
                                     x=100,
                                     y=300,
                                     w=100,
                                     h=100,
                                     action=lambda: self._changeMode(iFaceMode.FaceAnalyze)),
            'makeupCatNext': button.Button('male',
                                           os.path.join(self.assetsFolder,
                                                        'ui/iconNext.png'),
                                           x=190,
                                           y=50,
                                           w=64,
                                           h=64,
                                           action=lambda: self._changeModeMakeupCat(
                                               1),
                                           isCircleProgressBar=True),
            'makeupCatPrev': button.Button('male',
                                           os.path.join(self.assetsFolder,
                                                        'ui/iconPrevious.png'),
                                           x=120,
                                           y=50,
                                           w=64,
                                           h=64,
                                           action=lambda: self._changeModeMakeupCat(
                                               -1),
                                           isCircleProgressBar=True),
            'makeupItemNext': button.Button('male',
                                            os.path.join(self.assetsFolder,
                                                         'ui/iconNext.png'),
                                            x=310,
                                            y=320,
                                            w=64,
                                            h=64,
                                            action=lambda: self._changeModeMakeupItem(
                                                1),
                                            isCircleProgressBar=True),
            'makeupItemPrev': button.Button('male',
                                            os.path.join(self.assetsFolder,
                                                         'ui/iconPrevious.png'),
                                            x=50,
                                            y=320,
                                            w=64,
                                            h=64,
                                            action=lambda: self._changeModeMakeupItem(
                                                -1),
                                            isCircleProgressBar=True),
            'makeup': button.Button('male',
                                    os.path.join(self.assetsFolder,
                                                 'ui/faceMakeup.png'),
                                    x=280,
                                    y=300,
                                    w=100,
                                    h=100,
                                    action=lambda: self._changeMode(iFaceMode.FaceMakeup))
        }

    def _changeModeMakeupCat(self, mode: int):
        """
        Изменение выбранной категории
        """
        # Размер всего словаря категорий
        categoryLen = len(self.makeupDatabase)
        if categoryLen <= 1:
            return

        # Следующая
        if mode == 1:
            self.makeupCategoryIndex = (
                self.makeupCategoryIndex + 1) % categoryLen
        # Предыдущая
        elif mode == -1:
            self.makeupCategoryIndex = (
                self.makeupCategoryIndex - 1 + categoryLen) % categoryLen

        # Начинаем с первого элемента в категории
        self.makeupItemIndex = 0

    def _changeModeMakeupItem(self, mode: int):
        """
        Изменение выбранного элемента
        """
        # Размер всего словаря категорий
        catName = list(self.makeupDatabase.keys())[self.makeupCategoryIndex]
        categoryLen = len(self.makeupDatabase[catName])

        if categoryLen <= 1:
            return

        # Следующая
        if mode == 1:
            self.makeupItemIndex = (self.makeupItemIndex + 1) % categoryLen
        # Предыдущая
        elif mode == -1:
            self.makeupItemIndex = (
                self.makeupItemIndex - 1 + categoryLen) % categoryLen

    def _changeMode(self, mode: iFaceMode):
        """
        Изменение категории пола
        """
        self.mode = mode

    def settingsReset(self):
        """"
        Сброс всех настроек, установленных пользователем за текущую сессию
        """
        self.mode = iFaceMode.NoSelected

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

    def drawSelectUI(self, frame: cv2.Mat) -> cv2.Mat:
        """
        Отрисовка меню выбора режима
        """
        frame = utils.overlayTextOnFrame(
            frame, 'Выберите режим:', (40, 150), self.fontPath, 30, (255, 255, 255), 1)

        # Анализ
        frame = self._addAndDrawButton(frame, 'analyze')

        # Макияж
        frame = self._addAndDrawButton(frame, 'makeup')

        return frame

    def drawStaticUI(self, frame: cv2.Mat) -> cv2.Mat:
        """
        Отрисовка статичных элементов пользовательского интерфейса, например, кнопок
        """

        # Очищаем список отрисованных кнопок
        self.renderedButtonList.clear()

        if self.mode == iFaceMode.NoSelected:
            self.canDrawDynamic = False
            frame = self.drawSelectUI(frame)
        else:
            self.canDrawDynamic = True
            frame = self._addAndDrawButton(frame, 'back')

            if self.mode == iFaceMode.FaceAnalyze:
                frame = utils.overlayTextOnFrame(
                    frame, 'Режим: Анализ', (110, 40), self.fontPath, 20, (255, 255, 255), 1)

                frame = utils.overlayTextOnFrame(
                    frame, 'Обнаружены дефекты', (75, 580), self.fontPath, 20, (255, 255, 255), 1)
                frame = utils.overlayTextOnFrame(
                    frame, 'на выделенных областях', (60, 600), self.fontPath, 20, (255, 255, 255), 1)

            if self.mode == iFaceMode.FaceMakeup:
                frame = self._addAndDrawButton(frame, 'makeupCatNext')
                frame = self._addAndDrawButton(frame, 'makeupCatPrev')
                frame = self._addAndDrawButton(frame, 'makeupItemNext')
                frame = self._addAndDrawButton(frame, 'makeupItemPrev')

                frame = utils.overlayTextOnFrame(
                    frame, f'Категория: {list(self.makeupDatabase.keys())[self.makeupCategoryIndex]}', (50, 600), self.fontPath, 20, (255, 255, 255), 1)

        return frame

    def _addAndDrawButton(self, frame: cv2.Mat, buttonID: str) -> cv2.Mat:
        """
        Добавление и отрисовка кнопки
        """
        button = self.buttons[buttonID]
        self.renderedButtonList.append(button)
        return button.draw(frame, self.timerClickLimit)

    def _getSkinColor(self, frame: cv2.Mat, landmarks) -> tuple:
        """
        Возвращает средний цвет кожи на изображении лба.
        """
        # Выбираем интересующую нас точку из landmarks - точка лба
        foreheadPoint = landmarks.landmark[67]
        foreheadX = int(foreheadPoint.x * frame.shape[1])
        foreheadY = int(foreheadPoint.y * frame.shape[0])

        # Определяем размер прямоугольника вокруг лба
        rectSize = 20

        # Вычисляем координаты углов прямоугольника
        startX = max(0, foreheadX - rectSize)
        startY = max(0, foreheadY - rectSize)
        endX = min(frame.shape[1] - 1, foreheadX + rectSize)
        endY = min(frame.shape[0] - 1, foreheadY + rectSize)

        # Обрезаем изображение до области лба
        foreheadFrame = frame[startY:endY, startX:endX]

        # Конвертируем изображение в HSV
        hsv = cv2.cvtColor(foreheadFrame, cv2.COLOR_BGR2HSV)

        # Определяем диапазон цветов для детекции кожи
        lowerSkin = np.array([0, 20, 70], dtype=np.uint8)
        upperSkin = np.array([20, 255, 255], dtype=np.uint8)

        # Применяем маску кожи
        mask = cv2.inRange(hsv, lowerSkin, upperSkin)

        # Применяем маску к изображению лба
        skin = cv2.bitwise_and(foreheadFrame, foreheadFrame, mask=mask)

        # Вычисляем средний цвет кожи лба
        avgColor = cv2.mean(skin, mask=mask)
        # Преобразуем в кортеж целых чисел
        avgColor = tuple(map(int, avgColor))

        return avgColor

    def _analyzeSkin(self, frame: cv2.Mat, landmarks):
        """
        Анализ кожи
        """
        points = [landmark for landmark in landmarks.landmark]

        coords = [(int(point.x * frame.shape[1]), int(point.y * frame.shape[0]))
                  for point in points]

        hull = cv2.convexHull(np.array(coords))

        mask = np.zeros(frame.shape[:2], dtype=np.uint8)

        cv2.drawContours(mask, [hull], 0, 255, -1)

        face_region = cv2.bitwise_and(frame, frame, mask=mask)

        gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 127, 255, 0)

        contours, _ = cv2.findContours(
            thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours:
            area = cv2.contourArea(contour)
            if 5 < area < 100:
                (x, y, w, h) = cv2.boundingRect(contour)
                centerX = x + w // 2
                centerY = y + h // 2
                radius = w // 2
                if radius > 10:
                    continue
                cv2.circle(frame, (centerX, centerY), radius, (0, 255, 0), 2)

        return frame

    def _getFaceEmotion(self, frame: cv2.Mat):
        """
        Анализ эмоций
        """
        # Словарь для перевода эмоций с английского на русский
        emotionsDict = {"angry": "Злость",
                        "disgust": "Отвращение",
                        "fear": "Страх",
                        "happy": "Счастье",
                        "sad": "Грусть",
                        "surprise": "Удивление",
                        "neutral": "Нейтральный"}

        # Преобразование изображения в BGR, если это необходимо
        if len(frame.shape) > 2 and frame.shape[2] != 3:
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        else:
            frame_bgr = frame

        # Распознавание эмоций на лице
        emotions = detector.detect_emotions(frame_bgr)

        # Сохраняет последнюю найденную эмоцию
        emotionText = None
        for emotion in emotions:
            emotionText = max(emotion["emotions"], key=emotion["emotions"].get)

        # Возвращает название эмоции на русском языке
        return emotionsDict.get(emotionText, "Неизвестная эмоция")

    def drawFaceAnalyze(self, frame: cv2.Mat, landmarks) -> cv2.Mat:
        """
        Отрисовка режима анализа
        """
        if not self.canDrawDynamic:
            return frame

        # Получаем координаты носа
        nosePoint = landmarks.landmark[4]
        noseX = int(nosePoint.x * frame.shape[1]) + 15
        noseY = int(nosePoint.y * frame.shape[0])

        # Определение размера прямоугольника
        sizeSkinColorRec = 20

        # Вычисление вертикального смещения, пропорционального размеру лица
        faceHeight = max(point.y for point in landmarks.landmark) - \
            min(point.y for point in landmarks.landmark)
        # Смещение прямоугольника вверх на 20% от высоты лица
        offsetY = int(faceHeight * frame.shape[0] * 1.2)

        # Обеспечение того, чтобы прямоугольник оставался в рамках кадра
        startX = max(0, noseX - sizeSkinColorRec)
        startY = max(0, noseY - sizeSkinColorRec - offsetY)
        endX = min(frame.shape[1] - 1, noseX + sizeSkinColorRec)
        endY = min(frame.shape[0] - 1, noseY + sizeSkinColorRec - offsetY)

        # Получение среднего цвета кожи
        avgColor = self._getSkinColor(frame, landmarks)

        # Рисование прямоугольника
        # -1, чтобы заполнить прямоугольник
        frame = cv2.rectangle(frame, (startX, startY),
                              (endX, endY), avgColor, -1)
        frame = cv2.rectangle(frame, (startX, startY),
                              (endX, endY), (0, 0, 0), 1)

        # Текст
        frame = utils.overlayTextOnFrame(
            frame, "Цвет", (startX - 5, startY - 30), self.fontPath, 20, (255, 255, 255))

        # Эмоции
        emotionText = self._getFaceEmotion(frame)
        frame = utils.overlayTextOnFrame(
            frame, f"Эмоция: {emotionText}", (startX - 70, startY - 50), self.fontPath, 15, (255, 255, 255))

        # Дефекты кожи
        frame = self._analyzeSkin(frame, landmarks)
        return frame

    def drawFaceMakeup(self, frame: cv2.Mat, landmarks) -> cv2.Mat:
        if not self.canDrawDynamic:
            return frame

        catName = list(self.makeupDatabase.keys())[self.makeupCategoryIndex]
        item = self.makeupDatabase[catName][self.makeupItemIndex]

        if catName == "Прически":
            # Путь до картинки
            itemImagePath = item['image']
            itemImagePath = os.path.join(self.assetsFolder, itemImagePath)

            # Подгружаем картинку
            if self.currentItemMakeupImagePath != itemImagePath:
                self.currentItemMakeupImagePath = itemImagePath
                self.currentItemImage = cv2.imread(
                    itemImagePath, cv2.IMREAD_UNCHANGED)

            nosePoint = landmarks.landmark[4]
            noseX = int(nosePoint.x * frame.shape[1])
            noseY = int(nosePoint.y * frame.shape[0])

            itemSizeX, itemSizeY = item['size']
            itemOffset = item['offset']
            itemScale = item['scale']

            width = int(itemSizeX * itemScale)
            height = int(itemSizeY * itemScale)

            # Накладываем изображение
            frame = utils.overlayImagePNG(
                frame, self.currentItemImage, noseX - itemOffset[0], noseY - itemOffset[1], width, height)

        if catName == "Растительность":
            # Путь до картинки
            itemImagePath = item['image']
            itemImagePath = os.path.join(self.assetsFolder, itemImagePath)

            # Подгружаем картинку
            if self.currentItemMakeupImagePath != itemImagePath:
                self.currentItemMakeupImagePath = itemImagePath
                self.currentItemImage = cv2.imread(
                    itemImagePath, cv2.IMREAD_UNCHANGED)

            upperLipPoint = landmarks.landmark[13]
            lipX = int(upperLipPoint.x * frame.shape[1])
            lipY = int(upperLipPoint.y * frame.shape[0])

            itemSizeX, itemSizeY = item['size']
            itemOffset = item['offset']
            itemScale = item['scale']

            width = int(itemSizeX * itemScale)
            height = int(itemSizeY * itemScale)

            # Накладываем изображение
            frame = utils.overlayImagePNG(
                frame, self.currentItemImage, lipX - itemOffset[0], lipY - itemOffset[1], width, height)

        if catName == "Макияж":
            color = item['color']

            # Create an empty mask with the same dimensions as the original frame
            mask = np.zeros_like(frame)

            # Points for upper lip
            upper_lip_points = [61, 185, 40, 39,
                                37, 0, 267, 269, 270, 409, 291]
            lip_points = []
            for point in upper_lip_points:
                lip_point = landmarks.landmark[point]
                lipX = int(lip_point.x * frame.shape[1])
                lipY = int(lip_point.y * frame.shape[0])
                lip_points.append((lipX, lipY))

            # Points for lower lip
            lower_lip_points = [146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
            for point in lower_lip_points:
                lip_point = landmarks.landmark[point]
                lipX = int(lip_point.x * frame.shape[1])
                lipY = int(lip_point.y * frame.shape[0])
                lip_points.append((lipX, lipY))

            # Create a polygon from the points and fill it with color
            cv2.fillPoly(mask, np.array([lip_points], dtype=np.int32), color)

            # Merge the mask and the frame using alpha blending
            alpha = 0.3  # Define the transparency factor
            frame = cv2.addWeighted(mask, alpha, frame, 1 - alpha, 0)
        return frame

    def render(self, frame: cv2.Mat, landmarks, mpDrawing) -> cv2.Mat:
        """
        Отрисовка приложения
        """
        match self.mode:
            case iFaceMode.FaceAnalyze:
                frame = self.drawFaceAnalyze(frame, landmarks=landmarks)
            case iFaceMode.FaceMakeup:
                frame = self.drawFaceMakeup(frame, landmarks=landmarks)

        return frame

    def waitingUser(self, frame: cv2.Mat):
        """
        Вывод информационного сообщения об ожидании пользователя
        """
        self.canDrawDynamic = False

        frame = utils.overlayTextOnFrame(
            frame, 'iFace', (110, 100), self.fontPath, 50, (255, 255, 255), 2)

        frame = utils.overlayTextOnFrame(
            frame, 'Поиск человека'.upper(), (30, 210), self.fontPath, 30, (255, 255, 255), 0)

        frame = utils.overlayImagePNG(
            frame, self.waitImage, 170, 400, 256, 256)

        return frame

from iWardrobe.ui import iWardrobeUI

import cv2
import mediapipe as mp
import iWardrobe.utils as iUtils
import sys

# Получаем путь к ресурсам
resourcesFolderPath = sys.argv[1]

# Получаем видео с камеры
cap = cv2.VideoCapture(0)

# MediaPipe
mpDrawing = mp.solutions.drawing_utils
mpPose = mp.solutions.pose

# Устанавливаем максимальное разрешение
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)

# Объект пользовательского интерфейса
panelUI = iWardrobeUI(assetsFolder=resourcesFolderPath)

# Время, когда пользователя нет перед зеркалом
timerWithoutUser = 0

# Максимальное время без пользователя
timerWithoutUserLimit = 200

# Возможность отрисовки статического UI
canDrawStaticUI = True

# Инициализация модели определения позы
with mpPose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while True:
        success, frame = cap.read()

        # Вычисляем координаты для обрезки
        start_row, start_col = int(
            (frame.shape[0] - 360) / 2), int((frame.shape[1] - 640) / 2)

        # Обрезаем кадр до размера 640x360
        frame = frame[start_row:start_row + 360, start_col:start_col + 640]

        # Поворачиваем кадр на 90 градусов влево и отражаем по горизонтали
        frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        frame = cv2.flip(frame, 1)

        if not success:
            print('Не удалось считать кадр')
            break

        # Обработка изображения
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame.flags.writeable = False
        frameHeight, frameWidth, _ = frame.shape

        # Определение позы
        results = pose.process(frame)

        # Визуализация результатов
        frame.flags.writeable = True
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        # UI
        if results.pose_landmarks:
            # Обнуляем таймер ожидания пользователя
            timerWithoutUser = 0

            # Возвращаем индикатор сброса настроек в положение по умолчанию
            panelUI.isSettingReset = False

            # Разрешаем рисовать статический UI
            if not canDrawStaticUI:
                canDrawStaticUI = True

            for landmark in results.pose_landmarks.landmark:
                # проверяем видимость точки
                if landmark.visibility > 0.5:
                    x = int(landmark.x * frameWidth)
                    y = int(landmark.y * frameHeight)

                    # Координаты кисти правой руки как курсора
                    if landmark == results.pose_landmarks.landmark[19]:
                        iUtils.drawCursor(frame=frame, position=(x, y), colorRGB=(
                            250, 0, 0), radius=5, thickness=-1)

                        # Передаем координаты курсора
                        panelUI.cursorPosition((x, y))

                    # Рисуем основное UI
                    frame = panelUI.drawItemAR(
                        frame, results.pose_landmarks.landmark)
        else:
            # Проверяем сколько времени без пользователя
            if timerWithoutUser >= timerWithoutUserLimit:
                # Рисуем информационное сообщение
                frame = panelUI.waitingUser(frame)

                # Запрещаем рисовать статический UI
                if canDrawStaticUI:
                    canDrawStaticUI = False

                # Если настройки еще не сброшены - сбрасываем
                if not panelUI.isSettingReset:
                    panelUI.settingsReset()
                    panelUI.isSettingReset = True
            else:
                timerWithoutUser += 1

        # Отрисовка статисческих элементов управления
        if canDrawStaticUI:
            frame = panelUI.drawStaticUI(frame)

        # Для разработки - увеличиваем размер окна
        frame = cv2.resize(frame, (480, 854))

        cv2.imshow('iWardrobe', frame)
        cv2.waitKey(1)

cap.release()

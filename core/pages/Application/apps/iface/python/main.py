import cv2
import threading
import mediapipe as mp
import sys
from iFace.ui import iFaceUI
from iFace.utils import drawCursor

from flask import Flask, Response

# Захват видео с камеры
cap = cv2.VideoCapture(0)

# MediaPipe
mpDrawing = mp.solutions.drawing_utils
mpPose = mp.solutions.pose.Pose(
    min_detection_confidence=0.3, min_tracking_confidence=0.3)
mpFace = mp.solutions.face_mesh.FaceMesh(
    min_detection_confidence=0.5, min_tracking_confidence=0.5)

# Устанавливаем максимальное разрешение
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 400)

# Получаем путь к ресурсам
resourcesFolderPath = sys.argv[1]


# Объект пользовательского интерфейса
panelUI = iFaceUI(assetsFolder=resourcesFolderPath)


if not cap.read()[0]:
    cap = cv2.VideoCapture(0)

if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")

app = Flask(__name__)

outputFrame = None
lock = threading.Lock()
status = "default"


def webcamCapture():
    # Время, когда пользователя нет перед зеркалом
    timerWithoutUser = 0

    # Максимальное время без пользователя
    timerWithoutUserLimit = 200

    # Возможность отрисовки статического UI
    canDrawStaticUI = True

    global outputFrame
    while cap.isOpened():
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

        # Применяем модели
        poseResults = mpPose.process(frame)
        faceResults = mpFace.process(frame)

        # Визуализация результатов
        frame.flags.writeable = True
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        # Если найдены позы, рисуем их на кадре
        if poseResults.pose_landmarks:
            for landmark in poseResults.pose_landmarks.landmark:
                # проверяем видимость точки
                if landmark.visibility > 0.5:
                    x = int(landmark.x * frameWidth)
                    y = int(landmark.y * frameHeight)

                    # Координаты кисти правой руки как курсора
                    if landmark == poseResults.pose_landmarks.landmark[19]:
                        drawCursor(frame=frame, position=(x, y), colorRGB=(
                            250, 0, 0), radius=5, thickness=-1)

                        # Передаем координаты курсора
                        panelUI.cursorPosition((x, y))
                        break

        # Если найдены лица, рисуем их на кадре
        if faceResults.multi_face_landmarks:
            # Обнуляем таймер ожидания пользователя
            timerWithoutUser = 0

            # Возвращаем индикатор сброса настроек в положение по умолчанию
            panelUI.isSettingReset = False

            # Разрешаем рисовать статический UI
            if not canDrawStaticUI:
                canDrawStaticUI = True

            for face_landmarks in faceResults.multi_face_landmarks:
                frame = panelUI.render(frame, face_landmarks, mpDrawing)
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

        with lock:
            outputFrame = frame.copy()


def generateClientFrame():
    global outputFrame, lock
    while True:
        with lock:
            # Проверяем доступен ли следующий кадр
            if outputFrame is None:
                continue

            # кодируем в формат JPEG
            (flag, encodedImage) = cv2.imencode(".jpg", outputFrame)

            # Проверяем насколько успешно закодировалось
            if not flag:
                continue
        # Создаем кадр для клиента
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' +
               bytearray(encodedImage) + b'\r\n')


# Путь для получения потока с камеры
@app.route("/")
def video_feed():
    return Response(generateClientFrame(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")


if __name__ == "__main__":
    t = threading.Thread(target=webcamCapture)
    t.daemon = True
    t.start()

    # Запускаем сервер
    app.run(host="localhost", port=12345, debug=True,
            threaded=True, use_reloader=False)

    # Освобождаем камеру
    cap.release()

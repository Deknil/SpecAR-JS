import cv2
import traceback
from . import utils


class Button:
    def __init__(self, id: str, iconPath: str, x: int, y: int, w: int, h: int, action, isCircleProgressBar: bool = False):
        self.id = id
        self.icon = cv2.imread(iconPath, cv2.IMREAD_UNCHANGED)
        self.posX = x
        self.posY = y
        self.width = w
        self.height = h
        self.action = action
        self.isCircleProgressBar = isCircleProgressBar
        self.isDrawButtonProgress = False

        self.clickTimer = 0

    def drawProgressBarRect(self, frame: cv2.Mat, progress: float) -> cv2.Mat:
        """
        Отрисовка прямоугольного прогресс-бара
        """
        recStartX, recStartY = int(
            self.posX - self.width / 2 - 10), int(self.posY + self.height / 2)
        recEndX, recEndY = int(recStartX + progress * 120), int(recStartY + 10)
        cv2.rectangle(frame, (recStartX, recStartY),
                      (recEndX, recEndY), (50, 255, 150), cv2.FILLED)

        return frame

    def drawProgressBarCircle(self, frame: cv2.Mat, progress: float) -> cv2.Mat:
        """
        Отрисовка круглого прогресс-бара
        """
        cv2.ellipse(frame, (self.posX, self.posY), (self.width - 25,
                    self.height - 25), 0, 0, int(progress * 360), (50, 255, 150), 10)

        return frame

    def draw(self, frame: cv2.Mat, timerLimit: int) -> cv2.Mat:
        """
        Отрисовка кнопки
        """
        frame = utils.overlayImagePNG(
            frame, self.icon, self.posX, self.posY, self.width, self.height)

        if self.isDrawButtonProgress:
            progress = self.clickTimer / timerLimit

            if self.isCircleProgressBar:
                frame = self.drawProgressBarCircle(frame, progress)
            else:
                frame = self.drawProgressBarRect(frame, progress)

        return frame

    def execAction(self):
        """
        Выполнение функции callback
        """
        try:
            self.action()
        except Exception as e:
            print(f'Произошла ошибка при выполнении функции кнопки!\n'
                  f'Type of error: {type(e).__name__}\n'
                  f'Error message: {e}')
            traceback.print_exc()

from numba import njit
from PIL import ImageFont, ImageDraw, Image
import cv2
import numpy as np


class FontCache:
    """
    Кэширование шрифтов
    """

    def __init__(self):
        self.fonts = {}

    def getFont(self, font_path, font_size):
        """
        Получение шрифта из кэша
        """
        key = (font_path, font_size)
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(*key)
        return self.fonts[key]


fontCache = FontCache()


@njit
def applyOverlay(background: cv2.Mat, overlay: cv2.Mat, overlayAlpha, startX, startY, endX, endY, overlayStartX, overlayStartY, overlayEndX, overlayEndY) -> cv2.Mat:
    """
    Применение изменений кадра с наложенным изображением
    """
    for c in range(0, 3):
        background[startY:endY, startX:endX, c] = (
            overlayAlpha * overlay[overlayStartY:overlayEndY, overlayStartX:overlayEndX, c] +
            (1 - overlayAlpha) * background[startY:endY, startX:endX, c]
        )
    return background


def overlayTextOnFrame(frame: cv2.Mat, text: str, position: tuple[int, int], fontPath: str, fontSize: int,
                       fillColor: tuple[int, int, int] = (255, 255, 255), strokeWidth: int = 1, align: str = 'left') -> cv2.Mat:
    """
    Отрисовка текста с пользовательским шрифтом
    """

    # Конвертация в систему RGB
    cv2RgbImage = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Трансформируем кадр для PIL
    pilImage = Image.fromarray(cv2RgbImage)

    imageDrawer = ImageDraw.Draw(pilImage)

    # Загружаем шрифт
    textFont = fontCache.getFont(fontPath, fontSize)

    # Отрисовываем изображения
    imageDrawer.text(position, text, font=textFont,
                     fill=fillColor, stroke_width=strokeWidth, align=align)

    # Конвертируем обратно в кадр для cv
    return cv2.cvtColor(np.array(pilImage), cv2.COLOR_RGB2BGR)


def drawCursor(frame: cv2.Mat, position: tuple[int, int], colorRGB: tuple[int, int, int], radius: int, thickness: int):
    """
    Отрисовка курсора на кадр (frame) по заданным координатам
    """
    x, y = position

    colorBGR = (colorRGB[2], colorRGB[1], colorRGB[0])

    cv2.circle(frame, (x, y), radius=radius,
               color=colorBGR, thickness=thickness)


def overlayImagePNG(background: cv2.Mat, overlay: cv2.Mat, x: int, y: int, width: int, height: int) -> cv2.Mat:
    """
    Наложение изображения на переданный кадр (frame)
    """
    try:
        overlay = cv2.resize(overlay, (width, height))

        # Получаем альфа канал
        if overlay.shape[2] < 4:
            raise ValueError("Overlay image does not have an alpha channel")

        overlayAlpha = overlay[:, :, 3] / 255.0

        # Вычисляем позицию изображения в кадре
        startX, startY = x - width // 2, y - height // 2
        endX, endY = startX + width, startY + height

        # Обрезаем часть изображения, выходящего за границы
        overlayStartX = max(0, -startX)
        overlayStartY = max(0, -startY)
        overlayEndX = min(overlay.shape[1], background.shape[1] - startX)
        overlayEndY = min(overlay.shape[0], background.shape[0] - startY)

        startX = max(0, startX)
        startY = max(0, startY)
        endX = min(background.shape[1], endX)
        endY = min(background.shape[0], endY)

        # Проверяем, что изображение не выходит за границы кадра
        if overlayStartX < overlayEndX and overlayStartY < overlayEndY:
            # Получаем прозрачность границы
            overlayAlpha = overlayAlpha[overlayStartY:overlayEndY,
                                        overlayStartX:overlayEndX]

            # Накладываем изображение
            background = applyOverlay(background, overlay, overlayAlpha, startX, startY,
                                      endX, endY, overlayStartX, overlayStartY, overlayEndX, overlayEndY)

    except Exception as e:
        print(f"Ошибка наложения изображения: {e}")
        print(
            f"Размер кадра: {background.shape}, Размер изображения: {overlay.shape}, Позиция: {(x, y)}, Размер: {(width, height)}")
        raise

    return background

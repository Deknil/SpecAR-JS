import cv2
import sys
import os

def main():
    script_dir = os.path.dirname(os.path.realpath(__file__))
    model_path = os.path.join(script_dir, 'models', 'haarcascade_frontalface_default.xml')

    # Создаем каскад Хаара для распознавания лица
    face_cascade = cv2.CascadeClassifier(model_path)

    # Входной путь файла
    imagePath = sys.argv[1]

    # Загружаем изображение
    img = cv2.imread(imagePath)

    # Проверяем, успешно ли загружено изображение
    if img is None:
        print(f"Failed to load image from {imagePath}")
        sys.exit(1)

    # Преобразуем изображение в оттенки серого
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Распознаем лица на изображении с измененными параметрами
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=8)

    # Отступы от лица
    padding = 100

    # Размер выходного изображения
    target_size = (512, 512)

    if len(faces) == 1:
        x, y, w, h = faces[0]
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(img.shape[1], x + w + padding)
        y2 = min(img.shape[0], y + h + padding)
        cropped_img = img[y1:y2, x1:x2]
        resized_img = cv2.resize(cropped_img, target_size)
        cv2.imwrite(imagePath, resized_img)
    else:
        # Обрезаем изображение до размеров 512x512 относительно центра
        height, width = img.shape[:2]
        cx, cy = width // 2, height // 2
        x1, y1 = max(0, cx - 256), max(0, cy - 256)
        x2, y2 = min(width, cx + 256), min(height, cy + 256)
        cropped_img = img[y1:y2, x1:x2]
        cv2.imwrite(imagePath, cropped_img)

    sys.exit(0)

if __name__ == "__main__":
    main()
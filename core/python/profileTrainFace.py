import os
import pickle
import sys
import face_recognition
import argparse
import cv2

# Максимальное количество изображений для обработки
IMG_MAX_COUNT = 15

def trainModel(outDir='dataset', profileID="Guest"):
    os.makedirs(outDir, exist_ok=True)

    knownEncodings = []
    images = os.listdir('temp/trainModelProfileFace')

    for image in images:
        if os.path.isdir(image):
            continue

        faceImg = face_recognition.load_image_file(f'temp/trainModelProfileFace/{image}')
        face_encodings = face_recognition.face_encodings(faceImg)

        if face_encodings:
            faceEncoding = face_encodings[0]
            match = any(face_recognition.compare_faces([faceEncoding], knownEncoding) for knownEncoding in knownEncodings)

            if not match:
                knownEncodings.append(faceEncoding)

    data = {
        "name": profileID,
        "encodings": knownEncodings
    }

    outModelPath = f'{outDir}/{profileID}_encodings.pickle'

    # Сохранение файла с данными лиц
    with open(outModelPath, 'wb') as file:
        file.write(pickle.dumps(data))

    # Удаление временных картинок
    for image in images:
        os.remove(f'temp/trainModelProfileFace/{image}')

    print(outModelPath)

def rotate_and_resize_image(image, angle):
    height, width = image.shape[:2]
    image_center = (width // 2, height // 2)
    rotation_matrix = cv2.getRotationMatrix2D(image_center, angle, 1.0)

    abs_cos = abs(rotation_matrix[0, 0])
    abs_sin = abs(rotation_matrix[0, 1])

    # Вычисление новых размеров изображения после поворота
    new_width = int(height * abs_sin + width * abs_cos)
    new_height = int(height * abs_cos + width * abs_sin)

    # Обновление матрицы поворота
    rotation_matrix[0, 2] += (new_width / 2) - image_center[0]
    rotation_matrix[1, 2] += (new_height / 2) - image_center[1]

    rotated_image = cv2.warpAffine(image, rotation_matrix, (new_width, new_height))

    return cv2.resize(rotated_image, (720, 1280), interpolation=cv2.INTER_AREA)

def takeScreenshotFromWebcam(modelName='Guest'):
    # Инициализация потока видео с веб-камеры
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print(f"Cannot open webcam")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    multiplier = fps * 2
    count = 0
    frameId = 0

    # Создание временной директории
    os.makedirs('temp/trainModelProfileFace', exist_ok=True)

    while count < IMG_MAX_COUNT:
        ret, frame = cap.read()

        if not ret:
            print('Can\'t get the frame')
            break

        if frameId % multiplier == 0:
            final_frame = rotate_and_resize_image(frame, -90)
            cv2.imwrite(f"temp/trainModelProfileFace/dataset_face_recognition_{modelName}_{count}.jpg", final_frame)
            count += 1

        frameId += 1

    cap.release()
    cv2.destroyAllWindows()

def main():
    parser = argparse.ArgumentParser(description='Face Recognition model training')
    parser.add_argument('modelName', type=str, help='Model name')
    parser.add_argument('profileID', type=str, help='ID of the profile for which the training is taking place')
    parser.add_argument('datasetPath', type=str, help='Dataset output path')
    args = vars(parser.parse_args())

    takeScreenshotFromWebcam(modelName=args['modelName'])
    trainModel(profileID=args['profileID'], outDir=args['datasetPath'])

if __name__ == '__main__':
    main()

import face_recognition
import numpy as np
import os
import pickle
import argparse

def detectFace(imgPath = None):
    script_dir = os.path.dirname(os.path.realpath(__file__))

    if imgPath == None:
        return
        
    # Загрузить все обученные модели из папки профиля
    datasetPath = os.path.join(script_dir, '../../data/profiles/face_model')

    # Массив подгруженных обученных моделей
    models = []

    # Массив с распознанными лицами
    faceDetected = []

    for modelName in os.listdir(datasetPath):
        modelPath = os.path.join(datasetPath, modelName)
        with open(modelPath, 'rb') as f:
            data = pickle.load(f)
            name = data["name"]
            encodings = np.array(data["encodings"])
            models.append((name, encodings))

    # Загрузка изображения для обработки
    image = face_recognition.load_image_file(imgPath)

    # Определение местоположения и кодировок лиц на изображении
    faceLocation = face_recognition.face_locations(image)
    faceEncodings = face_recognition.face_encodings(image, faceLocation)

    for faceEncoding in faceEncodings:
        # Сравнение кодировки лица с обученными моделями
        matchDistance = 1.0

        for name, encodings in models:
            distances = face_recognition.face_distance(encodings, faceEncoding)
            minDistance = min(distances)

            if minDistance > matchDistance:
                continue

            # Вычисление процента совпадения
            matchPercentage = (1.0 - minDistance) * 100

            # Проверка, определила ли модель какое-либо имя
            if matchPercentage < 40:
                continue

            if matchPercentage > 40:
                faceDetected.append(name)
    
    if (len(faceDetected) > 0):
        print(faceDetected[0])

def main():
    parser = argparse.ArgumentParser(description='Auto Detect Profile')
    parser.add_argument('imagePath', type=str, help='Image path')
    args = vars(parser.parse_args())

    detectFace(imgPath=args['imagePath'])

if __name__ == "__main__":
    main()
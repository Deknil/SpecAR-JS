from flask import Flask, jsonify, request
from threading import Lock, Condition, Thread
from queue import Queue
import speech_recognition as sr

app = Flask(__name__)

r = sr.Recognizer()
r.pause_threshold = 0.5

# Создаем очередь и условную переменную
queue = Queue()
condition = Condition(Lock())

# Маршрут для получения данных с сервера


@app.route('/assistant', methods=['GET'])
def assistant():
    with condition:
        # Ждем, пока в очереди не появятся данные
        while queue.empty():
            condition.wait()
        # Извлекаем данные из очереди
        data = queue.get()
    return jsonify(data), 200

# Распознавание голоса


def listenCommand():
    # Запускаем цикл
    while True:
        try:
            # Включаем микрофон
            with sr.Microphone() as mic:
                r.adjust_for_ambient_noise(
                    source=mic, duration=0.5)  # фильтруем шумы
                audio = r.listen(mic)  # слушаем микрофон

                # распознаем голос через гугл
                query = r.recognize_google(audio, language='ru-RU').lower()
                with condition:
                    queue.put(query)  # добавляем данные в очередь для клиента

                    # Сигнализируем о появлении новых данных
                    condition.notify_all()
                print(query)
        except sr.UnknownValueError:
            query = 'Ошибка - Google Web Speech API не понял аудио'
        except sr.RequestError:
            query = 'Ошибка - Не удалось запросить результаты у сервиса Google Web Speech API'


if __name__ == "__main__":
    t = Thread(target=listenCommand)
    t.daemon = True
    t.start()
    app.run(host="localhost", port=11111, debug=True,
            threaded=True, use_reloader=False)

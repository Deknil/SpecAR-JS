# SpecAR

SpecAR is an open source modular smart mirror platform developed by Gunzar LLC. This application is built on the principle of modularity, which allows users to expand the basic functionality of the application infinitely.

# Installation

To install the application, run the following commands one by one:

1. Clone the repository:

```bash
$ git clone https://github.com/CodeMacon/SpecAR-JS.git
```

2. Go to the folder with the installation script:

```bash
$ cd ~/SpecAR/installer
```

3. Set the permissions to run the installation script:

```bash
$ chmod +x install.sh
```

4. Run the installation script:

```bash
$ ./install.sh
```

After performing all the steps described above, Node will be installed on your system.js, yarn and python are the latest versions. In addition, the `specar.service` service will be added to the autorun, which will allow the application to start when the system starts

# Launching the application

If for some reason the autorun of the application does not work, you can run it through a special script `start.sh` by executing the following commands:

1.  Go to the folder with the start script:

```bash
$ cd ~/SpecAR
```

2. Grant the script launch permissions:

```bash
$ chmod +x start.sh
```

3. Run the script

```bash
$ ./start.sh
```

# API

`TODO`

# License

This project is licensed under the `GNU GPL3 License`.

# Contributing

We welcome contributions from the community. If you want to contribute, please fork the repository and create a pull request with your changes.

# Credits

This project makes use of the following open-source libraries:

Python libraries:

-   [**Flask**](https://flask.palletsprojects.com/) by the Pallets Team, licensed under the `BSD-3-Clause License`.
-   [**SpeechRecognition**](https://pypi.org/project/SpeechRecognition/) by Anthony Zhang (Uberi), licensed under the `BSD-3-Clause License`.
-   [**face_recognition**](https://github.com/ageitgey/face_recognition) by Adam Geitgey, licensed under the `MIT License`.
-   [**NumPy**](https://numpy.org/) by the NumPy Developers, licensed under the `BSD License`.
-   [**OpenCV**](https://opencv.org/) by OpenCV team, licensed under the `Apache 2 License`.
-   [**numba**](https://github.com/numba/numba) by the Numba Developers, licensed under the `BSD 2-Clause "Simplified" License`.
-   [**Pillow**](https://pillow.readthedocs.io/en/stable/) by Alex Clark and Contributors, licensed under the open source `HPND License`.
-   [**mediapipe**](https://github.com/google/mediapipe) by Google, licensed under the `Apache License 2.0`.

Node.js libraries:

-   [**axios**](https://github.com/axios/axios) by the Axios team, licensed under the `MIT License`.
-   [**cross-env**](https://github.com/kentcdodds/cross-env) by Kent C. Dodds, licensed under the `MIT License`.
-   [**electron**](https://electronjs.org) by the Electron team, licensed under the `MIT License`.
-   [**fast-levenshtein**](https://github.com/hiddentao/fast-levenshtein) by Ramesh Nair, licensed under the `MIT License`.
-   [**moment**](https://momentjs.com/) by the Moment.js team, licensed under the `MIT License`.
-   [**morphdom**](https://github.com/patrick-steele-idem/morphdom) by Patrick Steele-Idem, licensed under the `MIT License`.
-   [**nunjucks**](https://mozilla.github.io/nunjucks/) by Mozilla, licensed under the `BSD 2-Clause License`.
-   [**winston**](https://github.com/winstonjs/winston) by the Winston team, licensed under the `MIT License`.
-   [**electron-reloader**](https://github.com/sindresorhus/electron-reloader) by Sindre Sorhus, licensed under the `MIT License`.`

Our heartfelt thanks to the developers and communities who maintain these projects.

# Contacts

Email: gunzar@list.ru
Website: [**Gunzar Technologies**](https://gunzar.tech/)

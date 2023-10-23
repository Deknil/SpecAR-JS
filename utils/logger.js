const { createLogger, format, transports } = require('winston');
const moment = require('moment');

const newFormat = format.printf(({ level, message, title }) => {
    return `${moment().format('DD-MM-YYYY HH:mm:ss')} | ${level.toLocaleUpperCase()} | [${title}] -> ${message}`;
});

const logFileName = `./log/log-${moment().format('DD-MM-YYYY')}.log`;
const logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

const logger = createLogger({
    level: logLevel,
    format: newFormat,
    transports: [
        new transports.Console({
            format: format.combine(format.colorize({ all: true }, newFormat)),
        }),
        new transports.File({ filename: logFileName }),
    ],
});

module.exports = logger;

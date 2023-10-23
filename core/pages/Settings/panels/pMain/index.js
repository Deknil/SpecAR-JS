class Panel extends SpecAR.baseClasses.BasePanel {
    constructor() {
        super(__dirname);
        this._templateArg = {
            localeList: SpecAR.Translator.localeList,
            currentLocaleName: SpecAR.Translator.localeList[SpecAR.Config.getData.locale].name,
        };
    }
}

module.exports = { Panel };

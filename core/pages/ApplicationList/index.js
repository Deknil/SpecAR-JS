class Page {
    constructor() {
        this._templatePath = SpecAR.path.join(__dirname, './template.html');
        this._pageContainer = document.getElementById('pages-container');
    }

    /**
     * Рендеринг шаблона
     * @returns {string} HTML код шаблона.
     */
    renderTemplate() {
        const context = {
            appList: Object.keys(SpecAR.appList),
            SpecAR: SpecAR,
            translator: (key, replacements) => SpecAR.Translator.translate(key, replacements),
        };
        return SpecAR.nunjucks.render(this._templatePath, context);
    }

    async render() {
        const html = this.renderTemplate();
        this._pageContainer.innerHTML = html;
    }
}

module.exports = { Page };

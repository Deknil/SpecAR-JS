class Panel extends SpecAR.baseClasses.BasePanel {
    constructor() {
        super(__dirname);
    }

    /**
     * Хук, вызываемый после рендера панели
     */
    onRender() {
        const accordionContainer = document.querySelector('#panel-modules-accordion-container');

        accordionContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                const changeFunc = input.dataset.onchange;
                const moduleID = input.dataset.moduleId;

                SpecAR.moduleList[moduleID].moduleAPI[changeFunc](input);
            });
        });
    }
}

module.exports = { Panel };

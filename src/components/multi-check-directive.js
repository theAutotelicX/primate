'use strict';

const _refresh = (angular, element, scope) => {
    const {available, selected} = scope;
    const ul = element.children().first();

    for (let item of available) {
        let {nodeValue, displayText} = ((typeof item === 'object') ? item : {nodeValue: item, displayText: item});

        let li = angular.element('<li></li>');
        let input = angular.element('<input type="checkbox">');
        let label = angular.element('<label class="checkbox warning"></label>');

        if (selected.indexOf(nodeValue) >=0) {
            input.attr('checked', 'checked');
        }

        input.attr({class: 'multi-check__input', 'data-node-value': nodeValue});
        label.append(input);
        label.append(`&nbsp; ${displayText}`);

        li.append(label);
        ul.append(li);
    }

    return element;
};

export default function MultiCheckDirective(window) {
    const {angular} = window;

    return {
        transclude: true,
        restrict: 'E',
        require: ['ngModel'],
        template: '<ul></ul>',
        scope: {selected: '=ngModel', available: '=dvList'},
        controller: ['$scope', function (scope) { scope.isInitialised = false; }],
        link(scope, element, attrs) {
            if (!Array.isArray(scope.selected) || !Array.isArray(scope.available)) {
                return false;
            }

            element.on('change', 'input.multi-check__input', (event) => {
                const {currentTarget: target} = event;
                if (target.nodeName !== 'INPUT') {
                    return false;
                }

                const {nodeValue} = target.dataset;
                console.log(target.checked ? `Checked ${nodeValue}`: `Unchecked ${nodeValue}`);
            });

            _refresh(angular, element, scope);
        }
    };
}

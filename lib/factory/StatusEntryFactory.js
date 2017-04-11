'use strict';

let cmdHelper = require('../helper/CmdHelper');

let domQuery = require('min-dom/lib/query'),
    domAttr = require('min-dom/lib/attr'),
    domClosest = require('min-dom/lib/closest');

let filter = require('lodash/collection/filter'),
    forEach = require('lodash/collection/forEach'),
    keys = require('lodash/object/keys');

let domify = require('min-dom/lib/domify');

let entryFieldDescription = require('./EntryFieldDescription');

let updateSelection = require('selection-update');

let TABLE_ROW_DIV_SNIPPET = '<div class="bpp-field-wrapper bpp-table-row">';
let DELETE_ROW_BUTTON_SNIPPET = '<button class="clear" data-action="deleteElement">' +
    '<span>X</span>' +
    '</button>';

function createInputRowTemplate(properties, canRemove) {
    let template = TABLE_ROW_DIV_SNIPPET;
    template += createInputTemplate(properties, canRemove);
    template += canRemove ? DELETE_ROW_BUTTON_SNIPPET : '';
    template += '</div>';

    return template;
}

function createInputTemplate(properties, canRemove) {
    let columns = properties.length;
    let template = '';
    forEach(properties, function(prop) {
        template += '<input class="bpp-table-row-columns-' + columns + ' ' +
            (canRemove ? 'bpp-table-row-removable' : '') + '" ' +
            'id="camunda-table-row-cell-input-value" ' +
            'type="text" ' +
            'name="' + prop + '" />';
    });
    return template;
}

function createLabelRowTemplate(labels) {
    let template = TABLE_ROW_DIV_SNIPPET;
    template += createLabelTemplate(labels);
    template += '</div>';

    return template;
}

function createLabelTemplate(labels) {
    let columns = labels.length;
    let template = '';
    forEach(labels, function(label) {
        template += '<label class="bpp-table-row-columns-' + columns + '">' + label + '</label>';
    });
    return template;
}

function pick(elements, properties) {
    return (elements || []).map(function(elem) {
        let newElement = {};
        forEach(properties, function(prop) {
            newElement[prop] = elem[prop] || '';
        });
        return newElement;
    });
}

function diff(element, node, values, oldValues, editable) {
    return filter(values, function(value, idx) {
        return !valueEqual(element, node, value, oldValues[idx], editable, idx);
    });
}

function valueEqual(element, node, value, oldValue, editable, idx) {
    if (value && !oldValue) {
        return false;
    }
    let allKeys = keys(value).concat(keys(oldValue));

    return allKeys.every(function(key) {
        let n = value[key] || undefined;
        let o = oldValue[key] || undefined;
        return !editable(element, node, key, idx) || n === o;
    });
}

function getEntryNode(node) {
    return domClosest(node, '[data-entry]', true);
}

function getContainer(node) {
    return domQuery('div[data-list-entry-container]', node);
}

function getSelection(node) {
    return {
        start: node.selectionStart,
        end: node.selectionEnd
    };
}

function setSelection(node, selection) {
    node.selectionStart = selection.start;
    node.selectionEnd = selection.end;
}

/**
 * @param  {Object} options
 * @param  {string} options.id
 * @param  {string} options.description
 * @param  {Array<string>} options.modelProperties
 * @param  {Array<string>} options.labels
 * @param  {Function} options.getElements - this callback function must return a list of business object items
 * @param  {Function} options.removeElement
 * @param  {Function} options.addElement
 * @param  {Function} options.fillElement
 * @param  {Function} options.updateElement
 * @param  {Function} options.editable
 * @param  {Function} options.setControlValue
 * @param  {Function} options.show
 *
 * @return {Object}
 */
module.exports = function(options) {

    let id              = options.id,
        modelProperties = options.modelProperties,
        labels          = options.labels,
        description     = options.description;

    let labelRow = createLabelRowTemplate(labels);

    let getElements   = options.getElements;

    let removeElement = options.removeElement,
        canRemove     = typeof removeElement === 'function';

    let addElement = options.addElement,
        fillElements = options.fillElements,
        canAdd     = typeof addElement === 'function',
        addLabel   = options.addLabel || 'Add Value',
        fillStatus = options.fillStatus || 'Fill Statuses';

    let updateElement = options.updateElement,
        canUpdate     = typeof updateElement === 'function';

    let editable        = options.editable || function() { return true; },
        setControlValue = options.setControlValue;

    let show       = options.show,
        canBeShown = typeof show === 'function';

    let elements = function(element, node) {
        return pick(getElements(element, node), modelProperties);
    };

    let factory = {
        id: id,
        html: ( canAdd ?
            '<div class="bpp-table-add-row" ' + (canBeShown ? 'data-show="show"' : '') + '>' +
            '<label>' + fillStatus + '</label>' +
            '<button class="add" data-action="fillElements"><span>+</span></button>' +
            '<div class="bpp-table-add-row" ' + (canBeShown ? 'data-show="show"' : '') + '>' +
            '<label>' + addLabel + '</label>' +
            '<button class="add" data-action="addElement"><span>+</span></button>' +
            '</div>' : '') +
        '<div class="bpp-table" data-show="showTable">' +
        '<div class="bpp-field-wrapper bpp-table-row">' +
        labelRow +
        '</div>' +
        '<div data-list-entry-container>' +
        '</div>' +
        '</div>' +

        // add description below table entry field
        ( description ? entryFieldDescription(description) : ''),

        get: function(element, node) {
            let boElements = elements(element, node, this.__invalidValues);

            let invalidValues = this.__invalidValues;

            delete this.__invalidValues;

            forEach(invalidValues, function(value, idx) {
                let element = boElements[idx];

                forEach(modelProperties, function(prop) {
                    element[prop] = value[prop];
                });
            });

            return boElements;
        },

        set: function(element, values, node) {
            let action = this.__action || {};
            delete this.__action;

            if (action.id === 'delete-element') {
                return removeElement(element, node, action.idx);
            }
            else if (action.id === 'add-element') {
                return addElement(element, node);
            }
            else if (action.id === 'fill-elements') {
                return fillElements(element, node);
            }
            else if (canUpdate) {
                let commands = [],
                    valuesToValidate = values;

                if (typeof options.validate !== 'function') {
                    valuesToValidate = diff(element, node, values, elements(element, node), editable);
                }

                let self = this;

                forEach(valuesToValidate, function(value) {
                    let validationError,
                        idx = values.indexOf(value);

                    if (typeof options.validate === 'function') {
                        validationError = options.validate(element, value, node, idx);
                    }

                    if (!validationError) {
                        let cmd = updateElement(element, value, node, idx);

                        if (cmd) {
                            commands.push(cmd);
                        }
                    } else {
                        // cache invalid value in an object by index as key
                        self.__invalidValues = self.__invalidValues || {};
                        self.__invalidValues[idx] = value;

                        // execute a command, which does not do anything
                        commands.push(cmdHelper.updateProperties(element, {}));
                    }
                });

                return commands;
            }
        },
        createListEntryTemplate: function(value, index, selectBox) {
            return createInputRowTemplate(modelProperties, canRemove);
        },
        fillElements: function(element, node, event, scopeNode) {
            let template = domify(createInputRowTemplate(modelProperties, canRemove));
            let container = getContainer(node);
            container.appendChild(template);
            this.__action = {
                id: 'fill-elements'
            };

            return true;
        },
        addElement: function(element, node, event, scopeNode) {
            let template = domify(createInputRowTemplate(modelProperties, canRemove));

            let container = getContainer(node);
            container.appendChild(template);

            this.__action = {
                id: 'add-element'
            };

            return true;
        },

        deleteElement: function(element, node, event, scopeNode) {
            let container = getContainer(node);
            let rowToDelete = event.delegateTarget.parentNode;
            let idx = parseInt(domAttr(rowToDelete, 'data-index'), 10);

            container.removeChild(rowToDelete);

            this.__action = {
                id: 'delete-element',
                idx: idx
            };

            return true;
        },

        editable: function(element, rowNode, input, prop, value, idx) {
            let entryNode = domClosest(rowNode, '[data-entry]');
            return editable(element, entryNode, prop, idx);
        },

        show: function(element, entryNode, node, scopeNode) {
            entryNode = getEntryNode(entryNode);
            return show(element, entryNode, node, scopeNode);
        },

        showTable: function(element, entryNode, node, scopeNode) {
            entryNode = getEntryNode(entryNode);
            let elems = elements(element, entryNode);
            return elems && elems.length && (!canBeShown || show(element, entryNode, node, scopeNode));
        },

        validateListItem: function(element, value, node, idx) {
            if (typeof options.validate === 'function') {
                return options.validate(element, value, node, idx);
            }
        }

    };

    // Update/set the selection on the correct position.
    // It's the same code like for an input value in the PropertiesPanel.js.
    if (setControlValue) {
        factory.setControlValue = function(element, rowNode, input, prop, value, idx) {
            let entryNode = getEntryNode(rowNode);

            let isReadOnly = domAttr(input, 'readonly');
            let oldValue = input.value;

            let selection;

            // prevents input fields from having the value 'undefined'
            if (value === undefined) {
                value = '';
            }

            // when the attribute 'readonly' exists, ignore the comparison
            // with 'oldValue' and 'value'
            if (!!isReadOnly && oldValue === value) {
                return;
            }

            // update selection on undo/redo
            if (document.activeElement === input) {
                selection = updateSelection(getSelection(input), oldValue, value);
            }

            setControlValue(element, entryNode, input, prop, value, idx);

            if (selection) {
                setSelection(input, selection);
            }

        };
    }

    return factory;

};


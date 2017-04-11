'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    getExtensionElements = require('./ExtensionElementsHelper').getExtensionElements;

var StatusHelper = {};

module.exports = StatusHelper;


/**
 * Return all form fields existing in the business object, and
 * an empty array if none exist.
 *
 * @param  {djs.model.Base} element
 *
 * @return {Array} a list of form field objects
 */
StatusHelper.getFormFields = function(element) {
    let bo = getBusinessObject(element),
        statusName;
    if (!bo) {
        return [];
    }
    statusName = getExtensionElements(bo, 'camunda:FormData');

    if (!!statusName) {
        return statusName[0].fields;
    } else {
        return [];
    }
};


/**
 * Get a form field from the business object at given index
 *
 * @param {djs.model.Base} element
 * @param {number} idx
 *
 * @return {ModdleElement} the form field
 */
StatusHelper.getFormField = function(element) {

    var statusName = this.getFormFields(element);

    return statusName[0];
};

/**
 * Get all camunda:value objects for a specific form field from the business object
 *
 * @param  {ModdleElement} statusName
 *
 * @return {Array<ModdleElement>} a list of camunda:value objects
 */
StatusHelper.getEnumValues = function(statusName) {
    if (statusName && statusName.values) {
        return statusName.values;
    }
    return [];
};


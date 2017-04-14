'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    getExtensionElements = require('../../../helper/ExtensionElementsHelper').getExtensionElements,
    statusModelExtension = require('./implementation/StatusModelExtension'),
    entryFactory = require('../../../factory/EntryFactory'),
    elementHelper = require('../../../helper/ElementHelper'),
    cmdHelper = require('../../../helper/CmdHelper'),
    statusHelper = require('../../../helper/StatusHelper'),
    utils = require('../../../Utils'),
    is = require('bpmn-js/lib/util/ModelUtil').is,
    __ = require('./../../../locales/').__;
    //find = require('lodash/collection/find'),
    //Ids = require('ids');
/*
var BpmnModdle = require('bpmn-moddle');
var camundaDescriptor = require('../../../../resources/camunda');
function createModdle() {
  return new BpmnModdle({
    camunda: camundaDescriptor
  });
}
var moddle = createModdle();
*/
function generateValueId() {
  return utils.nextId('Value_');
}

function ensureStatusModelSupported(element) {
  return is(element, 'bpmn:Collaboration');
}

module.exports = function(group, element, bpmnFactory) {
    /*var statusModel = [];
    var model = { ids: new Ids(0) };*/
/*
  function getStatusModel() {
    return statusModel;
  }
*/
/*
  function addToStatusModel(id, name) {
    statusModel.push({
      id: id,
      name: name,
      $model: model,
      get: function(key) {
        if (key == 'id') {
          return this.id;
        } else if (key == 'name') {
          return this.name;
        } else if (key == '$model') {
          return this.$model;
        } else {
          return undefined;
        }
      },
      set: function(key, value) {
        if (key == 'id') {
          this.id = value;
        } else if (key == 'name') {
          this.name = value;
        } else if (key == '$model') {
          this.$model = value;
        }
      }
    });
  }
*/
  if (!ensureStatusModelSupported(element)) {
    return;
  }
/*
  group.entries.push(entryFactory.label({
    id: 'form-field-header',
    labelText: __('Status Model'),
    showLabel: function() {
      return true;
    }
  }));
*/
  group.entries.push(entryFactory.comboBox({
    id: 'status-model-default',
    label: __('Start value'),
    selectOptions: [
      { name: 'string', value: 'string' },
      { name: 'long', value: 'long' },
      { name: 'boolean', value: 'boolean' },
      { name: 'date', value: 'date' },
      { name: 'enum', value: 'enum' }
    ],
    emptyParameter: true,
    get: function() {
      return {};
    },
    set: function() {
      return [];
    },
    hidden: function() {
      return false;
    }
  }));

  group.entries.push(entryFactory.label({
    id: 'status-model-label',
    labelText: __('Statuses')
  }));


  var formFieldsEntry = statusModelExtension(element, bpmnFactory, {
    id: 'status-name',
    label: __('Status Name'),
    modelProperty: 'id',
    prefix: 'StatusName',
    createExtensionElement: function(element, extensionElements, value) {
      var bo = getBusinessObject(element), commands = [];
      if (!extensionElements) {
        extensionElements = elementHelper.createElement('bpmn:ExtensionElements', { values: [] }, bo, bpmnFactory);
        commands.push(cmdHelper.updateProperties(element, { extensionElements: extensionElements }));
      }

      var statusData = extensionElements.values[0];
      if (!statusData) {
        statusData = elementHelper.createElement('camunda:FormData', { fields: [] }, extensionElements, bpmnFactory);
        commands.push(cmdHelper.addAndRemoveElementsFromList(
          element,
          extensionElements,
          'values',
          'statusModelExtension',
          [statusData],
          []
        ));
      }
      if (!statusData.fields || statusData.fields.length == 0) {
        var field = elementHelper.createElement('camunda:FormField', { id: 'status' }, statusData, bpmnFactory);
        commands.push(cmdHelper.addElementsTolist(element, statusData, 'fields', [field]));
      }
      return commands;
    },
    removeExtensionElement: function(element, extensionElements, value, idx) {
      var formData = getExtensionElements(getBusinessObject(element), 'camunda:FormData')[0],
          entry = formData.fields[idx],
          commands = [];

      commands.push(cmdHelper.removeElementsFromList(element, formData, 'fields', null, [entry]));

      if (entry && entry.id === formData.get('businessKey')) {
        commands.push(cmdHelper.updateBusinessObject(element, formData, { 'businessKey': undefined }));
      }
      return commands;
    },
    getExtensionElements: function(element) {
      return statusHelper.getFormFields(element);
    },
    hideExtensionElements: function(element, node) {
      return false;
    }
  });
  group.entries.push(formFieldsEntry);

  group.entries.push(entryFactory.table({
    id: 'form-field-enum-values',
    labels: [__('Id'), __('Name')],
    modelProperties: ['id', 'name'],
    show: function(element, node) {
      return statusHelper.getFormField(element);
    },
    getElements: function(element, node) {
      var selectedFormField = statusHelper.getFormField(element);
      return statusHelper.getEnumValues(selectedFormField);
    },
    addElement: function(element, node) {
      var selectedFormField = statusHelper.getFormField(element),
          id = generateValueId();

      var enumValue = elementHelper.createElement('camunda:Value', { id: id, name: undefined },
        getBusinessObject(element), bpmnFactory);

      return cmdHelper.addElementsTolist(element, selectedFormField, 'values', [enumValue]);
    },
    removeElement: function(element, node, idx) {
      var selectedFormField = statusHelper.getFormField(element),
          enumValue = selectedFormField.values[idx];

      return cmdHelper.removeElementsFromList(element, selectedFormField, 'values', null, [enumValue]);
    },
    updateElement: function(element, value, node, idx) {
      var selectedFormField = statusHelper.getFormField(element),
          enumValue = selectedFormField.values[idx];

      value.name = value.name || undefined;
      return cmdHelper.updateBusinessObject(element, enumValue, value);
    },
    validate: function(element, value, node, idx) {

      var selectedFormField = statusHelper.getFormField(element),
          enumValue = selectedFormField.values[idx];

      if (enumValue) {
        // check if id is valid
        var validationError = utils.isIdValid(enumValue, value.id);

        if (validationError) {
          return { id: validationError };
        }
      }
    }
  }));
  /*
   group.entries.push(entryFactory.table({
   id: 'status-model-values',
   labels: [ 'Id', 'Name' ],
   modelProperties: [ 'id', 'name' ],
   show: function() {
   return true;
   },
   getElements: function() {
   return getStatusModel();
   },
   addElement: function(element, node) {
   var id = generateValueId();
   addToStatusModel(id, undefined);
   var enumValue = elementHelper.createElement('camunda:Value', { id: id, name: undefined },
   getBusinessObject(element), bpmnFactory);
   var moddleElement = moddle.create('bpmn:ExtensionElements');
   return cmdHelper.addElementsTolist(element, element, 'values', [enumValue]);
   },
   removeElement: function(element, node, idx) {
   var item = getStatusModel()[idx];
   getStatusModel().splice(idx);
   return cmdHelper.removeElementsFromList(element, {}, 'values', null, [item]);
   },
   updateElement: function(element, value, node, idx) {
   var item = getStatusModel()[idx];
   var moddleElement = moddle.create('bpmn:ExtensionElements');
   Object.assign(item, value);
   return cmdHelper.updateBusinessObject(element, item, value);
   },
   validate: function(element, value, node, idx) {
   var item = getStatusModel()[idx];
   if (item) {
   // check if id is valid
   var validationError = utils.isIdValid(item, value.id);
   if (validationError) {
   return { id: validationError };
   }
   }
   }
   }));
   */
};

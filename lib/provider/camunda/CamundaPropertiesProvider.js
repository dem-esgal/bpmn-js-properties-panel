'use strict';

var inherits = require('inherits');

var PropertiesActivator = require('../../PropertiesActivator');

var asyncCapableHelper = require('../../helper/AsyncCapableHelper'),
    ImplementationTypeHelper = require('../../helper/ImplementationTypeHelper');

var is = require('bpmn-js/lib/util/ModelUtil').is;

// bpmn properties
var processProps = require('../bpmn/parts/ProcessProps'),
    eventProps = require('../bpmn/parts/EventProps'),
    linkProps = require('../bpmn/parts/LinkProps'),
    documentationProps = require('../bpmn/parts/DocumentationProps'),
    idProps = require('../bpmn/parts/IdProps'),
    nameProps = require('../bpmn/parts/NameProps'),
    executableProps = require('../bpmn/parts/ExecutableProps');

// camunda properties
var serviceTaskDelegateProps = require('./parts/ServiceTaskDelegateProps'),
    userTaskProps = require('./parts/UserTaskProps'),
    asynchronousContinuationProps = require('./parts/AsynchronousContinuationProps'),
    callActivityProps = require('./parts/CallActivityProps'),
    multiInstanceProps = require('./parts/MultiInstanceLoopProps'),
    sequenceFlowProps = require('./parts/SequenceFlowProps'),
    scriptProps = require('./parts/ScriptTaskProps'),
    formProps = require('./parts/FormProps'),
    statusProps = require('./parts/StatusModel'),
    startEventInitiator = require('./parts/StartEventInitiator'),
    variableMapping = require('./parts/VariableMappingProps'),
    versionTag = require('./parts/VersionTagProps'),
    __ = require('./../../locales/').__;

var listenerProps = require('./parts/ListenerProps'),
    listenerDetails = require('./parts/ListenerDetailProps'),
    listenerFields = require('./parts/ListenerFieldInjectionProps');

var elementTemplateChooserProps = require('./element-templates/parts/ChooserProps'),
    elementTemplateCustomProps = require('./element-templates/parts/CustomProps');

// Input/Output
var inputOutput = require('./parts/InputOutputProps'),
    inputOutputParameter = require('./parts/InputOutputParameterProps');

// Connector
var connectorDetails = require('./parts/ConnectorDetailProps'),
    connectorInputOutput = require('./parts/ConnectorInputOutputProps'),
    connectorInputOutputParameter = require('./parts/ConnectorInputOutputParameterProps');

// properties
var properties = require('./parts/PropertiesProps');

// job configuration
var jobConfiguration = require('./parts/JobConfigurationProps');

// external task configuration
var externalTaskConfiguration = require('./parts/ExternalTaskConfigurationProps');

// field injection
var fieldInjections = require('./parts/FieldInjectionProps');

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
    eventDefinitionHelper = require('../../helper/EventDefinitionHelper'),
    implementationTypeHelper = require('../../helper/ImplementationTypeHelper');

var find = require('lodash/collection/find');
// helpers ////////////////////////////////////////

var isExternalTaskPriorityEnabled = function(element) {
  var businessObject = getBusinessObject(element);

  // show only if element is a process, a participant ...
  if (is(element, 'bpmn:Process') || is(element, 'bpmn:Participant') && businessObject.get('processRef'))  {
    return true;
  }

  var externalBo = ImplementationTypeHelper.getServiceTaskLikeBusinessObject(element),
      isExternalTask = ImplementationTypeHelper.getImplementationType(externalBo) === 'external';

  // ... or an external task with selected external implementation type
  return !!ImplementationTypeHelper.isExternalCapable(externalBo) && isExternalTask;
};

var isJobConfigEnabled = function(element) {
  var businessObject = getBusinessObject(element);

  if (is(element, 'bpmn:Process') || is(element, 'bpmn:Participant') && businessObject.get('processRef'))  {
    return true;
  }

  // async behavior
  var bo = getBusinessObject(element);
  if (asyncCapableHelper.isAsyncBefore(bo) || asyncCapableHelper.isAsyncAfter(bo)) {
    return true;
  }

  // timer definition
  if (is(element, 'bpmn:Event'))  {
    return !!eventDefinitionHelper.getTimerEventDefinition(element);
  }

  return false;
};

var getInputOutputParameterLabel = function(param) {

  if (is(param, 'camunda:InputParameter')) {
    return __('Input Parameter');
  }

  if (is(param, 'camunda:OutputParameter')) {
    return __('Output Parameter');
  }

  return '';
};

var getListenerLabel = function(param) {

  if (is(param, 'camunda:ExecutionListener')) {
    return __('Execution Listener');
  }

  if (is(param, 'camunda:TaskListener')) {
    return __('Task Listener');
  }

  return '';
};

function createGeneralTabGroups(element, bpmnFactory, elementRegistry, elementTemplates) {

  var generalGroup = {
    id: 'general',
    label: __('General'),
    entries: []
  };
  idProps(generalGroup, element, elementRegistry);
  nameProps(generalGroup, element);
  processProps(generalGroup, element);
  versionTag(generalGroup, element);
  executableProps(generalGroup, element);
  elementTemplateChooserProps(generalGroup, element, elementTemplates);

  var customFieldsGroup = {
    id: 'customField',
    label: __('Custom Fields'),
    entries: []
  };
  elementTemplateCustomProps(customFieldsGroup, element, elementTemplates, bpmnFactory);

  var detailsGroup = {
    id: 'details',
    label: __('Details'),
    entries: []
  };
  serviceTaskDelegateProps(detailsGroup, element, bpmnFactory);
  userTaskProps(detailsGroup, element);
  scriptProps(detailsGroup, element, bpmnFactory);
  linkProps(detailsGroup, element);
  callActivityProps(detailsGroup, element, bpmnFactory);
  eventProps(detailsGroup, element, bpmnFactory, elementRegistry);
  sequenceFlowProps(detailsGroup, element, bpmnFactory);
  startEventInitiator(detailsGroup, element); // this must be the last element of the details group!

  var multiInstanceGroup = {
    id: 'multiInstance',
    label: __('Multi Instance'),
    entries: []
  };
  multiInstanceProps(multiInstanceGroup, element, bpmnFactory);

  var asyncGroup = {
    id : 'async',
    label: __('Asynchronous Continuations'),
    entries : []
  };
  asynchronousContinuationProps(asyncGroup, element, bpmnFactory);

  var jobConfigurationGroup = {
    id : 'jobConfiguration',
    label : __('Job Configuration'),
    entries : [],
    enabled: isJobConfigEnabled
  };
  jobConfiguration(jobConfigurationGroup, element, bpmnFactory);

  var externalTaskGroup = {
    id : 'externalTaskConfiguration',
    label : __('External Task Configuration'),
    entries : [],
    enabled: isExternalTaskPriorityEnabled
  };
  externalTaskConfiguration(externalTaskGroup, element, bpmnFactory);

  var documentationGroup = {
    id: 'documentation',
    label: __('Documentation'),
    entries: []
  };
  documentationProps(documentationGroup, element, bpmnFactory);

  return [
    generalGroup,
    customFieldsGroup,
    detailsGroup,
    externalTaskGroup,
    multiInstanceGroup,
    asyncGroup,
    jobConfigurationGroup,
    documentationGroup
  ];

}

function createVariablesTabGroups(element, bpmnFactory, elementRegistry) {
  var variablesGroup = {
    id : 'variables',
    label : __('Variables'),
    entries: []
  };
  variableMapping(variablesGroup, element, bpmnFactory);

  return [
    variablesGroup
  ];
}

function createFormsTabGroups(element, bpmnFactory, elementRegistry) {
  var formGroup = {
    id : 'forms',
    label : __('Forms'),
    entries: []
  };
  var statusModelElement = find(elementRegistry._elements, function(f) {
    return !!f.element && (f.element.type == 'bpmn:Collaboration');
  });
  formProps(formGroup, element, statusModelElement, bpmnFactory);

  return [
    formGroup
  ];
}

function createStatusesTabGroups(element, bpmnFactory, elementRegistry) {
  var statusModelGroup = {
    id : 'statusModel',
    label : __('Status Model'),
    entries: []
  };

  statusProps(statusModelGroup, element, bpmnFactory);

  return [
    statusModelGroup
  ];
}

function createListenersTabGroups(element, bpmnFactory, elementRegistry) {

  var listenersGroup = {
    id : 'listeners',
    label: __('Listeners'),
    entries: []
  };

  var options = listenerProps(listenersGroup, element, bpmnFactory);

  var listenerDetailsGroup = {
    id: 'listener-details',
    entries: [],
    enabled: function(element, node) {
      return options.getSelectedListener(element, node);
    },
    label: function(element, node) {
      var param = options.getSelectedListener(element, node);
      return getListenerLabel(param);
    }
  };

  listenerDetails(listenerDetailsGroup, element, bpmnFactory, options);

  var listenerFieldsGroup = {
    id: 'listener-fields',
    label: __('Field Injection'),
    entries: [],
    enabled: function(element, node) {
      return options.getSelectedListener(element, node);
    }
  };

  listenerFields(listenerFieldsGroup, element, bpmnFactory, options);

  return [
    listenersGroup,
    listenerDetailsGroup,
    listenerFieldsGroup
  ];
}

function createInputOutputTabGroups(element, bpmnFactory, elementRegistry) {

  var inputOutputGroup = {
    id: 'input-output',
    label: __('Parameters'),
    entries: []
  };

  var options = inputOutput(inputOutputGroup, element, bpmnFactory);

  var inputOutputParameterGroup = {
    id: 'input-output-parameter',
    entries: [],
    enabled: function(element, node) {
      return options.getSelectedParameter(element, node);
    },
    label: function(element, node) {
      var param = options.getSelectedParameter(element, node);
      return getInputOutputParameterLabel(param);
    }
  };

  inputOutputParameter(inputOutputParameterGroup, element, bpmnFactory, options);

  return [
    inputOutputGroup,
    inputOutputParameterGroup
  ];
}

function createConnectorTabGroups(element, bpmnFactory, elementRegistry) {
  var connectorDetailsGroup = {
    id: 'connector-details',
    label: __('Details'),
    entries: []
  };

  connectorDetails(connectorDetailsGroup, element, bpmnFactory);

  var connectorInputOutputGroup = {
    id: 'connector-input-output',
    label: __('Input/Output'),
    entries: []
  };

  var options = connectorInputOutput(connectorInputOutputGroup, element, bpmnFactory);

  var connectorInputOutputParameterGroup = {
    id: 'connector-input-output-parameter',
    entries: [],
    enabled: function(element, node) {
      return options.getSelectedParameter(element, node);
    },
    label: function(element, node) {
      var param = options.getSelectedParameter(element, node);
      return getInputOutputParameterLabel(param);
    }
  };

  connectorInputOutputParameter(connectorInputOutputParameterGroup, element, bpmnFactory, options);

  return [
    connectorDetailsGroup,
    connectorInputOutputGroup,
    connectorInputOutputParameterGroup
  ];
}

function createFieldInjectionsTabGroups(element, bpmnFactory, elementRegistry) {

  var fieldGroup = {
    id: 'field-injections-properties',
    label: __('Field Injections'),
    entries: []
  };

  fieldInjections(fieldGroup, element, bpmnFactory);

  return [
    fieldGroup
  ];
}

function createExtensionElementsGroups(element, bpmnFactory, elementRegistry) {

  var propertiesGroup = {
    id : 'extensionElements-properties',
    label: __('Properties'),
    entries: []
  };
  properties(propertiesGroup, element, bpmnFactory);

  return [
    propertiesGroup
  ];
}

// Camunda Properties Provider /////////////////////////////////////


/**
 * A properties provider for Camunda related properties.
 *
 * @param {EventBus} eventBus
 * @param {BpmnFactory} bpmnFactory
 * @param {ElementRegistry} elementRegistry
 * @param {ElementTemplates} elementTemplates
 */
function CamundaPropertiesProvider(eventBus, bpmnFactory, elementRegistry, elementTemplates) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {

    var generalTab = {
      id: 'general',
      label: __('General'),
      groups: createGeneralTabGroups(
                  element, bpmnFactory,
                  elementRegistry, elementTemplates)
    };

    var variablesTab = {
      id: 'variables',
      label: __('Variables'),
      groups: createVariablesTabGroups(element, bpmnFactory, elementRegistry)
    };

    var formsTab = {
      id: 'forms',
      label: __('Forms'),
      groups: createFormsTabGroups(element, bpmnFactory, elementRegistry)
    };

    var listenersTab = {
      id: 'listeners',
      label: __('Listeners'),
      groups: createListenersTabGroups(element, bpmnFactory, elementRegistry),
      enabled: function(element) {
        return !eventDefinitionHelper.getLinkEventDefinition(element)
          || (!is(element, 'bpmn:IntermediateThrowEvent')
          && eventDefinitionHelper.getLinkEventDefinition(element));
      }
    };

    var statusModelTab = {
      id: 'statusModel',
      label: __('Status Model'),
      groups: createStatusesTabGroups(element, bpmnFactory, elementRegistry)
    };

    var inputOutputTab = {
      id: 'input-output',
      label: __('Input/Output'),
      groups: createInputOutputTabGroups(element, bpmnFactory, elementRegistry)
    };

    var connectorTab = {
      id: 'connector',
      label: __('Connector'),
      groups: createConnectorTabGroups(element, bpmnFactory, elementRegistry),
      enabled: function(element) {
        var bo = implementationTypeHelper.getServiceTaskLikeBusinessObject(element);
        return bo && implementationTypeHelper.getImplementationType(bo) === 'connector';
      }
    };

    var fieldInjectionsTab = {
      id: 'field-injections',
      label: __('Field Injections'),
      groups: createFieldInjectionsTabGroups(element, bpmnFactory, elementRegistry)
    };

    var extensionsTab = {
      id: 'extensionElements',
      label: __('Extensions'),
      groups: createExtensionElementsGroups(element, bpmnFactory, elementRegistry)
    };

    return [
      generalTab,
      variablesTab,
      connectorTab,
      formsTab,
      listenersTab,
      statusModelTab,
      inputOutputTab,
      fieldInjectionsTab,
      extensionsTab
    ];
  };

}

CamundaPropertiesProvider.$inject = [
  'eventBus',
  'bpmnFactory',
  'elementRegistry',
  'elementTemplates'
];

inherits(CamundaPropertiesProvider, PropertiesActivator);

module.exports = CamundaPropertiesProvider;

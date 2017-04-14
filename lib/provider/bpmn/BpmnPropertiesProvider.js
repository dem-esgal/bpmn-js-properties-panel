'use strict';


var inherits = require('inherits');

var PropertiesActivator = require('../../PropertiesActivator');

var processProps = require('./parts/ProcessProps'),
    eventProps = require('./parts/EventProps'),
    linkProps = require('./parts/LinkProps'),
    documentationProps = require('./parts/DocumentationProps'),
    idProps = require('./parts/IdProps'),
    nameProps = require('./parts/NameProps'),
    executableProps = require('./parts/ExecutableProps'),
    __ = require('./../../locales/').__;



function createGeneralTabGroups(element, bpmnFactory, elementRegistry) {

  var generalGroup = {
    id: 'general',
    label: __('General'),
    entries: []
  };
  idProps(generalGroup, element, elementRegistry);
  nameProps(generalGroup, element);
  processProps(generalGroup, element);
  executableProps(generalGroup, element);

  var detailsGroup = {
    id: 'details',
    label: __('Details'),
    entries: []
  };
  linkProps(detailsGroup, element);
  eventProps(detailsGroup, element, bpmnFactory, elementRegistry);

  var documentationGroup = {
    id: 'documentation',
    label:  __('Documentation'),
    entries: []
  };

  documentationProps(documentationGroup, element, bpmnFactory);

  return [
    generalGroup,
    detailsGroup,
    documentationGroup
  ];

}

function BpmnPropertiesProvider(eventBus, bpmnFactory, elementRegistry) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {

    var generalTab = {
      id: 'general',
      label:  __('General'),
      groups: createGeneralTabGroups(element, bpmnFactory, elementRegistry)
    };

    return [
      generalTab
    ];
  };
}

BpmnPropertiesProvider.$inject = [ 'eventBus', 'bpmnFactory', 'elementRegistry' ];

inherits(BpmnPropertiesProvider, PropertiesActivator);

module.exports = BpmnPropertiesProvider;

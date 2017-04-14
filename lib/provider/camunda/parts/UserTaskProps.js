'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is,
    entryFactory = require('../../../factory/EntryFactory'),
    __ = require('./../../../locales/').__;


module.exports = function(group, element) {
  if (is(element, 'camunda:Assignable')) {

    // Assignee
    group.entries.push(entryFactory.textField({
      id : 'assignee',
      label : __('Assignee'),
      modelProperty : 'assignee'
    }));

    // Candidate Users
    group.entries.push(entryFactory.textField({
      id : 'candidateUsers',
      label : __('Candidate Users'),
      modelProperty : 'candidateUsers'
    }));

    // Candidate Groups
    group.entries.push(entryFactory.textField({
      id : 'candidateGroups',
      label : __('Candidate Groups'),
      modelProperty : 'candidateGroups'
    }));

    // Due Date
    group.entries.push(entryFactory.textField({
      id : 'dueDate',
      description : __('DUE_DATE_DESC'),
      label : __('Due Date'),
      modelProperty : 'dueDate'
    }));

    // FollowUp Date
    group.entries.push(entryFactory.textField({
      id : 'followUpDate',
      description : __('FOLLOW_UP_DATE_DESCR'),
      label : __('Follow Up Date'),
      modelProperty : 'followUpDate'
    }));

    // priority
    group.entries.push(entryFactory.textField({
      id : 'priority',
      label : __('Priority'),
      modelProperty : 'priority'
    }));
  }
};

var i18n = require('i18next');

var RU = require('./ru/');
var EN = require('./en/');

i18n.init({
  fallbackLng: 'ru',
  resources: {
    ru: RU,
    en: EN
  }
});

module.exports = {
  __ : function(word) {
    return i18n.t(word);
  }
};
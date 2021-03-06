'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _core = require('core-js');

var _core2 = _interopRequireWildcard(_core);

var _import = require('aurelia-logging');

var LogManager = _interopRequireWildcard(_import);

var _Container = require('aurelia-dependency-injection');

var _Loader = require('aurelia-loader');

var _join$relativeToFile = require('aurelia-path');

var _Plugins = require('./plugins');

var _BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator = require('aurelia-templating');

var logger = LogManager.getLogger('aurelia'),
    slice = Array.prototype.slice;

if (!window.CustomEvent || typeof window.CustomEvent !== 'function') {
  var CustomEvent = function CustomEvent(event, params) {
    var params = params || {
      bubbles: false,
      cancelable: false,
      detail: undefined
    };

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  };

  CustomEvent.prototype = window.Event.prototype;
  window.CustomEvent = CustomEvent;
}

function preventActionlessFormSubmit() {
  document.body.addEventListener('submit', function (evt) {
    var target = evt.target;
    var action = target.action;

    if (target.tagName.toLowerCase() === 'form' && !action) {
      evt.preventDefault();
    }
  });
}

function loadResources(container, resourcesToLoad, appResources) {
  var viewEngine = container.get(_BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator.ViewEngine),
      importIds = Object.keys(resourcesToLoad),
      names = new Array(importIds.length),
      i,
      ii;

  for (i = 0, ii = importIds.length; i < ii; ++i) {
    names[i] = resourcesToLoad[importIds[i]];
  }

  return viewEngine.importViewResources(importIds, names, appResources);
}

var Aurelia = (function () {
  function Aurelia(loader, container, resources) {
    _classCallCheck(this, Aurelia);

    this.loader = loader || new window.AureliaLoader();
    this.container = container || new _Container.Container();
    this.resources = resources || new _BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator.ResourceRegistry();
    this.use = new _Plugins.Plugins(this);
    this.resourcesToLoad = {};

    this.withInstance(Aurelia, this);
    this.withInstance(_Loader.Loader, this.loader);
    this.withInstance(_BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator.ResourceRegistry, this.resources);
  }

  _createClass(Aurelia, [{
    key: 'withInstance',
    value: function withInstance(type, instance) {
      this.container.registerInstance(type, instance);
      return this;
    }
  }, {
    key: 'withSingleton',
    value: function withSingleton(type, implementation) {
      this.container.registerSingleton(type, implementation);
      return this;
    }
  }, {
    key: 'globalizeResources',
    value: function globalizeResources(resources) {
      var toAdd = Array.isArray(resources) ? resources : arguments,
          i,
          ii,
          pluginPath = this.currentPluginId || '',
          path,
          internalPlugin = pluginPath.startsWith('./');

      for (i = 0, ii = toAdd.length; i < ii; ++i) {
        path = internalPlugin ? _join$relativeToFile.relativeToFile(toAdd[i], pluginPath) : _join$relativeToFile.join(pluginPath, toAdd[i]);

        this.resourcesToLoad[path] = this.resourcesToLoad[path];
      }

      return this;
    }
  }, {
    key: 'renameGlobalResource',
    value: function renameGlobalResource(resourcePath, newName) {
      this.resourcesToLoad[resourcePath] = newName;
      return this;
    }
  }, {
    key: 'start',
    value: function start() {
      var _this = this;

      if (this.started) {
        return Promise.resolve(this);
      }

      this.started = true;
      logger.info('Aurelia Starting');

      preventActionlessFormSubmit();

      return this.use._process().then(function () {
        if (!_this.container.hasHandler(_BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator.BindingLanguage)) {
          var message = 'You must configure Aurelia with a BindingLanguage implementation.';
          logger.error(message);
          throw new Error(message);
        }

        if (!_this.container.hasHandler(_BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator.Animator)) {
          _BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator.Animator.configureDefault(_this.container);
        }

        return loadResources(_this.container, _this.resourcesToLoad, _this.resources).then(function () {
          logger.info('Aurelia Started');
          var evt = new window.CustomEvent('aurelia-started', { bubbles: true, cancelable: true });
          document.dispatchEvent(evt);
          return _this;
        });
      });
    }
  }, {
    key: 'setRoot',
    value: function setRoot() {
      var _this2 = this;

      var root = arguments[0] === undefined ? 'app' : arguments[0];
      var applicationHost = arguments[1] === undefined ? null : arguments[1];

      var compositionEngine,
          instruction = {};

      if (!applicationHost || typeof applicationHost == 'string') {
        this.host = document.getElementById(applicationHost || 'applicationHost') || document.body;
      } else {
        this.host = applicationHost;
      }

      this.host.aurelia = this;
      this.container.registerInstance(Element, this.host);

      compositionEngine = this.container.get(_BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator.CompositionEngine);
      instruction.viewModel = root;
      instruction.container = instruction.childContainer = this.container;
      instruction.viewSlot = new _BindingLanguage$ViewEngine$ViewSlot$ResourceRegistry$CompositionEngine$Animator.ViewSlot(this.host, true);
      instruction.viewSlot.transformChildNodesIntoView();

      return compositionEngine.compose(instruction).then(function (root) {
        _this2.root = root;
        instruction.viewSlot.attached();
        var evt = new window.CustomEvent('aurelia-composed', { bubbles: true, cancelable: true });
        setTimeout(function () {
          return document.dispatchEvent(evt);
        }, 1);
        return _this2;
      });
    }
  }]);

  return Aurelia;
})();

exports.Aurelia = Aurelia;
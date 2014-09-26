/* global angular, console */
'use strict';

angular.module('ng.httpLoader', [
  'ng.httpLoader.httpMethodInterceptor'
])

  .directive('ngHttpLoader', [
    '$rootScope',
    '$parse',
    '$timeout',
    function ($rootScope, $parse, $timeout) {

      /**
       * Usage example:
       *
       * Multiple method loader
       *
       * <div ng-http-loader
       *      methods="['PUT', 'POST']"
       *      template="example/loader.tpl.html"></div>
       *
       * Single method loader
       *
       * <div ng-http-loader
       *      methods="'GET'"
       *      template="example/loader.tpl.html"></div>
       *
       * Adding a title [optional]
       *
       * <div ng-http-loader
       *      title="Foo"
       *      methods="'GET'"
       *      template="example/loader.tpl.html"></div>
       *
       * Adding event names to catch [optional]
       *
       * <div ng-http-loader
       *      title="Foo"
       *      methods="'GET'"
       *      template="example/loader.tpl.html"
       *      beforeloadershow="$$BeforeLoaderShow"
       *      afterloadershow="$$AfterLoaderShow"
       *      beforeloaderhide="$$beforeLoaderhide"
       *      afterloaderhide="$$AfterLoaderHide"></div>
       */
      return {
        /**
         * Available attributes
         *
         * @param {array|string} methods
         * @param {string} template
         * @param {string} title
         * @param {number} ttl time to live in seconds
         * @param {string} beforeloadershow The event name before the loader shows up.
         * @param {string} afterloadershow The event name after the scope variable to show the loader was set to true.
         * @param {string} beforeloaderhide The event name before the loader will be hidden.
         * @param {string} afterloaderhide The event name after the scope variable to show the loader was set to false.
         */
        scope: {
          methods: '@',
          template: '@',
          title: '@',
          ttl: '@',
          beforeloadershow: '@',
          afterloadershow: '@',
          beforeloaderhide: '@',
          afterloaderhide: '@'
        },
        template: '<div class="http-loader__wrapper" ' +
          'ng-include="template" ' +
          'ng-show="showLoader"></div>',
        link: function ($scope) {

          /**
           * The custom event names to register.
           */
          var beforeLoaderShow =  $parse($scope.beforeloadershow)() || $scope.beforeloadershow;
          var afterLoaderShow = $parse($scope.afterloadershow)() || $scope.afterloadershow;
          var beforeLoaderHide = $parse($scope.beforeloaderhide)() || $scope.beforeloaderhide;
          var afterLoaderHide = $parse($scope.afterloaderhide)() || $scope.afterloaderhide;

          /**
           * The methods to listen to.
           */
          var methods = $parse($scope.methods)() || $scope.methods;
          methods = angular.isUndefined(methods) ? [] : methods;
          methods = angular.isArray(methods) ? methods : [methods];
          angular.forEach(methods, function (method, index) {
            methods[index] = method.toUpperCase();
          });

          /**
           * The time to live.
           */
          var ttl = $parse($scope.ttl)() || $scope.ttl;
          ttl = angular.isUndefined(ttl) ? 0 : ttl;
          ttl = Number(ttl) * 1000;
          ttl = angular.isNumber(ttl) ? ttl : 0;

          // add minimal indexOf polyfill
          if (!Array.prototype.indexOf) {
            methods.indexOf = function (value) {
              for (var i = this.length; i--;) {
                if (this[i] === value) {
                  return i;
                }
              }

              return -1;
            };
          }

          /**
           * Loader is hidden by default
           *
           * @type {boolean}
           */
          $scope.showLoader = false;
          var showLoader = $scope.showLoader;
          var timeoutId;
          var beforeEvent = '';
          var afterEvent = '';

          /**
           * Toggle the show loader.
           * Contains the logic to show or hide the loader depending
           * on the passed method
           *
           * @param {object} event
           * @param {string} method
           */
          var toggleShowLoader = function (event, method) {
            switch(event.name) {
              case 'loaderShow':
                beforeEvent = beforeLoaderShow
                afterEvent = afterLoaderShow
                break;
              case 'loaderHide':
                beforeEvent = beforeLoaderHide
                afterEvent = afterLoaderHide
                break;
            }

            if (beforeEvent !== '') { $rootScope.$broadcast(beforeEvent) } // Broadcasts a event before show or hide takes place

            if (methods.indexOf(method.toUpperCase()) !== -1) {
              showLoader = (event.name === 'loaderShow');
            } else if (methods.length === 0) {
              showLoader = (event.name === 'loaderShow');
            }

            if (ttl <= 0 || (!timeoutId && !showLoader)) {
              $scope.showLoader = showLoader;
              if (afterEvent !== '') { $rootScope.$broadcast(afterEvent) } // Broadcasts a event before show or hide takes place
              return;
            } else if (timeoutId) {
              return;
            }

            $scope.showLoader = showLoader;
            timeoutId = $timeout(function () {
              if (!showLoader) {
                $scope.showLoader = showLoader;
              }

              if (afterEvent !== '') { $rootScope.$broadcast(afterEvent) } // Broadcasts a event before show or hide takes place
              timeoutId = undefined;
            }, ttl);
          };

          $rootScope.$on("loaderShow", toggleShowLoader);
          $rootScope.$on("loaderHide", toggleShowLoader);
        }
      };
    }
  ]);

/* global angular, _, console */

/**
 * Http method interceptor. Broadcast events for show or hide the loader.
 */
angular.module('ng.httpLoader.httpMethodInterceptor', [])

  .provider('httpMethodInterceptor', function () {
    var configurations = []
    var domains = [];

    /**
     * Add route configuration.
     * @param configObject The configuration object.
     */
    this.requestConfig = function(config) {
      configurations.push(config);
    }

    this.$get = [
      '$q',
      '$rootScope',
      function ($q, $rootScope) {
        var numLoadings = 0;



        /**
         * Checks if the url is allowed by the configuration.
         *
         * @param {string} url The url to check.
         * @returns {boolean} True if the passed url is allowed, false otherwise.
         */
        var isUrlOnWhitelist = function (url) {
          for (var i = configurations.length; i--;) {
            if (url.indexOf(configurations[i]['url']) !== -1) {
              return true;
            }
          }
          return false;
        };

        /**
         * Checks if the request is allowed by the configuration.
         *
         * @param {object} config The request configuration
         * @returns {boolean} True if the request is allowed, false otherwise.
         */
        var isAllowedRequest = function (config) {
          if (isUrlOnWhitelist(config.url)) {
            for (var i = configurations.length; i--;) {
              if (config.url.indexOf(configurations[i]['url']) !== -1 && (config.headers[configurations[i]['headerName']] === configurations[i]['requestType'])) {
                return true;
              }
            }
          }
          return false;
        };

        /**
         * Emit hide loader logic
         *
         * @param {object} config
         * The response configuration
         */
        var checkAndHide = function (config) {
          if (isAllowedRequest(config) && (--numLoadings) === 0) {
            $rootScope.$emit('loaderHide', config.method);
          }
        };

        return {
          /**
           * Broadcast the loader show event
           *
           * @param {object} config
           *
           * @returns {object|Promise}
           */
          request: function (config) {
            if (isAllowedRequest(config)) {
              numLoadings++;
              $rootScope.$emit('loaderShow', config.method);
            }
            return config || $q.when(config);
          },

          /**
           * Broadcast the loader hide event
           *
           * @param {object} response
           *
           * @returns {object|Promise}
           */
          response: function (response) {
            checkAndHide(response.config);
            return response || $q.when(response);
          },

          /**
           * Handle errors
           *
           * @param {object} response
           *
           * @returns {Promise}
           */
          responseError: function (response) {
            checkAndHide(response.config);

            return $q.reject(response);
          }
        };
      }
    ];
  })

  .config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('httpMethodInterceptor');
  }]);

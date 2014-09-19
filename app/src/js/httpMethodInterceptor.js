/**
 * Http method interceptor. Broadcast events for show or hide the loader.
 */
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

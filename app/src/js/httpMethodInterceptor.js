/**
 * Http method interceptor. Broadcast events for show or hide the loader.
 */
angular.module('ng.httpLoader.httpMethodInterceptor', [])

.provider('httpMethodInterceptor', function () {
  var domains = [];
  var requestTypes = [];
  var requestHeaderName = "";

  /**
   * Add domains to the white list
   *
   * @param {string} domain
   * Added Domain to the white list domains collection
   */
  this.whitelistDomain = function (domain) {
    domains.push(domain);
  };

  /**
   * Add request types to white list.
   *
   * @param {string} request type.
   */
  this.requestType = function (requestType) {
    requestTypes.push(requestType);
  };

  /**
   * Add header name.
   *
   * @param {string} header name.
   */
  this.headerName = function (headerName) {
    requestHeaderName = headerName;
  };

  this.$get = [
    '$q',
    '$rootScope',
    function ($q, $rootScope) {
      var numLoadings = 0;

      /**
       * Check if the url domain is on the whitelist
       *
       * @param {string} url
       *
       * @returns {boolean}
       */
      var isUrlOnWhitelist = function (url) {
        for (var i = domains.length; i--;) {
          if (url.indexOf(domains[i]) !== -1) {
            return true;
          }
        }
        return false;
      };

      /**
       * Check if the request type is a allowed request type.
       *
       * @param {object} header
       *
       * @returns {boolean}
       */
      var isAllowedRequestType = function (headers) {
        for (var i = requestTypes.length; i--;) {
          if(headers[requestHeaderName]) {
            if (headers[requestHeaderName].indexOf(requestTypes[i]) !== -1) {
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
        if (isUrlOnWhitelist(config.url) && isAllowedRequestType(config.headers) && (--numLoadings) === 0) {
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

          if (isUrlOnWhitelist(config.url) && isAllowedRequestType(config.headers)) {
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

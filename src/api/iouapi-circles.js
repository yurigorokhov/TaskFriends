angular.module('iouapi-circles', [])
  .factory('circles', ['$q', function($q) {
    return {

      _toCircle: function(parseObj) {
        return parseObj.attributes.name;
      },

      //--- Methods ---
      getCircles: function() {
        var self = this;
        var def = $q.defer();
        new Parse.Query(Parse.Role).find({
          success: function(circles) {
            def.resolve(_(circles).map(function(c) {
              return self._toCircle(c);
            }));
          },
          error: function(error) {
            def.reject(error);
          }
        });
        return def.promise;
      }
    };
  }]);
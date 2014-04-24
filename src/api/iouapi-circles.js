angular.module('iouapi-circles', [])
  .factory('circles', ['$q', function($q) {
    return {

      //--- Methods ---
      getCircles: function(invitationToken) {
        var def = $q.defer();
        Parse.Cloud.run('GetUserCircles', { token: invitationToken }, {
          success: function(circles) {
            def.resolve(circles);
          },
          error: function(error) {
            def.reject(error);
          }
        });
        return def.promise;
      }
    };
  }]);
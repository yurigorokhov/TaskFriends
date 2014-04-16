angular.module('iouapi-user', [])
  .factory('user', ['$q', function($q) {
    return {

      //--- Methods ---
      getCurrent: function() {
        var self = this;
        var deferred = $q.defer();
        deferred.resolve(Parse.User.current());
        return deferred.promise;
      },

      isLoggedIn: function() {
        var deferred = $q.defer();
        this.getCurrent().then(
          function(user) {
            if(user !== null) {
              deferred.resolve();
            } else {
              deferred.reject();
            }
          }, function() {
            deferred.reject();
          });
        return deferred.promise;
      }
    };
  }]);
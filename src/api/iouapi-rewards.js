angular.module('iouapi-rewards', [])
  .factory('rewards', ['$q', function($q) {
    return {
      
      //--- Fields ---
      _rewards: null,

      //--- Methods ---
      getById: function() {
        var self = this;
        var deferred = $q.defer();
        if(self._rewards === null) {

          // fetch prizes
          var Reward = Parse.Object.extend('Reward');
          var query = new Parse.Query(Reward);
          query.find({
            success: function(results) {
              self._rewards = _(results).chain().map(function(r) {
                return {
                  name: r.attributes.name,
                  dollarValue: r.attributes.dollarValue,
                  id: r.id,
                  _parseObj: r
                };
              }).indexBy(function(r) {
                return r.id;
              }).value();
              deferred.resolve(self._rewards);
            },
            error: function(error) {
              deferred.reject(error);
            }
          });
        } else {
          deferred.resolve(self._rewards);
        }
        return deferred.promise;
      }
    };
  }]);
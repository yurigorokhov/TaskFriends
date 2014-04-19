angular.module('iouapi-tasks', [])
  .factory('tasks', ['$q', function($q) {
    return {

      //--- Fields ---
      _task: Parse.Object.extend('Task'),

      //--- Methods ---
      _toTask: function(parseObj) {
        return {
          title: parseObj.attributes.title,
          description: parseObj.attributes.description,
          prizes: parseObj.attributes.prizes,
          _parseObj: parseObj
        };
      },

      get: function() {
        var self = this;
        var deferred = $q.defer();

        // fetch prizes
        var query = new Parse.Query(self._task);
        query.find({
          success: function(results) {
            deferred.resolve(_(results).map(function(r) { return self._toTask(r); }));
          },
          error: function(error) {
            deferred.reject(error);
          }
        });
        return deferred.promise;
      },

      add: function(data, reward) {
        var self = this;
        var deferred = $q.defer();
        var task = new self._task();
        task.set('title', data.title);
        task.set('description', data.description);
        task.set('prizes', [{ user: 'myself', rewardId: reward.id }]);
        task.save(null, {
          success: function(result) {
            deferred.resolve();
          },
          error: function(task, error) {
            deferred.reject(task);
          }
        });
        return deferred.promise;
      },

      deleteTask: function(task) {
        var self = this;
        var deferred = $q.defer();
        task._parseObj.destroy({
          success: function() {
            deferred.resolve();
          },
          error: function() {
            deferred.reject();
          }
        });
        return deferred.promise;
      }
    };
  }]);
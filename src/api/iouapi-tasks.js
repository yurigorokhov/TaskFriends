angular.module('iouapi-tasks', ['iouapi-user'])
  .factory('tasks', ['$q', 'user', function($q, $user) {
    
    //--- Class Fields ---
    var TaskState = {
      OPEN: 100,
      CLAIMED: 200,
      FINISHED: 300 
    };
    return {

      //--- Fields ---
      _task: Parse.Object.extend('Task'),
      TaskState: TaskState,

      //--- Methods ---
      _toTask: function(parseObj) {
        return {
          title: parseObj.attributes.title,
          description: parseObj.attributes.description,
          prizes: parseObj.attributes.prizes,
          createdBy: $user._toUser(parseObj.attributes.createdBy),
          claimedBy: parseObj.attributes.claimedBy,
          state: parseObj.attributes.state,
          id: parseObj.id,
          _parseObj: parseObj
        };
      },

      getPermissions: function(task, user) {
        return {
          canDelete: (task.createdBy.id === user.id && task.state === TaskState.OPEN),
          canClaim: (task.createdBy.id !== user.id && task.state === TaskState.OPEN),
          isInProgress: (task.state === TaskState.CLAIMED)
        };
      },

      populatePermissions: function(tasks, user) {
        var self = this;
        return _(tasks).map(function(t) {
          var newT = t;
          newT.permissions = self.getPermissions(t, user);
          return newT;
        });
      },

      get: function(options) {
        var self = this;
        var deferred = $q.defer();
        options = options || {};

        // fetch prizes
        var query = new Parse.Query(self._task);
        query.include('createdBy');
        if('createdByUser' in options) {
          query.equalTo('createdBy', options.createdByUser._parseObj);
          options.state = options.state || TaskState.CLAIMED;
        }
        if('filterUser' in options) {
          query.notEqualTo('createdBy', options.filterUser._parseObj);
        }
        if('claimedByUser' in options) {
          query.equalTo('claimedBy', options.claimedByUser._parseObj);
          options.state = options.state || TaskState.CLAIMED;
        }
        if('notState' in options) {
          query.notEqualTo('state', options.notState);
        } else {
          options.state = options.state || TaskState.OPEN;
          query.equalTo('state', options.state);
        }
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

      add: function(data) {
        var self = this;
        var deferred = $q.defer();
        var task = new self._task();
        task.set('title', data.title);
        task.set('description', data.description);
        task.set('prizes', { reward: data.reward });
        task.save(null, {
          success: function(result) {
            deferred.resolve();
          },
          error: function(task, error) {
            deferred.reject(error);
          }
        });
        return deferred.promise;
      },

      claimTask: function(task) {
        var self = this;
        var deferred = $q.defer();
        task._parseObj.set('state', TaskState.CLAIMED);
        task._parseObj.save(null, {
          success: function(result) {
            deferred.resolve();
          },
          error: function(task, error) {
            deferred.reject(error);
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
angular.module('iouapi-tasks', ['iouapi-user'])
  .factory('tasks', ['$q', 'user', function($q, $user) {
    
    //--- Class Fields ---
    var TaskState = {
      OPEN: 100,
      CLAIMED: 200,
      PENDING_APPROVAL: 250,
      FINISHED: 300,
      REWARD_RECEIVED: 400
    };
    return {

      //--- Fields ---
      _task: Parse.Object.extend('Task'),
      TaskState: TaskState,

      //--- Methods ---
      _parseQuery: function(query) {
        var def = $q.defer();
        query.find({
          success: function(results) {
            def.resolve(results);
          },
          error: function(error) {
            def.reject(error);
          }
        });
        return def.promise;
      },

      _toTask: function(parseObj) {
        var self = this;
        return {
          title: parseObj.attributes.title,
          description: parseObj.attributes.description,
          prizes: parseObj.attributes.prizes,
          createdBy: $user._toUser(parseObj.attributes.createdBy),
          claimedBy: $user._toUser(parseObj.attributes.claimedBy),
          state: parseObj.attributes.state,
          id: parseObj.id,
          _parseObj: parseObj
        };
      },

      _getPermissions: function(task, user) {
        return {
          myPrize: task.prizes[user.id],
          canDelete: (task.createdBy.id === user.id && task.state === TaskState.OPEN),
          canEdit: (task.createdBy.id === user.id && task.state === TaskState.OPEN),
          canClaim: (task.createdBy.id !== user.id && task.state === TaskState.OPEN),
          isInProgress: (task.state === TaskState.CLAIMED),
          canComplete: (task.claimedBy !== null && task.claimedBy.id === user.id && task.state === TaskState.CLAIMED),
          canConfirmReward: (task.state === TaskState.FINISHED && task.claimedBy !== null && task.claimedBy.id === user.id),
          isAwaitingApproval: (task.state === TaskState.PENDING_APPROVAL)
        };
      },

      populatePermissions: function(tasks, user) {
        var self = this;
        return _(tasks).map(function(t) {
          return self.populatePermissionsForTask(t, user);
        });
      },

      populatePermissionsForTask: function(task, user) {
        task.permissions = this._getPermissions(task, user);
        return task;
      },

      get: function(options, circle) {
        var self = this;
        var deferred = $q.defer();
        if(!circle) {
          deferred.reject('Must specify circle');
          return deferred.promise;
        }
        options = options || {};

        // fetch prizes
        var query = new Parse.Query(self._task);
        query.equalTo('circle', circle);
        query.include('createdBy');
        query.include('claimedBy');
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

      getDashboardTasks: function(user, currentCircle) {
        var self = this;
        var def = $q.defer();
        if(!user || !currentCircle) {
          def.reject('No user or current circle was set');
        } else {

          // TODO
          var todoQuery = new Parse.Query('Task');
          todoQuery.equalTo('circle', currentCircle);
          todoQuery.include('createdBy');
          todoQuery.equalTo('claimedBy', user._parseObj);
          todoQuery.containedIn('state', [TaskState.PENDING_APPROVAL, TaskState.CLAIMED]);

          // assets
          var assetQuery = new Parse.Query('Task');
          assetQuery.equalTo('circle', currentCircle);
          assetQuery.include('createdBy');
          assetQuery.equalTo('claimedBy', user._parseObj);
          assetQuery.equalTo('state', TaskState.FINISHED);

          // debts
          var debtQuery = new Parse.Query('Task');
          debtQuery.equalTo('circle', currentCircle);
          debtQuery.include('createdBy');
          debtQuery.include('claimedBy');
          debtQuery.equalTo('createdBy', user._parseObj);
          debtQuery.equalTo('state', TaskState.FINISHED);

          // my tasks
          var myTasks = new Parse.Query('Task');
          myTasks.equalTo('circle', currentCircle);
          myTasks.include('claimedBy');
          myTasks.equalTo('createdBy', user._parseObj);
          myTasks.lessThan('state', TaskState.FINISHED);
          var postProcess = function(tasks) {
            return _(tasks).map(function(t) {
              return self.populatePermissionsForTask(self._toTask(t), user);
            });
          };

          // Run queries
          $q.all([
            self._parseQuery(todoQuery), 
            self._parseQuery(assetQuery), 
            self._parseQuery(debtQuery), 
            self._parseQuery(myTasks)]
          ).then(function(res) {
            def.resolve({
              todoTasks: postProcess(res[0]),
              assetTasks: postProcess(res[1]),
              debtTasks: postProcess(res[2]),
              myOpenTasks: postProcess(res[3])
            });
          }, function(error) {
            def.reject(error);
          });
        }
        return def.promise;
      },

      add: function(data, circle) {
        var self = this;
        var deferred = $q.defer();
        var task = new self._task();
        task.set('title', data.title);
        if(circle) {
          task.set('circle', circle);
        }
        task.set('description', data.description);
        task.set('prizes', { reward: data.reward });
        task.save(null, {
          success: function(result) {
            deferred.resolve(self._toTask(result));
          },
          error: function(task, error) {
            deferred.reject(error);
          }
        });
        return deferred.promise;
      },

      save: function(task, data) {
        var self = this;
        var deferred = $q.defer();
        task._parseObj.set('title', data.title);
        task._parseObj.set('description', data.description);
        task._parseObj.set('prizes', { reward: data.reward });
        task._parseObj.save(null, {
          success: function(result) {
            deferred.resolve(self._toTask(result));
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
            deferred.resolve(self._toTask(result));
          },
          error: function(task, error) {
            deferred.reject(error);
          }
        });
        return deferred.promise;
      },

      requestCompletion: function(task) {
        var self = this;
        var deferred = $q.defer();
        task._parseObj.set('state', TaskState.PENDING_APPROVAL);
        task._parseObj.save(null, {
          success: function(result) {
            deferred.resolve(self._toTask(result));
          },
          error: function(task, error) {
            deferred.reject(error);
          }
        });
        return deferred.promise;
      },

      confirmCompletion: function(task) {
        var self = this;
        var deferred = $q.defer();
        task._parseObj.set('state', TaskState.FINISHED);
        task._parseObj.save(null, {
          success: function(result) {
            deferred.resolve(self._toTask(result));
          },
          error: function(task, error) {
            deferred.reject(error);
          }
        });
        return deferred.promise;
      },

      confirmRewardReceived: function(task) {
        var self = this;
        var deferred = $q.defer();
        task._parseObj.set('state', TaskState.REWARD_RECEIVED);
        task._parseObj.save(null, {
          success: function(result) {
            deferred.resolve(self._toTask(result));
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
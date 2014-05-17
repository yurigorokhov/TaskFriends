angular.module('controllers')
  .controller('DashboardCtrl', ['$scope', 'tasks', 'blockUI', 'UserService', 'CircleService', '$q', 'toaster', '$modal',
    function ($scope, tasks, $blockUI, UserService, CircleService, $q, toaster, $modal) {
      var self = this;
      $scope.myOpenTasks = [];
      $scope.todoTasks = [];
      $scope.debtTasks = [];
      $scope.assetTasks = [];
      var refreshDasboard = function() {
        if(UserService.User === null || CircleService.getCurrentCircle() === null) {
          return;
        }
        $blockUI.start();
        tasks.getDashboardTasks(UserService.User, CircleService.getCurrentCircle()).then(
          function(res) {
            $blockUI.reset();
            $scope.todoTasks = res.todoTasks;
            $scope.assetTasks = res.assetTasks;
            $scope.debtTasks = res.debtTasks;
            $scope.myOpenTasks = res.myOpenTasks;
          },
          function() {
            $blockUI.reset();
            toaster.pop('error', 'Error', 'There was an error loading the Dashboard');
          }
        );
      };
      refreshDasboard();
      $scope.$on('TaskUpdate', function(e, task) {
        refreshDasboard();
      });

      // Refresh the dashboard anytime the user or circle changes
      CircleService.observe(refreshDasboard);

      $scope.deleteTask = function(task) {
        tasks.deleteTask(task).then(function() {
          toaster.pop('success', 'Success', 'Your task was successfully deleted');
          $scope.myOpenTasks = _($scope.myOpenTasks)
            .filter(function(t) {
              return t.id !== task.id;
            });
        }, function() {
          toaster.pop('error', 'Error', 'There was an error deleting the task');
        });
      };

      $scope.confirmReward = function(task) {
        tasks.confirmRewardReceived(task).then(function(newTask) {
          toaster.pop('success', 'Success', 'Hope you enjoyed the reward! The task has been removed from your earned list');
          $scope.assetTasks = _($scope.assetTasks).filter(function(t) {
            return t.id !== task.id;
          });
        }, function() {
          toaster.pop('error', 'Error', 'There was an error updating the task');
        });
      };

      $scope.completeTask = function(task) {
        tasks.requestCompletion(task).then(function(newTask) {
          toaster.pop('success', 'Success', 'Your task has been submitted to the creator for review');
          $scope.todoTasks = _($scope.todoTasks)
            .map(function(t) {
              var currTask = t;
              if(currTask.id === newTask.id) {
                currTask = newTask;
                currTask.type = t.type;
              }
              return tasks.populatePermissionsForTask(currTask, UserService.User);
            });
        }, function() {
          toaster.pop('error', 'Error', 'There was an error completing the task');
        });
      };

      // edit task modal
      $scope.editTask = function (t) {
        var modalInstance = $modal.open({
          templateUrl: 'partials/createatask.html',
          controller: 'NewTaskModal',
          resolve: {
            items: function() {
              return {
                state: 'edit',
                task: t,
                processTask: function(newTask) {
                  $scope.myOpenTasks = _($scope.myOpenTasks).map(function(ta) {
                    if(ta.id === newTask.id) {
                      ta = newTask;
                    }
                    return tasks.populatePermissionsForTask(ta, UserService.User);
                  });
                }
              };
            }
          }
        });
        modalInstance.result.then(function (data) {
        }, function () { });
      };

      // new task modal
      $scope.open = function () {
        var modalInstance = $modal.open({
          templateUrl: 'partials/createatask.html',
          controller: 'NewTaskModal',
          resolve: {
            items: function() {
              return {
                processTask: function(newTask) {
                  $scope.myOpenTasks.push(tasks.populatePermissionsForTask(newTask, UserService.User));
                }
              };
            }
          }
        });
        modalInstance.result.then(function (data) {
        }, function () { });
      };
    }
  ]);
angular.module('controllers')
  .controller('DashboardCtrl', ['$scope', 'tasks', 'blockUI', 'UserService', '$q', 'toaster', '$modal',
    function ($scope, tasks, $blockUI, UserService, $q, toaster, $modal) {
    	$scope.tasks = [];
      $scope.myOpenTasks = [];
      $scope.todoTasks = [];
      $scope.debtTasks = [];
      $scope.assetTasks = [];
      $scope.$watch('tasks', function(newVal) {
        $scope.myOpenTasks = _(newVal).filter(function(t) {
          return t.type === 'myopen';
        });
        $scope.todoTasks = _(newVal).filter(function(t) {
          return t.type === 'todo';
        });
        $scope.debtTasks = _(newVal).filter(function(t) {
          return t.type === 'debt';
        });
        $scope.assetTasks = _(newVal).filter(function(t) {
          return t.type === 'asset';
        });
      });
      var refreshDasboard = function() {
        $blockUI.start();
        tasks.getDashboardTasks(UserService.User).then(
          function(res) {
            $blockUI.reset();
            $scope.tasks = _([
                _(res.todoTasks).map(function(t) {
                  t.type = 'todo'; return t;
                }),
                _(res.assetTasks).map(function(t) {
                  t.type = 'asset'; return t;
                }),
                _(res.debtTasks).map(function(t) {
                  t.type = 'debt'; return t;
                }),
                _(res.myOpenTasks).map(function(t) {
                  t.type = 'myopen'; return t;
                })
              ]).flatten();
          },
          function() {
            $blockUI.reset();
            toaster.pop('error', 'Error', 'There was an error loading the Dashboard');
          }
        );
      };
      if(UserService.User.currentCircle) {
        refreshDasboard();
      }

      // Refresh the dashboard anytime the user changes
      UserService.observeCircleChange(refreshDasboard);

      $scope.deleteTask = function(task) {
        tasks.deleteTask(task).then(function() {
          toaster.pop('success', 'Success', 'Your task was successfully deleted');
          $scope.tasks = _($scope.tasks)
            .filter(function(t) {
              return t.id !== task.id;
            });
        }, function() {
          toaster.pop('error', 'Error', 'There was an error deleting the task');
        });
      };

      $scope.completeTask = function(task) {
        tasks.requestCompletion(task).then(function() {
          toaster.pop('success', 'Success', 'Your task has been submitted to the creator for review');
          $scope.tasks = _($scope.tasks)
            .map(function(t) {
              if(t.id === task.id) {
                t.state = tasks.TaskState.PENDING_APPROVAL;
              }
              return t;
            });
        }, function() {
          toaster.pop('error', 'Error', 'There was an error completing the task');
        });
      };

      // new task modal
      $scope.open = function () {
        var modalInstance = $modal.open({
          templateUrl: 'partials/createatask.html',
          controller: 'NewTaskModal',
          resolve: {
            items: function() {
              return {
                addTask: function(newTask) {
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
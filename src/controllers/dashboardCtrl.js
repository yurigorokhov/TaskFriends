angular.module('controllers')
  .controller('DashboardCtrl', ['$scope', 'tasks', 'blockUI', 'UserService', '$q', 'toaster', '$modal',
    function ($scope, tasks, $blockUI, UserService, $q, toaster, $modal) {
    	$scope.todoTasks = [];
      $scope.assetTasks = [];
      $scope.debtTasks = [];
      $scope.myOpenTasks = [];
      var refreshDasboard = function() {
        $blockUI.start();
        tasks.getDashboardTasks(UserService.User).then(
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
      if(UserService.User.currentCircle) {
        refreshDasboard();
      }

      // Refresh the dashboard anytime the user changes
      UserService.observeCircleChange(refreshDasboard);

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
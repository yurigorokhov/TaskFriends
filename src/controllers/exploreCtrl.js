angular.module('controllers')
  .controller('ExploreCtrl', ['$scope', '$q', 'tasks', 'blockUI', 'toaster', 'UserService',
    function ($scope, $q, tasks, $blockUI, toaster, UserService) {
      $scope.claim = function(task) {
        tasks.claimTask(task).then(function() {
          $scope.tasks = _($scope.tasks).filter(function(t) {
            return t.id !== task.id;
          });
          toaster.pop('success', 'Success', 'The task has been added to your TODO list');
        }, function() {
          toaster.pop('error', 'Error', 'There was an error claiming the task');
        });
      };

      // load tasks
      var reloadTasks = function() {
        $blockUI.start();
        tasks.get({filterUser: UserService.User}, UserService.User.currentCircle).then(
          function(tasksResult) {
            $blockUI.stop();
            $scope.tasks = tasks.populatePermissions(tasksResult, UserService.User);
          },
          function() {
            $blockUI.stop();
            toaster.pop('error', 'Error', 'There was an error loading tasks');
          });
      };
      reloadTasks();
      UserService.observeCircleChange(reloadTasks);
    }
  ]);
angular.module('controllers')
  .controller('ExploreCtrl', ['$scope', '$q', 'tasks', 'blockUI', 'toaster', 'UserService', 'CircleService',
    function ($scope, $q, tasks, $blockUI, toaster, UserService, CircleService) {
      $scope.tasks = [];
      $scope.claim = function(task) {
        tasks.claimTask(task).then(function() {
          $scope.tasks = _($scope.tasks).filter(function(t) {
            return t.id !== task.id;
          });
          toaster.pop('success', 'Success', 'The task has been added to your Task list');
        }, function() {
          toaster.pop('error', 'Error', 'There was an error claiming the task');
        });
      };

      // load tasks
      var reloadTasks = function() {
        $blockUI.start();
        var circle = CircleService.getCurrentCircle();
        if(!circle) {
          return;
        }
        tasks.get({filterUser: UserService.User}, circle).then(
          function(tasksResult) {
            $blockUI.reset();
            $scope.tasks = tasks.populatePermissions(tasksResult, UserService.User);
          },
          function() {
            $blockUI.reset();
            toaster.pop('error', 'Error', 'There was an error loading tasks');
          });
      };
      reloadTasks();
      CircleService.observe(reloadTasks);
    }
  ]);
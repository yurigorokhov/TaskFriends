angular.module('controllers')
  .controller('NewTaskModal', ['$scope', '$modalInstance', 'tasks', 'toaster', 'items',
    function($scope, $modalInstance, tasks, toaster, items) {
      $scope.task = {
        title: '',
        description: '',
        reward: ''
      };
      $scope.create = function () {
        tasks.add($scope.task).then(
          function(newTask) {
            $modalInstance.close();
            items.addTask(newTask);
            toaster.pop('success', 'Success', 'Your task was created successfully');
        }, function() {
        });
      };
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }
  ]);
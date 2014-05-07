angular.module('controllers')
  .controller('NewTaskModal', ['$scope', '$modalInstance', 'tasks', 'toaster', 'items', 'UserService',
    function($scope, $modalInstance, tasks, toaster, items, UserService) {
      $scope.state = items.state || 'create';
      if((items.state === 'edit' || items.state === 'confirmCompletion')&& items.task === null) {
        throw('No task was supplied');
      }
      $scope.dialog = {
        title: '',
        buttonOk: '',
        inputsDisabled: false,
        buttonCancel: 'Cancel'
      };
      switch($scope.state) {
        case 'create':
          $scope.dialog.title = 'Create a task';
          $scope.dialog.buttonOk = 'Create';
          break;
        case 'edit':
          $scope.dialog.title = 'Edit task';
          $scope.dialog.buttonOk = 'Save';
          break;
        case 'confirmCompletion':
          $scope.dialog.title = 'Is this task done?';
          $scope.dialog.buttonOk = 'Confirm';
          $scope.dialog.inputsDisabled = true;
          break;
      }
      $scope.task = items.task ? {
        title: items.task.title,
        description: items.task.description,
        reward: items.task.prizes[UserService.User.id].reward
      } : {
        title: '',
        description: '',
        reward: ''
      };
      $scope.processTask = function (task) {
        switch($scope.state) {
          case 'create':
            tasks.add(task).then(
              function(newTask) {
                $modalInstance.close();
                items.processTask(newTask);
                toaster.pop('success', 'Success', 'Your task was created successfully');
              }, function() {
            }); 
            break;
          case 'edit':
            tasks.save(items.task, task).then(
              function(newTask) {
                $modalInstance.close();
                items.processTask(newTask);
                toaster.pop('success', 'Success', 'Your task was saved successfully');
              }, function() {
            });
            break;
          case 'confirmCompletion':
            tasks.confirmCompletion(items.task).then(
              function(newTask) {
                $modalInstance.close();
                items.processTask(newTask);
                toaster.pop('success', 'Success', 'Congratulations, your task is completed and added to your debts');
              }, function() {
            });
            break;
        }
      };
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }
  ]);
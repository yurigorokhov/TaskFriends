angular.module('controllers')
  .controller('LoginCtrl', ['$scope', '$location', 'usSpinnerService', 'user', 'blockUI', 'UserService', 'toaster', '$modalInstance',
    function($scope, $location, usSpinnerService, $user, $blockUI, UserService, toaster, $modalInstance) {
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
      $scope.login = function(userData) {
        $blockUI.start();
        $user.login(userData.email, userData.password).then(
          function(newUser) {
            UserService.setUser(newUser);
            $modalInstance.dismiss('cancel');
            $location.path('/dashboard');
          },
          function(error) {
            $blockUI.stop();
            toaster.pop('error', 'Error', 'There was an error logging in, please try again.');
          } 
        );
      };
      $scope.register = function(userData) {
        $blockUI.start();
        $user.register(userData).then(
          function(newUser) {
            UserService.setUser(newUser);
            $modalInstance.dismiss('cancel');
            $location.path('/dashboard');
          },
          function(error) {
            $blockUI.stop();
            toaster.pop('error', 'Error', error);
          } 
        );
      };
      $scope.facebookLogin = function() {
        $blockUI.start();
        $user.facebookLogin().then(
          function(user) {
            UserService.setUser(user);
            $modalInstance.dismiss('cancel');
            $location.path('/dashboard');
            $blockUI.stop();
          }, function(error) {
            $blockUI.stop();
            toaster.pop('error', 'Error', 'There was an error logging in, please try again.');
            UserService.logOut();
          });
        };
    }
  ]);
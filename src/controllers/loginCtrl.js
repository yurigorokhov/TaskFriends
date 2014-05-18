angular.module('controllers')
  .controller('LoginCtrl', ['$scope', '$location', 'usSpinnerService', 'user', 'blockUI', 'UserService', 'toaster', '$modalInstance', 'items',
    function($scope, $location, usSpinnerService, $user, $blockUI, UserService, toaster, $modalInstance, items) {
      $scope.registerData = { };
      $scope.badtoken = false;
      $scope.mode = (items.mode === true);
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
      var invitationToken = $location.search().invite;
      if(!_(invitationToken).isEmpty()) {
        $user.verifyInvitation(invitationToken).then(function(result) {
          $scope.registerData.email = $scope.registerData.email || result.email;
        }, function() {
          $scope.badtoken = true;          
        });
      }
      $scope.login = function(userData) {
        $blockUI.start();
        $user.login(userData.email, userData.password).then(
          function(newUser) {
            toaster.clear();
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

        // Check for an invitation token
        var invitationToken = $location.search().invite;
        $location.search('invite', null);
        $user.register(userData, invitationToken).then(
          function(newUser) {
            toaster.clear();
            UserService.setUser(newUser);
            $modalInstance.dismiss('cancel');
            $location.path('/dashboard');
          },
          function(error) {
            $blockUI.stop();
            switch(error) {
              case 'bad-invitation-token': 
                toaster.pop('error', 'Error', 'The invitation you are using may have already been used or is invalid');
                break;
              case 'missing-invitation-token': 
                toaster.pop('error', 'Error', 'You must have an invitation to create an account at this time');
                break;
              default: 
                toaster.pop('error', 'Error', error);
            }
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
angular.module('controllers')
  .controller('InviteFriendsCtrl', ['$scope', '$modalInstance', 'toaster', 'UserService', 'user', 'blockUI',
    function($scope, $modalInstance, toaster, UserService, user, $blockUI) {
      $scope.invitations = {
        emails: ''
      };
      $scope.currentCircle = UserService.User.currentCircle;
      $scope.invite = function (invitations) {
        $blockUI.start();
        user.inviteViaEmail(invitations.emails.split(',')).then(
          function() {
            $modalInstance.close();
            $blockUI.reset();
            toaster.pop('success', 'Success', 'Your invitations have been sent!');
          },
          function() {
            $blockUI.reset();
            toaster.pop('error', 'Error', 'There was an error sending the invitations, please try again');
          }
        );
      };
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }
  ]);
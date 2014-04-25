angular.module('controllers')
  .controller('ParentCtrl', ['$scope', '$location', 'user', 'UserService', 'toaster', 'blockUI', '$modal',
    function ($scope, $location, user, UserService, toaster, $blockUI, $modal) {
      $scope.currentUser = null;
      $scope.circles = null;
      $scope.dashboardActive = '';
      $scope.exploreActive = '';
      UserService.observe(function(newValue) {
        $scope.currentUser = newValue.user;
        $scope.circles = newValue.circles;
      });
      UserService.observeCircleChange(function(circle) {
        $scope.currentCircle = circle;
      });
      $scope.$on('$locationChangeSuccess', function(e) {
        switch($location.url()) {
          case '/dashboard':
            $scope.dashboardActive = 'active';
            $scope.exploreActive = '';
            break;
          case '/explore':
            $scope.dashboardActive = '';
            $scope.exploreActive = 'active';
            break;
        }
      });
      user.getCurrent().then(function(currentUser) {
        if(currentUser !== null) {
          UserService.setUser(currentUser);
        }
      });
      $scope.logout = function() {
        UserService.logOut();
        $location.path('/login');
      };
      $scope.isActiveCircle = function(c) {
        return c === $scope.currentCircle ? 'active' : '';
      };
      $scope.setCurrentCircle = function(c) {
        $blockUI.start();
        UserService.changeCircle(c).then(
          function() {
            $blockUI.reset();
            $scope.currentCircle = c;
          },
          function() {
            $blockUI.reset();
            toaster.pop('error', 'Error', 'There was an error loading ' + c);
          }
        );
      };

      // invite friends modal
      $scope.inviteFriends = function () {
        var modalInstance = $modal.open({
          templateUrl: 'partials/invitefriends.html',
          controller: 'InviteFriendsCtrl',
          resolve: {}
        });
        modalInstance.result.then(function (data) {
        }, function () { });
      };
    }
  ]);
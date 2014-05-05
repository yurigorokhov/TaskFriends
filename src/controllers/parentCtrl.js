angular.module('controllers')
  .controller('ParentCtrl', ['$scope', '$location', 'user', 'UserService', 'toaster', 'blockUI', '$modal', 'tasks',
    function ($scope, $location, user, UserService, toaster, $blockUI, $modal, tasks) {
      $scope.currentUser = null;
      $scope.circles = null;
      $scope.dashboardActive = '';
      $scope.exploreActive = '';
      $scope.messages = [];
      UserService.observe(function(newValue) {
        $scope.currentUser = newValue.user;
        $scope.circles = newValue.circles;
      });
      UserService.observeCircleChange(function(circle) {
        $scope.currentCircle = circle;

        // Find tasks that need action
        tasks.get({
          createdByUser: UserService.User,
          state: tasks.TaskState.PENDING_APPROVAL
        }, circle).then(function(tasks) {
          $scope.messages = _(tasks).map(function(t) {
            return { task: t };
          });
        }, function() {
          toaster.pop('error', 'Error', 'There was an error loading your messages');
        });
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
      $scope.navigateToTask = function(task) {
        //TODO: approve task workflow
      };
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
angular.module('controllers')
  .controller('ParentCtrl', ['$scope', '$location', 'user', 'UserService', 'MessageService', 'toaster', 'blockUI', '$modal', 'tasks',
    function ($scope, $location, user, UserService, MessageService, toaster, $blockUI, $modal, tasks) {
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
      });
      MessageService.observe(function(messages) {
        $scope.messages = messages;
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
      $scope.processMessage = function(message) {
        var modalInstance = $modal.open({
          templateUrl: 'partials/createatask.html',
          controller: 'NewTaskModal',
          resolve: {
            items: function() {
              return {
                state: 'confirmCompletion',
                task: message.task,
                processTask: function(newTask) {
                  MessageService.complete(message);
                  $scope.$broadcast('TaskUpdate', newTask);
                }
              };
            }
          }
        });
        modalInstance.result.then(function (data) {
        }, function () { });
      };
      $scope.logout = function() {
        UserService.logOut();
        $location.path('/landing');
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
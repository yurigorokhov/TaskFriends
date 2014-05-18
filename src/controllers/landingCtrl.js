angular.module('controllers')
  .controller('LandingCtrl', ['$scope', '$modal', '$location', 'user', function($scope, $modal, $location, user) {
    $scope.registrationEnabled = 'invite' in $location.search();
    $scope.startLogin = function(mode) {
      var modalInstance = $modal.open({
        templateUrl: 'partials/login.html',
        controller: 'LoginCtrl',
        resolve: {
          items: function() {
            return {
              mode: mode
            };
          }
        }
      });
      modalInstance.result.then(function (data) {
      }, function () { });
    };
  }
]);

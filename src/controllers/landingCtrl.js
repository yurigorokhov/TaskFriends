angular.module('controllers')
  .controller('LandingCtrl', ['$scope', '$modal', '$location', function($scope, $modal, $location) {
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

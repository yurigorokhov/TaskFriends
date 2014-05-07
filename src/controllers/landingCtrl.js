angular.module('controllers')
  .controller('LandingCtrl', ['$scope', '$modal', function($scope, $modal) {
    $scope.startLogin = function() {
      var modalInstance = $modal.open({
        templateUrl: 'partials/login.html',
        controller: 'LoginCtrl',
        resolve: {
          items: function() {
            return {
            };
          }
        }
      });
      modalInstance.result.then(function (data) {
      }, function () { });
    };
  }
]);

Parse.initialize("TnKwlgf74fHAhpmQKtOLR0OS0exGelFKLC3u88nU", "nWdvt7vCsQxcgflTwtIX9S6bprHWDbdpJqFmFZAo");

//--- Modules ---
var iouApp = angular.module('iou', [
  'ngRoute',
  'controllers',
  'iouapi'
]);

//--- Routing ---
iouApp.config(['$routeProvider',
  function($routeProvider) {
    authFunc = function(isAuth) {
      return function($q, $location, user) {
        var deferred = $q.defer();
        user.isLoggedIn().then(
          function() {
            if(isAuth) {
              $location.path('/dashboard');
              deferred.reject();
            } else {
              deferred.resolve();
            }
        }, function() {
          if(!isAuth) {
            $location.path('/login');
            deferred.reject();
          } else {
            deferred.resolve();
          }
        });
        return deferred.promise;
      };
    };
    $routeProvider.
      when('/login', {
        templateUrl: 'partials/login.html',
        controller: 'LoginCtrl',
        resolve: {
          authenticate: authFunc(true)
        }
      }).when('/dashboard', {
        templateUrl: 'partials/dashboard.html',
        controller: 'DashboardCtrl',
        resolve: {
          authenticate: authFunc(false)
        }
      }).when('/explore', {
        templateUrl: 'partials/explore.html',
        controller: 'ExploreCtrl',
        resolve: {
          authenticate: authFunc(false)
        }
      }).otherwise({
        redirectTo: '/dashboard'
      });
  }]);

//--- Controllers ---
var controllers = angular.module('controllers', ['ui.bootstrap']);
controllers.controller('ParentCtrl', ['$scope', 'user',
  function ($scope, user) {
    $scope.isLoggedIn = false;
    user.isLoggedIn().then(function() {
      $scope.isLoggedIn = true;
    });
  }
]);
controllers.controller('DashboardCtrl', ['$scope',
  function ($scope) {
  	$scope.tasks = dummyTasks;
  }
]);
controllers.controller('LoginCtrl', ['$scope', '$location',
  function($scope, $location) {
    $scope.login = function() {
      Parse.FacebookUtils.logIn(null, {
      success: function(user) {
        if (!user.existed()) {
          console.log("User signed up and logged in through Facebook!");
        } else {
          console.log("User logged in through Facebook!");
        }
        $scope.$apply(function() {
          $scope.$parent.isLoggedIn = true;
          $location.path('/dashboard');
        });
      },
      error: function(user, error) {
        alert("User cancelled the Facebook login or did not fully authorize.");
      }
    });
    };
  }
]);
controllers.controller('NewTaskModal', ['$scope', '$modalInstance', 'tasks', 'items',
  function($scope, $modalInstance, tasks, items) {
    var rewardsById = {};
    $scope.task = {
      title: '',
      description: '',
      reward: null
    };
    $scope.reward = '';
    rewardsById = items.getRewards();
    $scope.rewards = _(rewardsById).values();
	  $scope.create = function () {
      tasks.add($scope.task, rewardsById[$scope.task.reward]).then(
        function() {
          $modalInstance.close();
          items.refresh();
      }, function() {
      });
  	};
  	$scope.cancel = function () {
    	$modalInstance.dismiss('cancel');
  	};
  }
]);
controllers.controller('ExploreCtrl', ['$scope', '$modal', '$q', 'rewards', 'tasks',
  function ($scope, $modal, $q, rewards, tasks) {
    var rewardsResultById = {};
    $scope.refreshTasks = function() {
      $q.all([tasks.get(), rewards.getById()]).then(
        function(res) {
          var tasksResult = res[0];
          rewardsResultById = res[1];
          var tasksWithRewards = _(tasksResult).map(function(t) {
            var newT = t;
            newT.prizes = _(t.prizes).map(function(p) {
              return {
                user: p.user,
                reward: rewardsResultById[p.rewardId]
              };
            });

            // Total prize worth
            newT.dollarValue = _(newT.prizes).reduce(function(a, i) { return a + i.reward.dollarValue; }, 0);
            return newT;
          });
          $scope.tasks = tasksWithRewards;
        },
        function() {

        });
    };
    $scope.refreshTasks();

  	// new task modal
  	$scope.open = function () {
	    var modalInstance = $modal.open({
	      templateUrl: 'partials/createatask.html',
	      controller: 'NewTaskModal',
	      resolve: {
          items: function() {
              return {
                refresh: $scope.refreshTasks,
                getRewards: function() {
                  return rewardsResultById;
                }
              };
	         }
        }
    	});

    	modalInstance.result.then(function (data) {
    	}, function () { });
	};

  }
]);
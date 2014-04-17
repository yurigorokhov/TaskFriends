Parse.initialize("TnKwlgf74fHAhpmQKtOLR0OS0exGelFKLC3u88nU", "nWdvt7vCsQxcgflTwtIX9S6bprHWDbdpJqFmFZAo");

//--- Modules ---
var iouApp = angular.module('iou', [
  'ngRoute',
  'controllers',
  'iouapi',
  'angularSpinner',
  'blockUI',
]);

//--- Routing ---
iouApp.config(['$routeProvider', 'blockUIConfigProvider',
  function($routeProvider, blockUIConfigProvider) {

    // Block UI
    blockUIConfigProvider.templateUrl('/partials/spinner.html');
    blockUIConfigProvider.autoBlock(false);

    // Authentication
    authFunc = function(isAuth) {
      return function($q, $location, user) {
        var deferred = $q.defer();
        user.getCurrent().then(function(currentUser) {
            if(currentUser === null) {
              if(!isAuth) {
                $location.path('/login');
                deferred.reject();
              } else {
                deferred.resolve();
              }
            } else {
              if(isAuth) {
                $location.path('/dashboard');
                deferred.reject();
              } else {
                deferred.resolve();
              }
            }
        });
        return deferred.promise;
      };
    };

    // Routing
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
controllers.controller('ParentCtrl', ['$scope', '$location', 'user',
  function ($scope, $location, user) {
    $scope.currentUser = null;
    user.getCurrent().then(function(currentUser) {
      $scope.currentUser = currentUser;
    });
    $scope.logout = function() {
      user.logout();
      $scope.currentUser = null;
      $location.path('/login');
    };
  }
]);
controllers.controller('DashboardCtrl', ['$scope',
  function ($scope) {
  	$scope.tasks = dummyTasks;
  }
]);
controllers.controller('LoginCtrl', ['$scope', '$location', 'usSpinnerService', 'user', 'blockUI',
  function($scope, $location, usSpinnerService, $user, blockUI) {
    $scope.login = function() {
      blockUI.start();
      $scope.loginError = false;
      $user.facebookLogin().then(
        function(user) {
          $scope.$parent.currentUser = user;
          $location.path('/dashboard');
          blockUI.stop();
        }, function(error) {
          blockUI.stop();
          $scope.loginError = true;
          $scope.$parent.currentUser = null;
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
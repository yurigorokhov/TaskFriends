Parse.initialize("TnKwlgf74fHAhpmQKtOLR0OS0exGelFKLC3u88nU", "nWdvt7vCsQxcgflTwtIX9S6bprHWDbdpJqFmFZAo");

//--- Modules ---
var iouApp = angular.module('iou', [
  'ngRoute',
  'controllers',
  'iouapi',
  'angularSpinner',
  'blockUI'
]);

//--- Routing ---
iouApp.config(['$routeProvider', 'blockUIConfigProvider',
  function($routeProvider, blockUIConfigProvider) {

    // Block UI
    blockUIConfigProvider.templateUrl('/partials/spinner.html');
    blockUIConfigProvider.autoBlock(false);

    // Authentication
    authFunc = function(isAuth) {
      return function($q, $location, user, UserService) {
        var deferred = $q.defer();
        if(UserService.User === null) {
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

//--- Services ---
iouApp.service('UserService', function(user) {
  this.User = null;
  this.setUser = function(user) {
    this.User = user;
  };
  this.logOut = function() {
    user.logout();
    this.User = null;
  };
});
iouApp.service('ErrorService', function() {
  this._errorId = 0;
  this.Errors = [];
  this.errorMap = {};
  this.clean = function() {
    this.Errors = [];
    this.errorMap = {};
  };
  this.showError = function(msg) {
    var self = this;
    var id = self._errorId++;
    self.errorMap[id] = msg;
    self.Errors.push(msg);
    return {
      remove: function() {
        self.errorMap[id] = null;
        self.Errors = _(self.errorMap)
          .chain()
          .filter(function(x) { 
            return x !== null; 
          })
          .values()
          .value();
      }
    };
  };
});

//--- Controllers ---
var controllers = angular.module('controllers', ['ui.bootstrap']);
controllers.controller('ParentCtrl', ['$scope', '$location', 'user', 'UserService', 'ErrorService',
  function ($scope, $location, user, UserService, ErrorService) {
    $scope.UserService = UserService;
    $scope.ErrorService = ErrorService;
    $scope.$watch('UserService.User', function (newValue) {
        $scope.currentUser = newValue;
    });
    $scope.$watch('ErrorService.Errors', function (newValue) {
        $scope.errors = newValue;
    });
    user.getCurrent().then(function(currentUser) {
      UserService.setUser(currentUser);
    });
    $scope.logout = function() {
      UserService.logOut();
      $location.path('/login');
    };
  }
]);
controllers.controller('DashboardCtrl', ['$scope',
  function ($scope) {
  	$scope.tasks = dummyTasks;
  }
]);
controllers.controller('LoginCtrl', ['$scope', '$location', 'usSpinnerService', 'user', 'blockUI', 'UserService', 'ErrorService',
  function($scope, $location, usSpinnerService, $user, $blockUI, UserService, ErrorService) {
    $scope.login = function() {
      $blockUI.start();
      ErrorService.clean();
      $user.facebookLogin().then(
        function(user) {
          UserService.setUser(user);
          $location.path('/dashboard');
          $blockUI.stop();
        }, function(error) {
          $blockUI.stop();
          ErrorService.showError('There was an error logging in, please try again.');
          UserService.logOut();
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
controllers.controller('ExploreCtrl', ['$scope', '$modal', '$q', 'rewards', 'tasks', 'blockUI', 'ErrorService',
  function ($scope, $modal, $q, rewards, tasks, $blockUI, ErrorService) {
    var rewardsResultById = {};
    $scope.deleteTask = function(task) {
      ErrorService.clean();
      tasks.deleteTask(task).then(function() {
        $scope.refreshTasks();
      }, function() {
        ErrorService.showError('There was an error deleting the task');
      });
    };
    $scope.refreshTasks = function() {
      $blockUI.start();
      $q.all([tasks.get(), rewards.getById()]).then(
        function(res) {
          $blockUI.stop();
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
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
iouApp.service('AlertService', ['$timeout', function($timeout) {
  this._observers = [];
  this._alertId = 0;
  this._alerts = [];
  this._modifyAlerts = function(func) {
    var self = this;
    self._alerts = func(self._alerts);
    _(self._observers).each(function(func) { func(self._alerts); });
  };
  this.addObserver = function(observer) {
    this._observers.push(observer);
  };
  this.clean = function() {
    this._modifyAlerts(function() { return []; });
  };
  this.error = function(msg) {
    return this._message(msg, 'error');
  };
  this.success = function(msg) {
    return this._message(msg, 'success');
  };
  this._message = function(msg, type) {
    var self = this;
    type = type || 'success';
    var id = self._alertId++;
    self._modifyAlerts(function(alerts) { 
      alerts.push({ id: id, text: msg, type: type });
      return alerts;
    });
    var removeSelf = function() {
        self._modifyAlerts(function(alerts) {
          return alerts.filter(function(x) { 
            return x.id !== id; 
          });
        });
      };
    return {
      remove: removeSelf,
      timeout: function(milliseconds) {
        milliseconds = milliseconds || 3000;
        $timeout(removeSelf, milliseconds);
      }
    };
  };
}]);

//--- Controllers ---
var controllers = angular.module('controllers', ['ui.bootstrap']);
controllers.controller('ParentCtrl', ['$scope', '$location', 'user', 'UserService', 'AlertService',
  function ($scope, $location, user, UserService, AlertService) {
    $scope.errors = [];
    $scope.successes = [];
    $scope.dashboardActive = '';
    $scope.exploreActive = '';
    $scope.UserService = UserService;
    $scope.AlertService = AlertService;
    $scope.$watch('UserService.User', function (newValue) {
        $scope.currentUser = newValue;
    });
    AlertService.addObserver(function (newValue) {
      $scope.errors = _(newValue)
        .filter(function(x) { return x.type === 'error'; });
      $scope.successes = _(newValue)
        .filter(function(x) { return x.type === 'success'; });
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
      UserService.setUser(currentUser);
    });
    $scope.logout = function() {
      UserService.logOut();
      $location.path('/login');
    };
  }
]);
controllers.controller('DashboardCtrl', ['$scope', 'tasks', 'blockUI', 'UserService', 'AlertService', '$q',
  function ($scope, tasks, $blockUI, UserService, AlertService, $q) {
  	$scope.todoTasks = [];
    $scope.assetTasks = [];
    $scope.debtTasks = [];
    $scope.myOpenTasks = [];
    $blockUI.start();
    $q.all([

        //TODO: this should be a cloud function!
        tasks.get({ claimedByUser: UserService.User }),
        tasks.get({ claimedByUser: UserService.User, state: tasks.TaskState.FINISHED }),
        tasks.get({ createdByUser: UserService.User, notState: tasks.TaskState.FINISHED }),
        tasks.get({ createdByUser: UserService.User, state: tasks.TaskState.FINISHED })
      ]).then(
        function(res) {
          $blockUI.stop();
          var todoTasks = res[0];
          var assetTasks = res[1];
          var myOpenTasks = res[2];
          var debtTasks = res[3];
          $scope.todoTasks = tasks.populatePermissions(todoTasks, UserService.User);
          $scope.assetTasks = tasks.populatePermissions(assetTasks, UserService.User);
          $scope.myOpenTasks = tasks.populatePermissions(myOpenTasks, UserService.User);
          $scope.debtTasks = tasks.populatePermissions(debtTasks, UserService.User);
        },
        function() {
          AlertService.error('There was an error loading tasks');
        });
    $scope.deleteTask = function(task) {
      AlertService.clean();
      tasks.deleteTask(task).then(function() {
        AlertService.success('Your task was successfully deleted').timeout();
        $scope.myOpenTasks = _($scope.myOpenTasks)
          .filter(function(t) {
            return t.id !== task.id;
          });
      }, function() {
        AlertService.error('There was an error deleting the task');
      });
    };
  }
]);
controllers.controller('LoginCtrl', ['$scope', '$location', 'usSpinnerService', 'user', 'blockUI', 'UserService', 'AlertService',
  function($scope, $location, usSpinnerService, $user, $blockUI, UserService, AlertService) {
    $scope.login = function() {
      $blockUI.start();
      AlertService.clean();
      $user.facebookLogin().then(
        function(user) {
          UserService.setUser(user);
          $location.path('/dashboard');
          $blockUI.stop();
        }, function(error) {
          $blockUI.stop();
          AlertService.error('There was an error logging in, please try again.');
          UserService.logOut();
        });
      };
  }
]);
controllers.controller('NewTaskModal', ['$scope', '$modalInstance', 'tasks', 'items', 'AlertService',
  function($scope, $modalInstance, tasks, items, AlertService) {
    $scope.task = {
      title: '',
      description: '',
      reward: ''
    };
	  $scope.create = function () {
      tasks.add($scope.task).then(
        function() {
          $modalInstance.close();
          AlertService.success('Your task was created successfully').timeout();
          items.refresh();
      }, function() {
      });
  	};
  	$scope.cancel = function () {
    	$modalInstance.dismiss('cancel');
  	};
  }
]);
controllers.controller('ExploreCtrl', ['$scope', '$modal', '$q', 'tasks', 'blockUI', 'AlertService', 'UserService',
  function ($scope, $modal, $q, tasks, $blockUI, AlertService, UserService) {
    $scope.claim = function(task) {
      AlertService.clean();
      tasks.claimTask(task).then(function() {
        $scope.refreshTasks();
      }, function() {
        AlertService.error('There was an error claiming the task');
      });
    };
    $scope.refreshTasks = function() {
      $blockUI.start();
      tasks.get({filterUser: UserService.User}).then(
        function(tasksResult) {
          $blockUI.stop();
          $scope.tasks = tasks.populatePermissions(tasksResult, UserService.User);
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
                refresh: $scope.refreshTasks
              };
	         }
        }
    	});

    	modalInstance.result.then(function (data) {
    	}, function () { });
	};

  }
]);
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
    $scope.dashboardActive = '';
    $scope.exploreActive = '';
    $scope.UserService = UserService;
    $scope.ErrorService = ErrorService;
    $scope.$watch('UserService.User', function (newValue) {
        $scope.currentUser = newValue;
    });
    $scope.$watch('ErrorService.Errors', function (newValue) {
        $scope.errors = newValue;
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
controllers.controller('DashboardCtrl', ['$scope', 'tasks', 'blockUI', 'UserService', 'ErrorService', '$q',
  function ($scope, tasks, $blockUI, UserService, ErrorService, $q) {
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
          ErrorService.showError('There was an error loading tasks');
        });
    $scope.deleteTask = function(task) {
      ErrorService.clean();
      tasks.deleteTask(task).then(function() {
        $scope.myOpenTasks = _($scope.myOpenTasks)
          .filter(function(t) {
            return t.id !== task.id;
          });
      }, function() {
        ErrorService.showError('There was an error deleting the task');
      });
    };
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
    $scope.task = {
      title: '',
      description: '',
      reward: ''
    };
	  $scope.create = function () {
      tasks.add($scope.task).then(
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
controllers.controller('ExploreCtrl', ['$scope', '$modal', '$q', 'tasks', 'blockUI', 'ErrorService', 'UserService',
  function ($scope, $modal, $q, tasks, $blockUI, ErrorService, UserService) {
    $scope.claim = function(task) {
      ErrorService.clean();
      tasks.claimTask(task).then(function() {
        $scope.refreshTasks();
      }, function() {
        ErrorService.showError('There was an error claiming the task');
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
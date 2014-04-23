Parse.initialize("TnKwlgf74fHAhpmQKtOLR0OS0exGelFKLC3u88nU", "nWdvt7vCsQxcgflTwtIX9S6bprHWDbdpJqFmFZAo");

//--- Modules ---
var iouApp = angular.module('iou', [
  'ngRoute',
  'controllers',
  'iouapi',
  'angularSpinner',
  'blockUI',
  'toaster'
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
  this._observers = [];
  this.observe = function(func) {
    this._observers.push(func);
  };
  this.setUser = function(user) {
    this.User = user;
    _(this._observers).each(function(o) { o(user); });
  };
  this.logOut = function() {
    user.logout();
    this.User = null;
    _(this._observers).each(function(o) { o(null); });
  };
});

//--- Controllers ---
var controllers = angular.module('controllers', ['ui.bootstrap']);
controllers.controller('ParentCtrl', ['$scope', '$location', 'user', 'UserService',
  function ($scope, $location, user, UserService) {
    $scope.dashboardActive = '';
    $scope.exploreActive = '';
    UserService.observe(function(newValue) {
      $scope.currentUser = newValue;
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
controllers.controller('DashboardCtrl', ['$scope', 'tasks', 'blockUI', 'UserService', '$q', 'toaster', '$modal',
  function ($scope, tasks, $blockUI, UserService, $q, toaster, $modal) {
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
          toaster.pop('error', 'Error', 'There was an error loading tasks');
        });
    $scope.deleteTask = function(task) {
      tasks.deleteTask(task).then(function() {
        toaster.pop('success', 'Success', 'Your task was successfully deleted');
        $scope.myOpenTasks = _($scope.myOpenTasks)
          .filter(function(t) {
            return t.id !== task.id;
          });
      }, function() {
        toaster.pop('error', 'Error', 'There was an error deleting the task');
      });
    };

    // new task modal
    $scope.open = function () {
      var modalInstance = $modal.open({
        templateUrl: 'partials/createatask.html',
        controller: 'NewTaskModal',
        resolve: {
          items: function() {
            return {
              addTask: function(newTask) {
                $scope.myOpenTasks.push(tasks.populatePermissionsForTask(newTask, UserService.User));
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
controllers.controller('NewTaskModal', ['$scope', '$modalInstance', 'tasks', 'toaster', 'items',
  function($scope, $modalInstance, tasks, toaster, items) {
    $scope.task = {
      title: '',
      description: '',
      reward: ''
    };
    $scope.create = function () {
      tasks.add($scope.task).then(
        function(newTask) {
          $modalInstance.close();
          items.addTask(newTask);
          toaster.pop('success', 'Success', 'Your task was created successfully');
      }, function() {
      });
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  }
]);
controllers.controller('LoginCtrl', ['$scope', '$location', 'usSpinnerService', 'user', 'blockUI', 'UserService', 'toaster',
  function($scope, $location, usSpinnerService, $user, $blockUI, UserService, toaster) {
    $scope.login = function() {
      $blockUI.start();
      $user.facebookLogin().then(
        function(user) {
          UserService.setUser(user);
          $location.path('/dashboard');
          $blockUI.stop();
        }, function(error) {
          $blockUI.stop();
          toaster.pop('error', 'Error', 'There was an error logging in, please try again.');
          UserService.logOut();
        });
      };
  }
]);
controllers.controller('ExploreCtrl', ['$scope', '$q', 'tasks', 'blockUI', 'toaster', 'UserService',
  function ($scope, $q, tasks, $blockUI, toaster, UserService) {
    $scope.claim = function(task) {
      tasks.claimTask(task).then(function() {
        $scope.tasks = _($scope.tasks).filter(function(t) {
          return t.id !== task.id;
        });
        toaster.pop('success', 'Success', 'The task has been added to your TODO list');
      }, function() {
        toaster.pop('error', 'Error', 'There was an error claiming the task');
      });
    };

    // load tasks
    $blockUI.start();
      tasks.get({filterUser: UserService.User}).then(
        function(tasksResult) {
          $blockUI.stop();
          $scope.tasks = tasks.populatePermissions(tasksResult, UserService.User);
        },
        function() {
          $blockUI.stop();
          toaster.pop('error', 'Error', 'There was an error loading tasks');
        });
  }
]);
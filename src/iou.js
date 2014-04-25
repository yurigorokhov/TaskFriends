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
iouApp.service('UserService', function(user, circles, $q, $location) {
  this.User = null;
  this.Circles = null;
  this._observers = [];
  this._circleObservers = [];
  this.observe = function(func) {
    this._observers.push(func);
  };
  this.observeCircleChange = function(func) {
    this._circleObservers.push(func);
  };
  this.changeCircle = function(circle) {
    var def = $q.defer();
    var self = this;
    if(self.User === null || self.Circles === null) {
      throw 'User or Circles are not set';
    }
    user.changeCircle(circle).then(
      function(newUser) {
        self.User = newUser;
        _(self._circleObservers).each(function(o) { o(circle); });
        def.resolve();
      },
      function(error) {
        def.reject(error);
      }
    );
    return def.promise;
  };
  this.setUser = function(user) {
    var self = this;

    // Do not allow setting of a user twice
    if(self.User !== null) {
      throw 'A user has already been set, logout first!';
    }
    
    // get and unset the invitation token
    var invitationToken = $location.search().invite;
    $location.search('invite', null);
    self.User = user;
    if(user !== null && 'currentCircle' in user) {
      _(self._circleObservers).each(function(o) { o(user.currentCircle); });
    }
    if(user === null) {
      self.Circles = null;
      _(self._observers).each(function(o) { o({ user: user, circles: null }); });
    } else {
      circles.getCircles(invitationToken).then(
        function(circles) {
          self.Circles = circles;
          if(_(self.User.currentCircle).isUndefined() && circles.length > 0) {
            self.changeCircle(circles[0]);
          }
          _(self._observers).each(function(o) { o({ user: user, circles: circles }); });
        },
        function() {
          self.Circles = null;
          _(self._observers).each(function(o) { o({ user: user, circles: null }); });
        }
      );
    }
    
  };
  this.logOut = function() {
    user.logout();
    this.User = null;
    this.Circles = null;
    _(this._observers).each(function(o) { o({ user: null, circles: null }); });
  };
});

//--- Controllers ---
var controllers = angular.module('controllers', ['ui.bootstrap']);
controllers.controller('ParentCtrl', ['$scope', '$location', 'user', 'UserService', 'toaster', 'blockUI', '$modal',
  function ($scope, $location, user, UserService, toaster, $blockUI, $modal) {
    $scope.currentUser = null;
    $scope.circles = null;
    $scope.dashboardActive = '';
    $scope.exploreActive = '';
    UserService.observe(function(newValue) {
      $scope.currentUser = newValue.user;
      $scope.circles = newValue.circles;
    });
    UserService.observeCircleChange(function(circle) {
      $scope.currentCircle = circle;
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
    $scope.logout = function() {
      UserService.logOut();
      $location.path('/login');
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
controllers.controller('InviteFriendsCtrl', ['$scope', '$modalInstance', 'toaster', 'UserService', 'user', 'blockUI',
  function($scope, $modalInstance, toaster, UserService, user, $blockUI) {
    $scope.invitations = {
      emails: ''
    };
    $scope.currentCircle = UserService.User.currentCircle;
    $scope.invite = function (invitations) {
      $blockUI.start();
      user.inviteViaEmail(invitations.emails.split(',')).then(
        function() {
          $modalInstance.close();
          $blockUI.reset();
          toaster.pop('success', 'Success', 'Your invitations have been sent!');
        },
        function() {
          $blockUI.reset();
          toaster.pop('error', 'Error', 'There was an error sending the invitations, please try again');
        }
      );
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  }
]);
controllers.controller('DashboardCtrl', ['$scope', 'tasks', 'blockUI', 'UserService', '$q', 'toaster', '$modal',
  function ($scope, tasks, $blockUI, UserService, $q, toaster, $modal) {
  	$scope.todoTasks = [];
    $scope.assetTasks = [];
    $scope.debtTasks = [];
    $scope.myOpenTasks = [];
    var refreshDasboard = function() {
      $blockUI.start();
      tasks.getDashboardTasks(UserService.User).then(
        function(res) {
          $blockUI.reset();
          $scope.todoTasks = res.todoTasks;
          $scope.assetTasks = res.assetTasks;
          $scope.debtTasks = res.debtTasks;
          $scope.myOpenTasks = res.myOpenTasks;
        },
        function() {
          $blockUI.reset();
          toaster.pop('error', 'Error', 'There was an error loading the Dashboard');
        }
      );
    };
    if(UserService.User.currentCircle) {
      refreshDasboard();
    }

    // Refresh the dashboard anytime the user changes
    UserService.observeCircleChange(refreshDasboard);

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
    $scope.login = function(userData) {
      $blockUI.start();
      $user.login(userData.email, userData.password).then(
        function(newUser) {
          UserService.setUser(newUser);
          $location.path('/dashboard');
        },
        function(error) {
          $blockUI.stop();
          toaster.pop('error', 'Error', 'There was an error logging in, please try again.');
        } 
      );
    };
    $scope.register = function(userData) {
      $blockUI.start();
      $user.register(userData).then(
        function(newUser) {
          UserService.setUser(newUser);
          $location.path('/dashboard');
        },
        function(error) {
          $blockUI.stop();
          toaster.pop('error', 'Error', error);
        } 
      );
    };
    $scope.facebookLogin = function() {
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
    var reloadTasks = function() {
      $blockUI.start();
      tasks.get({filterUser: UserService.User}, UserService.User.currentCircle).then(
        function(tasksResult) {
          $blockUI.stop();
          $scope.tasks = tasks.populatePermissions(tasksResult, UserService.User);
        },
        function() {
          $blockUI.stop();
          toaster.pop('error', 'Error', 'There was an error loading tasks');
        });
    };
    reloadTasks();
    UserService.observeCircleChange(reloadTasks);
  }
]);
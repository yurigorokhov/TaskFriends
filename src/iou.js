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

//--- Controllers ---
angular.module('controllers', ['ui.bootstrap']);

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
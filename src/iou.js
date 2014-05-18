Parse.initialize("TASKFRIENDS_APPID", "TASKFRIENDS_CLIENTKEY");

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
            $location.path('/landing');
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
      when('/landing', {
        templateUrl: 'partials/landing.html',
        controller: 'LandingCtrl',
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
iouApp.service('MessageService', function($q, UserService, tasks, $interval, CircleService) {
  this.Messages = [];
  this._id = 0;
  this._cachedCircle = null;
  this._messageObservers = [];
  var self = this;
  this._fetchMessages = function(user, circle) {
    if(circle !== null && user !== null) {
      
      // Find tasks that need action
      tasks.get({
        createdByUser: user,
        state: tasks.TaskState.PENDING_APPROVAL
      }, circle).then(function(tasks) {
        self.Messages = _(tasks).map(function(t) {
          return { id: ++self._id, task: t };
        });
        _(self._messageObservers).each(function(func) {
          func(self.Messages);
        });
      }, function() {
        //TODO
      });
    } else {
      self.Messages = [];
      _(self._messageObservers).each(function(func) {
        func(self.Messages);
      });
    }
  };
  this.observe = function(func) {
    self._messageObservers.push(func);
  };
  this.complete = function(message) {
    self.Messages = _(self.Messages).filter(function(m) {
      return m.id !== message.id;
    });
    _(self._messageObservers).each(function(func) {
      func(self.Messages);
    });
  };
  CircleService.observe(function() {
    self._cachedCircle = CircleService.getCurrentCircle();
    self._fetchMessages(UserService.User, self._cachedCircle);
  });

  // Periodically check for new messages
  $interval(function() {
    self._fetchMessages(UserService.User, self._cachedCircle);
  }, 10000);
});

iouApp.service('CircleService', function(circles, $q, UserService) {
  var self = this;
  this.Circles = [];
  this._observers = [];
  this._key = null;
  this.getCurrentCircle = function() {
    if(_(self.Circles).isEmpty() || self._key === null) {
      return null;
    } else {

      // check local storage, fall back to first in Circles list
      var currentCircle = localStorage.getItem(self._key);
      if(currentCircle === null || !_(self.Circles).include(currentCircle)) {
        currentCircle = _(self.Circles).first();
        if(currentCircle) {
          localStorage.removeItem(self._key);
        } else {
          localStorage.setItem(self._key, currentCircle);
        }
      }
      return currentCircle;
    }
  };
  this._notify = function() {
    _(this._observers).each(function(o) { o(self.Circles); });
  };
  this.observe = function(func) {
    this._observers.push(func);
  };
  this.changeCircle = function(circle) {
    if(_(self.Circles).include(circle) && self._key !== null) {
      localStorage.setItem(self._key, circle);
      self._notify();
      return true;
    } else {
      return false;
    }
  };
  UserService.observe(function(user) {
    if(user === null) {
      this.Circles = [];
      self._notify();
      self._key = null;
    } else {
      circles.getCircles().then(function(circles) {
        self.Circles = circles;
        self._key = 'currentCircle_' + user.id; 
        self._notify();
      }, function() {
        self.Circles = [];
        self.key = null;
        self._notify();
      });
    }
  });
});

iouApp.service('UserService', function(user, toaster) {
  this.User = null;
  this._observers = [];
  this.observe = function(func) {
    this._observers.push(func);
  };
  this.setUser = function(u, invitationToken) {
    var self = this;

    // Do not allow setting of a user twice
    if(self.User !== null) {
      throw 'A user has already been set, logout first!';
    }
    self.User = u;
    _(self._observers).each(function(o) { o(u); });
    if(!_(invitationToken).isEmpty()) {
      user.claimInvitationToken(u, invitationToken).then(function() {
      }, function(error) {
        toaster.pop('error', 'Error', 'The invitation you have received has either been claimed or is invalid');
      }).finally(function() {
        _(self._observers).each(function(o) { o(u); });
      });
    } else {
      _(self._observers).each(function(o) { o(u); });
    }
  };
  this.logOut = function() {
    user.logout();
    this.User = null;
    _(this._observers).each(function(o) { o(null); });
  };
});
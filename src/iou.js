Parse.initialize("TnKwlgf74fHAhpmQKtOLR0OS0exGelFKLC3u88nU", "nWdvt7vCsQxcgflTwtIX9S6bprHWDbdpJqFmFZAo");

//--- Modules ---
angular.module('iouapi', ['iouapi-rewards', 'iouapi-tasks']).
  run(function(rewards) {

    // Initialize any modules
  });
 
var iouApp = angular.module('iou', [
  'ngRoute',
  'controllers',
  'iouapi'
]);

//--- Routing ---
iouApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/dashboard', {
        templateUrl: 'partials/dashboard.html',
        controller: 'DashboardCtrl'
      }).when('/explore', {
        templateUrl: 'partials/explore.html',
        controller: 'ExploreCtrl'
      }).otherwise({
        redirectTo: '/dashboard'
      });
  }]);

//--- Controllers ---
var controllers = angular.module('controllers', ['ui.bootstrap']);
controllers.controller('DashboardCtrl', ['$scope',
  function ($scope) {
  	$scope.tasks = dummyTasks;
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
    $scope.rewards = [];
    items.getRewards().then(function(r) {
      $scope.rewards = _(r).values();
      rewardsById = r;
    }, function() {

    });
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
    $scope.refreshTasks = function() {
      $q.all([tasks.get(), rewards.getById()]).then(
        function(res) {
          var tasksResult = res[0];
          var rewardsResultById = res[1];
          var tasksWithRewards = _(tasksResult).map(function(t) {
            var newT = t;
            newT.prizes = _(t.prizes).map(function(p) {
              return {
                user: p.user,
                reward: rewardsResultById[p.rewardId]
              };
            });

            // Total prize worth
            newT.dollarValue = _(newT.prizes).reduce(function(a, i) { return a + parseInt(i.reward.dollarValue, 10); }, 0);
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
                getRewards: rewards.getById
              };
	         }
        }
    	});

    	modalInstance.result.then(function (data) {
    	}, function () { });
	};

  }
]);
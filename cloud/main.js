var Q = require('cloud/q.min.js');
var _ = require('underscore');

//--- Tasks ---
TaskState = {
	OPEN: 100,
	CLAIMED: 200,
	FINISHED: 300	
};
var Task = Parse.Object.extend('Task');


Parse.Cloud.beforeSave('Task', function(request, response) {
  if(request.object.isNew()) {

  	// This is a new task, set state to OPEN
  	request.object.set('state', TaskState.OPEN);
  	request.object.set('createdBy', request.user);
  	if(request.object.has('prizes')) {
  		var reward = request.object.get('prizes').reward;
  		var newPrizes = {};
  		newPrizes[request.user.id] = { user: request.user, reward: reward };
  		request.object.set('prizes', newPrizes);
  	} else {
  		response.error('Must specify a prize');
  		return;
  	}
  	response.success();
  } else if(request.object.dirty('createdBy')) {
  	response.error('Cannot change the createdBy field!');
  } else if(request.object.dirty('claimedBy')) {
  	response.error('Cannot change the claimedBy field!');
  } else if(request.object.dirty('title') || request.object.dirty('description')) {
  	if(request.object.get('createdBy').id !== request.user.id) {
  		response.error('Only the owner of the task can change the title or description');
  	}
  } else {
  	var query = new Parse.Query(Task);
	query.get(request.object.id, {
		success: function(oldObject) {
			if(request.object.dirty('state')) {
				var newState = request.object.get('state');
			  	var previousState = oldObject.get('state');
			  	switch(previousState) {
			  		case TaskState.OPEN:
			  			if(newState !== TaskState.CLAIMED) {
			  				response.error('Invalid task state transition');
			  				return;
			  			} else if(request.object.get('createdBy').id === request.user.id) {
			  				response.error('You cannot claim your own task');
			  				return;
			  			} else {
			  				request.object.set('claimedBy', request.user);
			  			}
			  			break;
			  		case TaskState.CLAIMED:
			  			if(newState !== TaskState.FINISHED) {
			  				response.error('Invalid task state transition');
			  				return;
			  			} else if(request.object.get('createdBy').id !== request.user.id) {
			  				response.error('Only the owner can finish their task, you must request permission');
			  				return;
			  			}
			  			break;
			  		case TaskState.FINISHED:
			  			response.error('Invalid task state transition');
			  			return;
			  			break;
			  		default:
			  			throw 'ShouldNeverHappenException: TaskState';
			  	}
		  	}
		  	if(request.object.dirty('prizes')) {
				if(request.object.get('state') !== TaskState.OPEN) {
					response.error('You can only add prizes when the task is OPEN');
					return;
				}
				if(request.object.get('createdBy').id !== request.user.id) {
					response.error('At this time only the owner can add a reward');
					return;
				}
				var oldPrizes = oldObject.get('prizes');
				oldPrizes[request.user.id] = { user: request.user, reward: request.object.get('prizes').reward };
				request.object.set('prizes', oldPrizes);
		  	}
		  	response.success();
		},
		error: function() {
			response.error('There was an error fetching this task from the database');
		}
	});
  }
});

Parse.Cloud.beforeDelete('Task', function(request, response) {
	if(request.object.get('createdBy').id !== request.user.id) {
		response.error('Only the creator can delete a task');
	} else if(request.object.get('state') !== TaskState.OPEN) {
		response.error('This task is not OPEN, you can no longer delete it');
	} else {
		response.success();
	}
});

//--- Dashboard ---
var parseQuery = function(query) {
	var def = Q.defer();
	query.find({
    success: function(results) {
      def.resolve(results);
    },
    error: function(error) {
      def.reject(error);
    }
  });
  return def.promise;
};

Parse.Cloud.define('GetDashboardTasks', function(request, response) {
  
  // TODO
  var todoQuery = new Parse.Query('Task');
  todoQuery.include('createdBy');
  todoQuery.equalTo('claimedBy', request.user);
  todoQuery.equalTo('state', TaskState.CLAIMED);

  // assets
  var assetQuery = new Parse.Query('Task');
  assetQuery.include('createdBy');
  assetQuery.equalTo('claimedBy', request.user);
  assetQuery.equalTo('state', TaskState.FINISHED);

  // debts
  var debtQuery = new Parse.Query('Task');
  debtQuery.include('createdBy');
  debtQuery.equalTo('createdBy', request.user);
  debtQuery.equalTo('state', TaskState.FINISHED);

  // my tasks
  var myTasks = new Parse.Query('Task');
  myTasks.include('createdBy');
  myTasks.equalTo('createdBy', request.user);
  myTasks.notEqualTo('state', TaskState.FINISHED);

  // Run queries
  Q.all([
  	parseQuery(todoQuery), 
  	parseQuery(assetQuery), 
  	parseQuery(debtQuery), 
  	parseQuery(myTasks)]
  ).then(function(res) {
  	response.success({
  		todoTasks: res[0],
  		assetTasks: res[1],
  		debtTasks: res[2],
  		myOpenTasks: res[3]
  	});
  }, function(error) {
  	response.error(error);
  });
});


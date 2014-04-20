
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
  	response.success();
  } else if(request.object.dirty('createdBy')) {
  	response.error('Cannot change the createdBy field!');
  } else if(request.object.dirty('claimedBy')) {
  	response.error('Cannot change the claimedBy field!');
  } else if(request.object.dirty('title') || request.object.dirty('description')) {
  	if(request.object.get('createdBy').id !== request.user.id) {
  		response.error('Only the owner of the task can change the title or description');
  	}
  } else if(request.object.dirty('state')) {

  	// This is not a new object and a state has been specified, let's make we are making a valid state change
  	
	var query = new Parse.Query(Task);
	query.get(request.object.id, {
		success: function(oldObject) {
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
		  				response.object.set('claimedBy', request.user);
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
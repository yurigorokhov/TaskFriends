var Q = require('cloud/q.min.js');
var _ = require('underscore');
var util = require('cloud/util.js');
var invitations = require('cloud/invitations.js');
var moment = require('moment');

//--- Tasks ---
TaskState = {
	OPEN: 100,
	CLAIMED: 200,
  PENDING_APPROVAL: 250,
	FINISHED: 300,
  REWARD_RECEIVED: 400
};

var Task = Parse.Object.extend('Task');

Parse.Cloud.beforeSave('Task', function(request, response) {
  var currentCircle = request.user.get('currentCircle');
  if(!currentCircle) {
    response.error('You are not part of any circle, you cannot create tasks');
    return;
  }
  if(request.object.isNew()) {

  	// This is a new task, set state to OPEN
    request.object.set('circle', currentCircle);
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
    setAclForTask(request.object, currentCircle);
  	response.success();
    return;
  }
  if(request.object.dirty('createdBy')) {
  	response.error('Cannot change the createdBy field!');
    return;
  }
  if(request.object.dirty('claimedBy')) {
  	response.error('Cannot change the claimedBy field!');
    return;
  }
  if(request.object.dirty('title') || request.object.dirty('description')) {
  	if(request.object.get('createdBy').id !== request.user.id) {
  		response.error('Only the owner of the task can change the title or description');
      return;
  	}
  } 
  if(request.object.dirty('circle')) {
    response.error('You cannot change the circle of a task');
    return;
  }
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
			  			if(newState !== TaskState.PENDING_APPROVAL) {
			  				response.error('Invalid task state transition');
			  				return;
			  			} else if(request.object.get('claimedBy').id !== request.user.id) {
			  				resonse.error('You must claim the task to be able to complete it.');
                return;
			  			}
			  			break;
            case TaskState.PENDING_APPROVAL:
              if(newState !== TaskState.FINISHED) {
                response.error('Invalid task state transition');
                return;
              } else if(request.object.get('createdBy').id !== request.user.id) {
                response.error('Only the owner can finish their task, you must request permission');
                return;
              }
              break;
			  		case TaskState.FINISHED:
              if(newState !== TaskState.REWARD_RECEIVED) {
                response.error('Invalid task state transition');
                return;
              } else if(request.object.get('claimedBy').id !== request.user.id) {
                response.error('Only the claimer can approve the reward');
                return;
              }
              break;
            case TaskState.REWARD_RECEIVED:
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
});

var setAclForTask = function(object, circle) {
  var acl = new Parse.ACL();
  acl.setRoleWriteAccess(circle, true);
  acl.setRoleReadAccess(circle, true);
  object.setACL(acl);
};

Parse.Cloud.beforeDelete('Task', function(request, response) {
	if(request.object.get('createdBy').id !== request.user.id) {
		response.error('Only the creator can delete a task');
	} else if(request.object.get('state') !== TaskState.OPEN) {
		response.error('This task is not OPEN, you can no longer delete it');
	} else {
		response.success();
	}
});

//--- Circles ---
Parse.Cloud.define('GetUserCircles', function(request, response) {
  if(request.user === null) {
    response.error('You are not logged in');
    return;
  }
  Parse.Cloud.useMasterKey();
  var invitationToken = request.params.token;

  // fetch the roles!
  var actions = [getRoles(request.user)];
  if(!_(invitationToken).isEmpty()) {
    actions.push(invitations.findInvitation(invitationToken));
  }
  Q.allSettled(actions).then(
    function(results) {
      var rolesResult = results[0];
      var inviteResult = results[1];
      if(rolesResult.state !== 'fulfilled') {
        response.error('Failed to fetch roles');
      } else {
        var roles = rolesResult.value;
        var ret = _(roles).map(function(c) { return c.get('name'); });
        if(inviteResult && inviteResult.state === 'fulfilled') {
          var invite = inviteResult.value;
          var circle = invite.get('circle');

          // kill the invitation, so it cannot be used again
          invite.destroy();

          // If we don't already have the role we need to add it
          if(_(_(roles).find(function(r) { return r.get('name') === circle; })).isUndefined()) {
            (new Parse.Query(Parse.Role)).equalTo('name', circle).first({
              success: function(role) {
                role.getUsers().add(request.user);
                role.save(null, {
                  success: function() {
                    ret.push(role.get('name'));
                    response.success(ret);
                  },
                  error: function() {
                    console.log('Error saving role permissions');
                    response.success(ret);
                  }
                });
              },
              error: function() {
                console.log('Could not find circle' + circle);
                response.success(ret);
              }
            });
          } else {
            console.log('Already in the proper circle, ignoring invitation');
            response.success(ret);
          }
        } else {
          response.success(ret);
        }
      }
    }
  );
});

var getRoles = function(user) {
  var def = Q.defer();
  (new Parse.Query(Parse.Role)).equalTo('users', user).find({
    success: function(circles) {
      def.resolve(circles);
    },
    error: function(error) {
      def.reject(error);
    }
  });
  return def.promise;
};

//--- User ---
Parse.Cloud.beforeSave(Parse.User, function(request, response) {
  if(request.object.dirty('currentCircle')) {
    Parse.Cloud.run('GetUserCircles', {}, {
      success: function(circles) {
        if(_(circles).contains(request.object.get('currentCircle'))) {
          response.success();
        } else {
          response.error('You do not have access to this circle');
        }
      },
      error: function(error) {
        response.error(error);
      }
    });
  } else {
    response.success();
  }
});

//--- Invitations ---
Parse.Cloud.define('InviteFriends', function(request, response) {
  var currentCircle = request.user.get('currentCircle');
  if(!currentCircle) {
    response.error('You are not part of any circle, you cannot invite friends');
    return;
  }

  // create a new invitation token
  var emails = request.params.emails;
  if(!emails || !_(emails).isArray()) {
    response.error('You did not specify any emails');
    return;
  }

  // create and send invitations
  Q.all(_(emails).map(function(email) { return invitations.createInvitationAndSendEmail(email, request.user, currentCircle); })).then(
    function() {
      response.success();
    },
    function() {
      response.error();
    }
  );
});


//--- Jobs ---
Parse.Cloud.job('NewTasksAvailable', function(request, status) {
  
  // Set up to modify user data
  Parse.Cloud.useMasterKey();

  // current date
  var now = moment();
  var subtract = moment.duration(1, 'd');
  var queryDate = now.subtract(subtract);

  // Query all circles
  var circleQuery = new Parse.Query(Parse.Role);
  util.parseQuery(circleQuery).then(function(circles) {
    Q.all(_(circles).map(function(circle) {
      return notifyCircle(circle, queryDate.clone());
    })).then(function() {
      status.success('Notified all circles');
    }, function() {
      status.error('Something went wrong notifying circles');
    });
  }, function() {
    status.error('There was an error finding circles');
  })
});

var notifyCircle = function(circle, date) {
  var def = Q.defer();
  var newTasks = new Parse.Query('Task');
  newTasks.equalTo('circle', circle.get('name'));
  newTasks.greaterThanOrEqualTo('createdAt', date.toDate());
  newTasks.include('createdBy');
  newTasks.equalTo('state', TaskState.OPEN);
  util.parseQuery(newTasks).then(function(tasks) {

    // iterate over all users
    util.parseQuery(circle.getUsers().query()).then(function(users) {
      _(users).each(function(user) {
        var filteredTasks = _(tasks).filter(function(t) {
          return t.get('createdBy').id !== user.id; 
        });
        invitations.notifyOfNewTasks(user, circle, filteredTasks);
      });
      def.resolve();
    }, function() {
      def.reject();
    });
  }, function() {
    console.log('There was an error finding tasks for circle: ' + circle.name);
  });
  return def.promise;
};
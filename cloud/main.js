var Q = require('cloud/q.min.js');
var _ = require('underscore');
var Mandrill = require('mandrill');

Mandrill.initialize('nl2rSwfmJDSoVkXEMTUNnQ');

//--- Tasks ---
TaskState = {
	OPEN: 100,
	CLAIMED: 200,
	FINISHED: 300	
};

var Task = Parse.Object.extend('Task');
var Invitation = Parse.Object.extend('Invitation');

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
  } else if(request.object.dirty('createdBy')) {
  	response.error('Cannot change the createdBy field!');
  } else if(request.object.dirty('claimedBy')) {
  	response.error('Cannot change the claimedBy field!');
  } else if(request.object.dirty('title') || request.object.dirty('description')) {
  	if(request.object.get('createdBy').id !== request.user.id) {
  		response.error('Only the owner of the task can change the title or description');
  	}
  } else if(request.object.dirty('circle')) {
    response.error('You cannot change the circle of a task');
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
          setAclForTask(request.object, currentCircle);
  		  	response.success();
  		},
  		error: function() {
  			response.error('There was an error fetching this task from the database');
  		}
  	});
  }
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
  
  // get current circle
  //(yurig): It is ok to search with a parametrized circle here 
  // because the ACL's lock down the tasks anyway
  var currentCircle = request.params.circle;
  if(!currentCircle) {
    response.error('You are not part of any circle, you cannot create tasks');
    return;
  }

  // TODO
  var todoQuery = new Parse.Query('Task');
  todoQuery.equalTo('circle', currentCircle);
  todoQuery.include('createdBy');
  todoQuery.equalTo('claimedBy', request.user);
  todoQuery.equalTo('state', TaskState.CLAIMED);

  // assets
  var assetQuery = new Parse.Query('Task');
  assetQuery.equalTo('circle', currentCircle);
  assetQuery.include('createdBy');
  assetQuery.equalTo('claimedBy', request.user);
  assetQuery.equalTo('state', TaskState.FINISHED);

  // debts
  var debtQuery = new Parse.Query('Task');
  debtQuery.equalTo('circle', currentCircle);
  debtQuery.include('createdBy');
  debtQuery.equalTo('createdBy', request.user);
  debtQuery.equalTo('state', TaskState.FINISHED);

  // my tasks
  var myTasks = new Parse.Query('Task');
  myTasks.equalTo('circle', currentCircle);
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
    actions.push(findInvitation(invitationToken));
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

var findInvitation = function(invitationToken) {
  var def = Q.defer();
  var tokenQuery = new Parse.Query(Invitation);
  tokenQuery.equalTo('token', invitationToken);
  tokenQuery.first({
    success: function(invite) {
      def.resolve(invite);
    },
    error: function() {
      def.reject();
    }
  });
  return def.promise;
}

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
  Q.all(_(emails).map(function(email) { return createInvitationAndSendEmail(email, request.user, currentCircle); })).then(
    function() {
      response.success();
    },
    function() {
      response.error();
    }
  );
});

var createInvitationAndSendEmail = function(email, user, circle) {
  var def = Q.defer();
  var g = guid();
  var newInvite = new Invitation();
  newInvite.set('createdBy', user);
  newInvite.set('sentTo', email);
  newInvite.set('token', g);
  newInvite.set('circle', circle);
  newInvite.save(null, {
    success: function() {
      Mandrill.sendEmail({
        message: {
          text: 'Please follow the following link: https://ontab.parseapp.com/#/login?invite=' + g,
          subject: 'You have been invited to OnTab',
          from_email: "admin@ontab.parseapp.com",
          from_name: "OnTab",
          to: [
            {
              email: email,
              name: email
            }
          ]
        },
        async: true
      },{
        success: function(httpResponse) {
          def.resolve();
        },
        error: function(httpResponse) {
          console.error(httpResponse);
          def.reject();
        }
      });
    },
    error: function() {
      def.reject('Failed to save invitation');
    }
  });
  return def.promise;
};

var guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
};
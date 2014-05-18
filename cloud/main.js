var Q = require('cloud/q.min.js');
var _ = require('underscore');
var util = require('cloud/util.js');
var invitations = require('cloud/invitations.js');
var emails = require('cloud/emails.js');
var moment = require('moment');
var fs = require('fs');

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
  var currentCircle = request.object.get('circle');
  if(!currentCircle) {
    response.error('You are not part of any circle, you cannot create tasks');
    return;
  }
  checkUserCircle(request.user, currentCircle).then(function() {
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
        var acl = new Parse.ACL();
        acl.setRoleWriteAccess(currentCircle, true);
        acl.setRoleReadAccess(currentCircle, true);
        request.object.setACL(acl);
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
              if(newState === TaskState.CLAIMED || newState === TaskState.PENDING_APPROVAL) {
                var Email = Parse.Object.extend('EmailsToSend');
                var e = new Email();
                e.set('sendTo', request.object.get('createdBy'));
                e.set('type', newState === TaskState.CLAIMED ? emails.EmailType.TASK_CLAIMED : emails.EmailType.TASK_PENDING_APPROVAL);
                e.set('data', {
                  userClaimedName: request.user.get('name'),
                  task: request.object.get('title')
                });
                e.save(null, { useMasterKey: true });
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
  }, function() {
    response.error('Could not verify user circle');
  });
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

//--- Circles ---
Parse.Cloud.beforeSave(Parse.User, function(request, response) {
  var invitationToken = request.object.get('invitationtoken');
  request.object.unset('invitationtoken');
  if(!_(invitationToken).isEmpty()) {
    invitations.findInvitation(invitationToken).then(function(invite) {
      var circle = invite.get('circle');
      request.object.set('invitationtoken', circle);
      
      // kill the invitation, so it cannot be used again
      invite.destroy({
        useMasterKey: true
      });
      response.success();
    }, function() {
      response.error('bad-invitation-token');
    });
  } else if(request.object.isNew()) {
    response.error('missing-invitation-token');
  } else {
    response.success();
  }
});

Parse.Cloud.afterSave(Parse.User, function(request) {
  var circle = request.object.get('invitationtoken');
  request.object.unset('invitationtoken');
  if(!_(circle).isEmpty()) {
    new Parse.Query(Parse.Role).equalTo('name', circle).first({
      success: function(role) {
        if(role) {
          role.getUsers().add(request.object);
          var acl = new Parse.ACL();
          role.save(null, {
            useMasterKey: true
          });
        }
      },
      useMasterKey: true
    });
  }
  request.object.save();
});

var checkUserCircle = function(user, circleName) {
  var def = Q.defer();
  getRoles(user).then(function(roles) {
    if(_(roles).filter(function(r) {
      return r.get('name') === circleName;
    }).length > 0) {
      def.resolve();
    } else {
      def.reject();
    }
  }, function() {
    def.reject();
  });
  return def.promise;
};

var getRoles = function(user) {
  var def = Q.defer();
  new Parse.Query(Parse.Role).equalTo('users', user).find({
    success: function(circles) {
      def.resolve(circles);
    },
    error: function(error) {
      def.reject(error);
    },
    useMasterKey: true
  });
  return def.promise;
};

//--- Invitations ---
Parse.Cloud.define('GetInviteInfo', function(request, response) {
  var invitationToken = request.params.token;
  if(!_(invitationToken).isEmpty()) {
    invitations.findInvitation(invitationToken).then(function(invite) {
      var circle = invite.get('circle');
      var email = invite.get('sentTo');
      response.success({ circle: circle, email: email });
    }, function() {
      response.error('bad-invitation-token');
    });
  } else {
    response.success();
  }
});

Parse.Cloud.define('InviteFriends', function(request, response) {
  var currentCircle = request.params.circle;
  if(!currentCircle) {
    response.error('You are not part of any circle, you cannot invite friends');
    return;
  }
  checkUserCircle(request.user, currentCircle).then(function() {

    // create a new invitation token
    var emailTemplate = _(fs.readFileSync('cloud/emails/invitation.html.js', 'utf8')).template(null, {variable: 'data'});
    var emails = request.params.emails;
    if(!emails || !_(emails).isArray()) {
      response.error('You did not specify any emails');
      return;
    }

    // create and send invitations
    Q.all(_(emails).map(function(email) { return invitations.createInvitationAndSendEmail(email, request.user, currentCircle, emailTemplate); })).then(
      function() {
        response.success();
      },
      function() {
        response.error();
      }
    );
  }, function() {
    response.error('Could not verify circle');
  });
});


//--- Jobs ---
Parse.Cloud.job('NewTasksAvailable', function(request, status) {
  var emailTemplate = _(fs.readFileSync('cloud/emails/newTasksAvailable.html.js', 'utf8')).template(null, {variable: 'data'});

  // current date
  var now = moment();
  var subtract = moment.duration(1, 'd');
  var queryDate = now.subtract(subtract);

  // Query all circles
  var circleQuery = new Parse.Query(Parse.Role);
  circleQuery.find({
    success: function(circles) {
      Q.all(_(circles).map(function(circle) {
        return notifyCircle(circle, queryDate.clone(), emailTemplate);
      })).then(function() {
        status.success('Notified all circles');
      }, function(err) {
        status.error(err);
      });
    }, error: function() {
      status.error('Could not find any circles!');
    }, useMasterKey: true
  });
});

var notifyCircle = function(circle, date, emailTemplate) {
  var def = Q.defer();
  var newTasks = new Parse.Query('Task');
  newTasks.equalTo('circle', circle.get('name'));
  newTasks.greaterThanOrEqualTo('createdAt', date.toDate());
  newTasks.include('createdBy');
  newTasks.equalTo('state', TaskState.OPEN);
  newTasks.find({
    success: function(tasks) {
      circle.getUsers().query().find({
        success: function(users) {
          _(users).each(function(user) {
            var filteredTasks = _(tasks).filter(function(t) {
              return t.get('createdBy').id !== user.id; 
            });
            if(filteredTasks.length > 0) {
              invitations.notifyOfNewTasks(user, circle, filteredTasks, emailTemplate);
            }
          });
          def.resolve();
        },
        error: function(err) {
          def.reject(err);
        },
        useMasterKey: true
      })
    }, error: function(err) {
      def.reject('failed to find tasks');
    }, useMasterKey: true
  });
  return def.promise;
};
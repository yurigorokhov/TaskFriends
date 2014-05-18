var Q = require('cloud/q.min.js');
var _ = require('underscore');
var util = require('cloud/util.js');
var Mandrill = require('mandrill');
var fs = require('fs');

Mandrill.initialize('nl2rSwfmJDSoVkXEMTUNnQ');
var Invitation = Parse.Object.extend('Invitation');

exports.createInvitationAndSendEmail = function(email, user, circle, emailTemplate) {
  var def = Q.defer();
  var g = util.guid();
  var newInvite = new Invitation();
  newInvite.set('createdBy', user);
  newInvite.set('sentTo', email);
  newInvite.set('token', g);
  newInvite.set('circle', circle);
  newInvite.save(null, {
    success: function() {
      sendEmail(user,
        user.get('name') + ' has invited you to join TaskFriends',
        emailTemplate({
            user: user.get('name'), 
            circle: circle,
            url: 'http://taskfriends.com/#/landing?invite=' + g
          })
        ).then(function() {
          def.resolve();
        }, function() {
          def.reject();
        });
    },
    error: function() {
      def.reject('Failed to save invitation');
    }
  });
  return def.promise;
};

exports.notifyOfNewTasks = function(user, circle, tasks, emailTemplate) {
  var def = Q.defer();  
  var availableTasks = '';
  _(tasks).each(function(t, idx) {
    availableTasks += '"' + t.get('title') + '"';
    if(idx !== tasks.length-1) {
      availableTasks += ', ';
    }
  });
  sendEmail(user, 
    circle.get('name') + ' has new tasks available for you on TaskFriends',
    emailTemplate({
        circle: circle.get('name'),
        user: {
          name: user.get('name')
        },
        tasks: _(tasks).map(function(t) {
          return { title: t.get('title') };
        })
      })
    ).then(function() {
      def.resolve();
    }, function() {
      def.reject();
    });
  return def.promise;
};

Parse.Cloud.job('TaskNotifications', function(request, status) {
  Parse.Cloud.useMasterKey();
  new Parse.Query('EmailsToSend').find({
    success: function(emailsToSend) {
      if(emailsToSend && emailsToSend.length > 0) {
        Q.all(_(emailsToSend).map(function(emailToSend) {
          var def = Q.defer();
          emailToSend.get('sendTo').fetch({
              success: function(user) {
                var data = emailToSend.get('data');
                var type = emailToSend.get('type');
                emailToSend.destroy();
                switch(type) {
                  case EmailType.TASK_CLAIMED:
                    taskClaimedEmail(user, data.userClaimedName, data.task);
                    break;
                  case EmailType.TASK_PENDING_APPROVAL:
                    taskFinishedEmail(user, data.userClaimedName, data.task);
                    break;
                }
                def.resolve();
              }, error: function() {
                def.reject();
                emailToSend.destroy();
              }
            });
          return def.promise;
        })).then(function() {
          status.success('done');
        }, function() {
          status.error();
        });
      } else {
        status.success('Nothing to send');
      }
    }, error: function(err) {
      status.error(JSON.stringify(err));
    }
  });
});

var taskClaimedEmail = function(user, userClaimed, taskTitle) {
  var subject = userClaimed + ' has claimed your task';
  var emailTemplate = _(fs.readFileSync('cloud/emails/taskClaimed.html.js', 'utf8')).template(null, {variable: 'data'});
  var body = emailTemplate({
    userClaimed: userClaimed,
    task: {
      title: taskTitle
    },
    url: 'http://taskfriends.com/#/dashboard'
  });
  sendEmail(user, subject, body);
};

var taskFinishedEmail = function(user, userClaimed, taskTitle) {
  var subject = userClaimed + ' has finished your task';
  var emailTemplate = _(fs.readFileSync('cloud/emails/taskFinished.html.js', 'utf8')).template(null, {variable: 'data'});
  var body = emailTemplate({
    userClaimed: userClaimed,
    task: {
      title: taskTitle
    },
    url: 'http://taskfriends.com/#/dashboard'
  });
  sendEmail(user, subject, body);
};

var EmailType = {
  TASK_CLAIMED: 100,
  TASK_PENDING_APPROVAL: 200
};
exports.EmailType = EmailType;

var sendEmail = function(user, subject, body) {
  var def = Q.defer();
  Mandrill.sendEmail({
    message: {
      subject: subject,
      html: body,
      from_email: 'admin@taskfriends.parseapp.com',
      from_name: 'TaskFriends',
      to: [
        {
          email: user.get('email'),
          name: user.get('name')
        }
      ]
    },
    async: true
  },{
    success: function(httpResponse) {
      def.resolve();
    },
    error: function(httpResponse) {
      def.reject();
    }
  });
  return def.promise;
};
var Q = require('cloud/q.min.js');
var _ = require('underscore');
var util = require('cloud/util.js');
var Mandrill = require('mandrill');

Mandrill.initialize('nl2rSwfmJDSoVkXEMTUNnQ');
var Invitation = Parse.Object.extend('Invitation');

exports.findInvitation = function(invitationToken) {
  var def = Q.defer();
  var tokenQuery = new Parse.Query('Invitation');
  tokenQuery.equalTo('token', invitationToken);
  tokenQuery.first({
    success: function(invite) {
      if(invite) {
        def.resolve(invite);
      } else {
        def.reject();
      }
    },
    error: function() {
      def.reject();
    },
    useMasterKey: true
  });
  return def.promise;
};

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
      Mandrill.sendEmail({
        message: {
          html: emailTemplate({
            user: user.get('name'), 
            circle: circle,
            url: 'http://taskfriends.com/#/landing?invite=' + g
          }),
          subject: user.get('name') + ' has invited you to join TaskFriends',
          from_email: "admin@taskfriends.parseapp.com",
          from_name: "TaskFriends",
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

exports.notifyOfNewTasks = function(user, circle, tasks, emailTemplate) {
  var def = Q.defer();  
  var availableTasks = '';
  _(tasks).each(function(t, idx) {
    availableTasks += '"' + t.get('title') + '"';
    if(idx !== tasks.length-1) {
      availableTasks += ', ';
    }
  });
  Mandrill.sendEmail({
    message: {
      subject: circle.get('name') + ' has new tasks available for you on TaskFriends',
      html: emailTemplate({
        circle: circle.get('name'),
        user: {
          name: user.get('name')
        },
        tasks: _(tasks).map(function(t) {
          return { title: t.get('title') };
        })
      }),
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
      console.error(httpResponse);
      def.reject();
    }
  });
  return def.promise;
};
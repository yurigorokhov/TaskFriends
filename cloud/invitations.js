var Q = require('cloud/q.min.js');
var _ = require('underscore');
var util = require('cloud/util.js');
var Mandrill = require('mandrill');

Mandrill.initialize('nl2rSwfmJDSoVkXEMTUNnQ');
var Invitation = Parse.Object.extend('Invitation');

exports.findInvitation = function(invitationToken) {
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
};

exports.createInvitationAndSendEmail = function(email, user, circle) {
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
          text: user.get('name') + ' has invited you to join his group ' + circle + ' on TaskFriends. ' + 
                'Follow the following link to register: http://www.taskfriends.com/#/landing?invite=' + g,
          subject: 'You have been invited to TaskFriends',
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

exports.notifyOfNewTasks = function(user, circle, tasks) {
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
      text: circle.get('name') + ' The following tasks are available: ' + availableTasks + '. You can claim them at www.taskfriends.com',
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
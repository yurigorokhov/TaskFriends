angular.module('iouapi-user', [])
  .factory('user', ['$q', function($q) {
    return {

      //--- Methods ---
      _toUser: function(parseObj) {
        return !parseObj ? null : {
          name: parseObj.attributes.name,
          profilepic: parseObj.attributes.profilepic,
          email: parseObj.attributes.email,
          id: parseObj.id,
          _parseObj: parseObj
        };
      },

      getCurrent: function() {
        var self = this;
        var deferred = $q.defer();
        deferred.resolve(self._toUser(Parse.User.current()));
        return deferred.promise;
      },

      logout: function() {
        Parse.User.logOut();
      },

      login: function(username, password) {
        var self = this;
        var def = $q.defer();
        Parse.User.logIn(username, password, {
          success: function(newUser) {
            def.resolve(self._toUser(newUser));
          },
          error: function(user, error) {
            def.reject(error.message);
          }
        });
        return def.promise;
      },

      register: function(userData, invitationToken) {
        var self = this;
        var def = $q.defer();
        var user = new Parse.User();
        user.set('username', userData.email);
        user.set('password', userData.password);
        user.set('email', userData.email);
        user.set('name', userData.displayname);
        user.set('invitationtoken', invitationToken);
        user.signUp(null, {
          success: function(newUser) {
            def.resolve(self._toUser(newUser));
          },
          error: function(newUser, error) {
            def.reject(error.message);
          }
        });
        return def.promise;
      },

      claimInvitationToken: function(user, invitationToken) {
        var self = this;
        var def = $q.defer();
        user._parseObj.set('invitationtoken', invitationToken);
        user._parseObj.save(null, {
          success: function() {
            def.resolve();
          },
          error: function(error) {
            def.reject(error);
          }
        });
        return def.promise;
      },

      facebookLogin: function() {
        var self = this;
        var deferred = $q.defer();
        Parse.FacebookUtils.logIn(null, {
          success: function(user) {
            if (!user.existed()) {
              
              // Get some information from facebook about this user
              FB.api('/me', {fields: 'name,picture,email'}, function(response) {
                if(response.error) {
                  deferred.reject(response.error);
                } else {
                  if('name' in response) {
                    user.set('name', response.name);
                  }
                  if('email' in response) {
                    user.set('email', response.email);
                  }
                  if('picture' in response && 'data' in response.picture && 'url' in response.picture.data) {
                    user.set('profilepic', response.picture.data.url);
                  }
                  user.save(null, {
                    success: function(newUser) {
                      deferred.resolve(self._toUser(newUser));
                    },
                    error: function(newUser, error) {
                      deferred.reject(error);
                    }
                  });
                }
              });
            } else {
              
              // Welcome back!
              deferred.resolve(self._toUser(user));
            }
          },
          error: function(user, error) {
            deferred.reject(error);
          }
        });
        return deferred.promise;
      },

      inviteViaEmail: function(emails, circle) {
        var def = $q.defer();
        Parse.Cloud.run('InviteFriends', { emails: emails, circle: circle }, {
          success: function() {
            def.resolve();
          },
          error: function() {
            def.reject();
          }
        });
        return def.promise;
      }
    };
  }]);
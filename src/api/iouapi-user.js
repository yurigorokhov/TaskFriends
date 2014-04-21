angular.module('iouapi-user', [])
  .factory('user', ['$q', function($q) {
    return {

      //--- Methods ---
      _toUser: function(parseObj) {
        return parseObj === null ? null : {
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
      }
    };
  }]);
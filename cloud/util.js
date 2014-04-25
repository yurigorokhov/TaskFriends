var Q = require('cloud/q.min.js');

exports.guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
};

exports.parseQuery = function(query) {
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
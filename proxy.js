var http = require('http'),
    httpProxy = require('http-proxy');
//
// Create your proxy server and set the target in the options.
//
var proxy = httpProxy.createProxyServer({});

//
// Create your target server
//
http.createServer(function (req, res) {
  proxy.web(req, res, { target: 'http://localhost:8080' });
}).listen(80);
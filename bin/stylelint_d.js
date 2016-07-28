var fs = require('fs');
var net = require('net');
var spawn = require('child_process').spawn;

var SOCKET_FILE = '/tmp/stylelint_d.sock';

// Start or return server connection
getServerConn().then(function(conn) {
  var args = process.argv.slice(2)[0];

  // If it's a start command, we handle it here
  if (args === 'start') {
    // The server has already started by virtue of getServerConn
    conn.end();
    return;
  }

  var data = [];

  conn.write(args);
  conn.on('data', function(d) {
    data.push(d.toString('utf8'));
  });

  conn.on('end', function() {
    var output;

    try {
      output = JSON.parse(data.join(''));
    } catch(e) {
      output = data.join('');
    }

    console.log(output);
  });
}).catch(function(err) {
  console.log(err);
});

function getServerConn() {
  var promise = new Promise(function(resolve, reject) {
    // Make sure the socket can be connected to
    var socket = new net.Socket({});

    socket.once('error', function() {
      var server = require.resolve('../lib/server');
      var child = spawn('node', [ server ], {
        detached: true,
        stdio: [ 'ignore', 'ignore', 'ignore' ],
      });
      child.unref();

      // Close this connection
      socket.destroy();

      // Wait for server to spawn and socket to connect
      waitForSocket().then(function(socket) {
        resolve(socket);
      })
    });

    socket.once('connect', function() {
      resolve(socket);
    })

    socket.connect({ path: SOCKET_FILE });
  });

  return promise;
}

function waitForSocket() {
  return new Promise(function(resolve, reject) {
    var counter = 0;

    var wait = function() {
      counter++;

      if (counter >= 10) {
        return reject(new Error('Could not connect to stylelint_d socket'));
      }

      var socket = new net.Socket({});
      socket.once('error', wait);
      socket.once('connect', function() {
        resolve(socket);
      });
      socket.connect({ path: SOCKET_FILE });
    }
  });
}
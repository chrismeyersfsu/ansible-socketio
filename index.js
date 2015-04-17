var io = require('socket.io-client')
var async = require('async')
var request = require('request')
var params = require('./params')
console.log(params)

var socket_options = {
    'force new connection': true,
    'reconnect': false,
    query: '',
}

var state = {
    objs: [],
    count: 0,
}

for (var i=0; i < params.total; ++i) {
    state.objs.push({
        socket: null,
        index: i,
        done: null,
    })
}

function disconnectHandler() {
//    console.log("Socket " + this.index + " disconnected")
    this.done()
}

function eventHandler(data) {
 //   console.log("Socket " + this.index + " got event " + data)
}

function connectHandler() {
    var self = this
 //   console.log("Socket " + this.index + " connected")
    setTimeout(function() {
        self.socket.disconnect()
    }, 1000)
}
console.log("Experiment, concurrency: " + params.concurrency_level + ", total: " + params.total)

async.waterfall([
        // get a token
    function (cb) {
        var options = {
            uri: params.auth_url,
            method: 'POST',
            json: {
                username: params.username,
                password: params.password
            }
        }
        request.post(options, function (err, resp, body) {
            if (err || resp.statusCode != 200) {
                return cb(Error("Getting token failed " + resp.statusCode))
            }
            cb(null, body.token)
        })
        // do the experiment
    }, function (token, cb) {
        async.eachLimit(state.objs, params.concurrency_level, function(obj, eachLimitDone) {
            state.count += 1

            socket_options.query = 'Token=' + token

            if (state.count % 100 == 0) {
                console.log("Completed " + state.count)
            }

            var rand = Math.floor(Math.random() * (params.namespaces.length-1))
            obj.namespace = params.namespaces[rand]
            obj.done = eachLimitDone

            url = params.host + obj.namespace
            obj.socket = io.connect(url, socket_options)
            obj.socket.on('disconnect', function(what) {
                disconnectHandler.call(obj)
            })
            obj.socket.on('event', function(data) {
                eventHandler.call(obj, data)
            })
            obj.socket.on('connect', function() {
                connectHandler.call(obj)
            })
        }, function (err) {
            if (err) {
                console.log("Each limit had an error: ", err)
            }
            console.log("Test finished success!")
            cb(err)
        })
    }
], function (err) {
    if (err) {
        console.log(err)
    }
})

({ define: typeof define === "function"
    ? define
    : function(A,F) { module.exports = F.apply(null, A.map(require)) } }).
define([ "underscore" ],
    function (_) {
        return {
            symanticToNumeric:function(symantic) {
                if (!symantic) return null;
                if (symantic[0] == "v") symantic = symantic.substring(1);
                var parts = symantic.split(".");
                var step = 1000;
                var numeric = parseInt(parts[0])*step*step + parseInt(parts[1])*step + parseInt(parts[2]);
                return numeric;
            },
            generateGuid:function() {
                var S4 = function() {
                   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
                };
                return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
            },
            createConduit:function(send) {
                var util = this;
                var conduit = function() { };
                conduit.callbacks = {};

                conduit.createCallback = function(callback) {
                    var guid = util.generateGuid();
                    conduit.callbacks[guid] = callback;
                    return guid;
                }

                conduit.retrieveCallback = function(guid) {
                    var callback = conduit.callbacks[guid];
                    delete conduit.callbacks[guid];
                    return callback;
                },

                conduit.emit = function(name) {
                    var emitObject = {
                        name: name,
                        args: Array.prototype.slice.call(arguments,1),
                        callback: null
                    }
//                    console.log("emit called",arguments);
//                    console.log("emit sending",emitObject);
                    send(emitObject);
                };

                conduit.emitOn = function(name,type,target) {
                    var emitObject = {
                        name: name,
                        type: type,
                        target: target.id,
                        args: Array.prototype.slice.call(arguments,3),
                        callback: null
                    }
//                    console.log("emitOn called",arguments);
//                    console.log("emitOn sending",emitObject);
                    send(emitObject);
                };

                conduit.request = function(name) {
                    var args = Array.prototype.slice.call(arguments,1,arguments.length-1)
                    var callback = Array.prototype.slice.call(arguments,arguments.length-1)[0];
                    var emitObject = {
                        name: name,
                        args: args,
                        callback: conduit.createCallback(callback),
                    }
//                    console.log("request called",arguments);
//                    console.log("request sending",emitObject);
                    send(emitObject);
                }

                conduit.respond = function(guid,argumentsArray) {
                    var emitObject = {
                        args: Array.prototype.slice.call(argumentsArray),
                        response: guid,
                    }
//                    console.log("respond called",arguments);
//                    console.log("respond sending",emitObject);
                    send(emitObject);
                }

                conduit.handleResponse = function(guid,argumentsArray) {
                    //console.log("handleResponse called",arguments);
                    var callback = conduit.retrieveCallback(guid);
                    callback.apply(this,argumentsArray);
                }
                return conduit;
            }
        }
    }
);

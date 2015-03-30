var request = require('request');
var vm = require("vm");
var fs = require("fs");

request("http://repo.zebkit.org/latest/zebra.min.js",function(err,response,content) {
	console.log(err);
	console.log(response);
	console.log("len: ",content.length);

	var context = {window:{}};
	vm.runInNewContext(content, context, "./");
	console.log(context.zebra);
});

module.exports = function(path, context) {
  var data = fs.readFileSync(path);
}
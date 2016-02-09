#!/usr/bin/env node

var xcode = require("xcode");
var fs = require('fs');
var path = require('path');
var plist = require('simple-plist');
var exec = require('child_process').exec;

module.exports = function(ctx) {
    return console.log("Skipping configureProject scirpt");
    console.log("Running configureProject.js script");
    var iosRoot = path.join(ctx.opts.projectRoot, 'platforms/ios');
    var projectPath = path.join(iosRoot,"Flickerstrip.xcodeproj/project.pbxproj");
	var projectPlist = path.join(iosRoot,"Flickerstrip/Flickerstrip-Info.plist");

	var xcodeProject = xcode.project(projectPath);

	xcodeProject.parse(function(err){
		if(err){
			console.log("error",err);
			throw err;
		} else {
			xcodeProject.updateBuildProperty("IPHONEOS_DEPLOYMENT_TARGET","7.0");
			xcodeProject.addBuildProperty("CODE_SIGN_IDENTITY","\"iPhone Distribution\"");
			xcodeProject.removeFromBuildSettings("CFBundleIconFile");

			// Set DevelopmentTeam
			var cmd = "perl -pe 's/(^.*)LastUpgradeCheck = 510;/\\1LastUpgradeCheck = 510;\\n\\1TargetAttributes = {\\n\\1\\t1D6058900D05DD3D006BFB54 = {\\n\\1\\t\\tDevelopmentTeam = 92664A3V2C;\\n\\1\\t};\\n\\1};/mg' "+projectPath+" | sponge "+projectPath
			exec(cmd);

			var plistData = plist.readFileSync(projectPlist);
			delete plistData["CFBundleIconFile"];
			plist.writeFileSync(projectPlist, plistData);

			fs.writeFileSync(projectPath, xcodeProject.writeSync(), 'utf-8');

			/*
				var COMMENT_KEY = /_comment$/;
			   var target;
				var configs = xcodeProject.pbxXCBuildConfigurationSection();
				for (var configName in configs) {
					if (!COMMENT_KEY.test(configName)) {
						var config = configs[configName];
						for (var key in config.buildSettings) {
							console.log(key);
						}
					}
				}
				*/

		}
	});
}; 



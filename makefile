all: nwjs

clean:
	rm -rf ./build

./buildcache:
	mkdir ./buildcache

./buildcache/node_modules: | ./buildcache
	cp ./src/nwjs/nwjs_package.json ./buildcache/package.json
	cd ./buildcache/ && npm install
	rm ./buildcache/package.json

./buildcache/jxcore_cordova: | ./buildcache
	cd ./buildcache && git clone https://github.com/jxcore/jxcore-cordova

############ NWJS
nwjs_prepare:
	mkdir -p ./build/nwjs

./build/nwjs/node_modules: | ./buildcache/node_modules
	cp -r ./buildcache/node_modules ./build/nwjs/

nwjs_update: ./build/nwjs/node_modules
	rsync --update -ravh ./src/controller ./build/nwjs/
	rsync --update -ravh ./src/view ./build/nwjs/
	rsync --update -ravh ./src/nwjs ./build/
	mv ./build/nwjs/nwjs_package.json ./build/nwjs/package.json

./build/nwjs/nwjs.app:
	cp -r nwjs/* ./build/nwjs/

nwjs: nwjs_prepare nwjs_update ./build/nwjs/nwjs.app
############ NWJS


############ CORDOVA
cordova_prepare:
	mkdir -p ./build/cordova
	mkdir -p ./build/cordova/www/jxcore

./build/cordova/www/jxcore/node_modules: | ./buildcache/node_modules
	cp -r ./buildcache/node_modules ./build/cordova/www/jxcore/

cordova_update: cordova_prepare | ./build/cordova/www/jxcore/node_modules
	rsync --update -ravh ./src/controller ./build/cordova/www/jxcore
	rsync --update -ravh ./src/view ./build/cordova/www/
	rsync --update -ravh ./src/cordova/www ./build/cordova/
	rsync --update -ravh ./src/cordova/cordovaconfig.xml ./build/cordova/config.xml

coreExtensions: ./build/cordova/jxcore-cordova ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.h ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.m ./build/cordova/jxcore-cordova/src/android/java/io/jxcore/node/JXcoreExtension.java ./build/cordova/jxcore-cordova/plugin.xml

./build/cordova/jxcore-cordova/plugin.xml: ./src/cordova/plugin.xml
	cp ./src/cordova/plugin.xml ./build/cordova/jxcore-cordova/plugin.xml
	-rm -rf ./build/cordova/plugins
	-rm -rf ./build/cordova/platforms

./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.h: ./src/cordova/ios/JXcoreExtension.h
	cp ./src/cordova/ios/JXcoreExtension.h ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.h
	-rm -rf ./build/cordova/plugins
	-rm -rf ./build/cordova/platforms

./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.m: ./src/cordova/ios/JXcoreExtension.m
	cp ./src/cordova/ios/JXcoreExtension.m ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.m
	-rm -rf ./build/cordova/plugins
	-rm -rf ./build/cordova/platforms

./build/cordova/jxcore-cordova/src/android/java/io/jxcore/node/JXcoreExtension.java: ./src/cordova/android/JXcoreExtension.java
	cp ./src/cordova/android/JXcoreExtension.java ./build/cordova/jxcore-cordova/src/android/java/io/jxcore/node/JXcoreExtension.java
	-rm -rf ./build/cordova/plugins
	-rm -rf ./build/cordova/platforms

./build/cordova/jxcore-cordova: | cordova_prepare ./buildcache/jxcore-cordova
	cp -r ./buildcache/jxcore-cordova ./build/cordova/
	rm ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.h ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.m ./build/cordova/jxcore-cordova/src/android/java/io/jxcore/node/JXcoreExtension.java ./build/cordova/jxcore-cordova/plugin.xml

./build/cordova/plugins: | ./build/cordova/jxcore-cordova
	cd ./build/cordova && cordova plugin add jxcore-cordova

./build/cordova/platforms: | cordova_update
	cd ./build/cordova && cordova platforms add android ios

cordova: cordova_update coreExtensions | ./build/cordova/plugins ./build/cordova/platforms

run_ios: cordova
	cd ./build/cordova && cordova run ios

run_android: cordova
	cd ./build/cordova && cordova run android
############ CORDOVA

run: nwjs
	open ./build/nwjs/nwjs.app

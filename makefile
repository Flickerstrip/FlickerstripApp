FIND_FLAGS := ! -name '.*.swp' -type f
LESS_FILES := $(shell find ./src/view/less $(FIND_FLAGS) -iname '*.less')
VIEW_FILES := $(shell find ./src/view $(FIND_FLAGS))
CONTROLLER_FILES := $(shell find ./src/controller $(FIND_FLAGS))
PATTERN_FILES := $(shell find ./patterns $(FIND_FLAGS))
SHARED_FILES := $(shell find ./src/shared $(FIND_FLAGS))
SRC_FILES := $(shell find ./src)
NWJS_PLATFORMS = $(shell ls ./nwjs)
RSYNC_OPT = --update -qravh --exclude '.*.swp'
DEBUG = 0

all: nwjs

print-%  : ; @echo $* = $($*)

clean:
	rm -rf ./build

./buildcache:
	mkdir ./buildcache

./buildcache/node_modules: | ./buildcache
	cp ./src/nwjs/package.json ./buildcache/package.json
	cd ./buildcache/ && npm install
	rm ./buildcache/package.json

./buildcache/jxcore_cordova: | ./buildcache
	cd ./buildcache && git clone https://github.com/jxcore/jxcore-cordova

############ NWJS
./build/nwjs/linux-x64: $(SRC_FILES)
	mkdir -p $@
	rsync $(RSYNC_OPT) ./src/nwjs/* $@
	cp -r ./nwjs/`basename $@`/* $@

./build/nwjs/osx-x64: $(SRC_FILES)
	mkdir -p $@
	rsync $(RSYNC_OPT) ./src/nwjs/* $@
ifeq ($(DEBUG),1)
	sed -i '' 's/"debug":false/"debug":true/g' $@/package.json
	sed -i '' 's/"toolbar": false/"toolbar":true/g' $@/package.json
endif
	cp -r ./nwjs/`basename $@`/* $@

./build/nwjs/win-x64: $(SRC_FILES)
	mkdir -p $@
	rsync $(RSYNC_OPT) ./src/nwjs/* $@
	cp -r ./nwjs/`basename $@`/* $@

./build/nwjs/%/node_modules: ./buildcache/node_modules
	cp -r ./buildcache/node_modules `dirname $@`

./build/nwjs/%/view: $(VIEW_FILES)
	rsync $(RSYNC_OPT) ./src/view `dirname $@`

./build/nwjs/%/controller: $(CONTROLLER_FILES)
	rsync $(RSYNC_OPT) --update -ravh ./src/controller `dirname $@`

./build/nwjs/%/shared: $(SHARED_FILES)
	rsync $(RSYNC_OPT) --update -ravh ./src/shared `dirname $@`

./build/nwjs/%/patterns: $(PATTERN_FILES)
	rsync $(RSYNC_OPT) --update -ravh ./patterns `dirname $@`

./build/nwjs/%/view/css/style.css: $(LESS_FILES)
	mkdir -p `dirname $@`
	lessc ./src/view/less/desktop.less > $@

linux-x64: ./build/nwjs/linux-x64 ./build/nwjs/linux-x64/patterns ./build/nwjs/linux-x64/view ./build/nwjs/linux-x64/controller ./build/nwjs/linux-x64/shared ./build/nwjs/linux-x64/node_modules ./build/nwjs/linux-x64/view/css/style.css
osx-x64: ./build/nwjs/osx-x64 ./build/nwjs/osx-x64/patterns ./build/nwjs/osx-x64/view ./build/nwjs/osx-x64/controller ./build/nwjs/osx-x64/shared ./build/nwjs/osx-x64/node_modules ./build/nwjs/osx-x64/view/css/style.css
win-x64: ./build/nwjs/win-x64 ./build/nwjs/win-x64/patterns ./build/nwjs/win-x64/view ./build/nwjs/win-x64/controller ./build/nwjs/win-x64/shared ./build/nwjs/win-x64/node_modules ./build/nwjs/win-x64/view/css/style.css


nwjs_all: linux-x64 osx-x64 win-x64
############ NWJS


############ CORDOVA
cordova_prepare:
	mkdir -p ./build/cordova
	mkdir -p ./build/cordova/www/jxcore

./build/cordova/www/jxcore/node_modules: | ./buildcache/node_modules
	cp -r ./buildcache/node_modules ./build/cordova/www/jxcore/

cordova_update: cordova_prepare | ./build/cordova/www/jxcore/node_modules
	rsync $(RSYNC_OPT) ./src/controller ./build/cordova/www/jxcore
	rsync $(RSYNC_OPT) ./src/shared ./build/cordova/www/jxcore
	rsync $(RSYNC_OPT) ./src/view ./build/cordova/www/ --exclude less
	rsync $(RSYNC_OPT) ./src/cordova/www ./build/cordova/
	rsync $(RSYNC_OPT) ./src/cordova/cordovaconfig.xml ./build/cordova/config.xml

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
	cd ./build/cordova && cordova plugin add cordova-plugin-statusbar

./build/cordova/platforms: | cordova_update
	cd ./build/cordova && cordova platforms add android ios

./build/cordova/www/view/css/style.css: $(LESS_FILES)
	mkdir -p ./build/cordova/www/view/css/
	lessc ./src/view/less/mobile.less > ./build/cordova/www/view/css/style.css

cordova: cordova_update ./build/cordova/www/view/css/style.css coreExtensions | ./build/cordova/plugins ./build/cordova/platforms

run_ios: cordova
	cd ./build/cordova && cordova run ios

run_android: cordova
	cd ./build/cordova && cordova run android
############ CORDOVA

run: osx-x64
	open ./build/nwjs/osx-x64/nwjs.app

.PHONY: linux-x64 osx-x64 win-x64 nwjs_all run clean run_android run_ios cordova

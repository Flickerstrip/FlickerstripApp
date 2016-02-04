FIND_FLAGS := ! -name '.*.swp' -type f
LESS_FILES := $(shell find ./src/view/less $(FIND_FLAGS) -iname '*.less')
VIEW_FILES := $(shell find ./src/view $(FIND_FLAGS))
CONTROLLER_FILES := $(shell find ./src/controller $(FIND_FLAGS))
PATTERN_FILES := $(shell find ./patterns $(FIND_FLAGS))
SHARED_FILES := $(shell find ./src/shared $(FIND_FLAGS))
SRC_FILES := $(shell find ./src)
NWJS_PLATFORMS = $(shell ls ./nwjs)
RSYNC_OPT = --update -qravh --exclude '.*.swp'
DEBUG ?= 0

all: nwjs

print-%  : ; @echo $* = $($*)

clean:
	-find ./build -iname patterns | while read LINE; do mv $$LINE ~/.Trash/patterns-`date +%s`; done
	rm -rf ./build

./buildcache:
	mkdir ./buildcache

./buildcache/node_modules: | ./buildcache
	cat src/nwjs/default.json src/nwjs/user.json | json --deep-merge > ./buildcache/package.json
	cd ./buildcache/ && npm install
	rm ./buildcache/package.json

############ NWJS
./build/nwjs/linux-x64: $(SRC_FILES)
	mkdir -p $@
	rsync $(RSYNC_OPT) ./src/nwjs/* $@
	cp ./updater.sh $@/updater.sh
ifeq ($(DEBUG),1)
	cat ./src/default.json ./src/debug.json | json --deep-merge > $@/package.json
else
	cat ./src/default.json ./src/user.json | json --deep-merge > $@/package.json
endif
	cp -r ./nwjs/`basename $@`/* $@

./build/nwjs/osx-x64: $(SRC_FILES)
	mkdir -p $@
	rsync $(RSYNC_OPT) ./src/nwjs/* $@
	cp ./updater.sh $@/updater.sh
ifeq ($(DEBUG),1)
	cat ./src/default.json ./src/debug.json | json --deep-merge > $@/package.json
else
	cat ./src/default.json ./src/user.json | json --deep-merge > $@/package.json
endif
	cp -r ./nwjs/`basename $@`/* $@

./build/nwjs/win-x64: $(SRC_FILES)
	mkdir -p $@
	rsync $(RSYNC_OPT) ./src/nwjs/* $@
	cp ./updater.bat $@/updater.bat
ifeq ($(DEBUG),1)
	cat ./src/default.json ./src/debug.json | json --deep-merge > $@/package.json
else
	cat ./src/default.json ./src/user.json | json --deep-merge > $@/package.json
endif
	cp -r ./nwjs/`basename $@`/* $@

./build/nwjs/%/node_modules: ./buildcache/node_modules
	cp -r ./buildcache/node_modules `dirname $@`

./build/nwjs/%/view: $(VIEW_FILES)
	rsync $(RSYNC_OPT) ./src/view `dirname $@`

./build/nwjs/%/controller: $(CONTROLLER_FILES)
	rsync $(RSYNC_OPT) --update -ravh ./src/controller `dirname $@`

./build/nwjs/%/shared: $(SHARED_FILES)
	rsync $(RSYNC_OPT) --update -ravh ./src/shared `dirname $@`

./build/nwjs/%/patterns: 
	mkdir -p $@
	p=`dirname $@`/package.json; for f in `cat $$p | json -a includedpatterns`; do echo $$f; for i in ./patterns/$$f/*; do echo cp "$$i" $@/;cp "$$i" $@/; done; done

./build/nwjs/%/view/css/style.css: $(LESS_FILES)
	mkdir -p `dirname $@`
	lessc ./src/view/less/desktop.less > $@

linux-x64: ./build/nwjs/linux-x64 ./build/nwjs/linux-x64/patterns ./build/nwjs/linux-x64/view ./build/nwjs/linux-x64/controller ./build/nwjs/linux-x64/shared ./build/nwjs/linux-x64/node_modules ./build/nwjs/linux-x64/view/css/style.css
osx-x64: ./build/nwjs/osx-x64 ./build/nwjs/osx-x64/patterns ./build/nwjs/osx-x64/view ./build/nwjs/osx-x64/controller ./build/nwjs/osx-x64/shared ./build/nwjs/osx-x64/node_modules ./build/nwjs/osx-x64/view/css/style.css
win-x64: ./build/nwjs/win-x64 ./build/nwjs/win-x64/patterns ./build/nwjs/win-x64/view ./build/nwjs/win-x64/controller ./build/nwjs/win-x64/shared ./build/nwjs/win-x64/node_modules ./build/nwjs/win-x64/view/css/style.css


nwjs_all: linux-x64 osx-x64 win-x64
############ NWJS


############ CORDOVA
./build/cordova: ./build/cordova/www ./build/cordova/config.xml jxcoreExtensions ./build/cordova/plugins ./build/cordova/platforms ./build/cordova/resources

#Download jxcore
./buildcache/io.jxcore.node: | ./buildcache
	cd ./buildcache && jxc download
	rm ./buildcache/io.jxcore.node/plugin.xml ./buildcache/io.jxcore.node/src/ios/JXcoreExtension.h ./buildcache/io.jxcore.node/src/ios/JXcoreExtension.m ./buildcache/io.jxcore.node/src/android/java/io/jxcore/node/JXcoreExtension.java

#Download node modules
./build/cordova/www/jxcore/node_modules: | ./buildcache/node_modules
	mkdir -p ./build/cordova/www/jxcore
	cp -r ./buildcache/node_modules ./build/cordova/www/jxcore/

#update config.xml
./build/cordova/config.xml: ./src/cordova/cordovaconfig.xml
	cp ./src/cordova/cordovaconfig.xml ./build/cordova/config.xml

./build/cordova/www/jxcore/package.json: ./src/user.json ./src/default.json
	mkdir -p ./build/cordova/www/jxcore
	cat ./src/default.json ./src/user.json | json --deep-merge > $@

#update application code
./build/cordova/www/view/css/style.css: $(LESS_FILES)
	mkdir -p ./build/cordova/www/view/css/
	lessc ./src/view/less/mobile.less > ./build/cordova/www/view/css/style.css

./build/cordova/www: ./build/cordova/www/view/css/style.css ./build/cordova/www/jxcore/package.json ./build/cordova/www/jxcore/node_modules ./build/cordova/www/jxcore/patterns $(SRC_FILES)
	mkdir -p ./build/cordova/www
	rsync $(RSYNC_OPT) ./src/controller ./build/cordova/www/jxcore
	rsync $(RSYNC_OPT) ./src/shared ./build/cordova/www/jxcore
	rsync $(RSYNC_OPT) ./src/shared ./build/cordova/www
	rsync $(RSYNC_OPT) ./src/view ./build/cordova/www/ --exclude less
	rsync $(RSYNC_OPT) ./src/cordova/www ./build/cordova/

./build/cordova/www/jxcore/patterns:
	rsync $(RSYNC_OPT) ./patterns/base/* $@


./build/cordova/resources: ./src/cordova/resources/*
	rsync $(RSYNC_OPT) ./src/cordova/resources ./build/cordova

./build/cordova/build.json:
	cp ./src/cordova/build.json ./build/cordova/build.json

####### Plugins
./build/cordova/plugins: | ./build/cordova/plugins/cordova-plugin-statusbar ./build/cordova/plugins/io.jxcore.node ./build/cordova/plugins/cordova-plugin-inappbrowser

./build/cordova/plugins/cordova-plugin-statusbar:
	cd ./build/cordova && cordova plugin add cordova-plugin-statusbar

./build/cordova/plugins/io.jxcore.node:
	cd ./build/cordova && cordova plugin add ../../buildcache/io.jxcore.node

./build/cordova/plugins/cordova-plugin-inappbrowser:
	cd ./build/cordova && cordova plugin add cordova-plugin-inappbrowser

####### Platforms
./build/cordova/platforms: | ./build/cordova/platforms/ios ./build/cordova/platforms/android

./build/cordova/platforms/ios:
	cd ./build/cordova && cordova platforms add ios

./build/cordova/platforms/android:
	cd ./build/cordova && cordova platforms add android

jxcoreExtensions: ./buildcache/io.jxcore.node/plugin.xml ./buildcache/io.jxcore.node/src/ios/JXcoreExtension.h ./buildcache/io.jxcore.node/src/ios/JXcoreExtension.m ./buildcache/io.jxcore.node/src/android/java/io/jxcore/node/JXcoreExtension.java

./buildcache/io.jxcore.node/plugin.xml: ./src/cordova/plugin.xml
	cp ./src/cordova/plugin.xml $@
	-cd ./build/cordova && cordova plugin remove io.jxcore.node

./buildcache/io.jxcore.node/src/ios/JXcoreExtension.h: ./src/cordova/ios/JXcoreExtension.h
	cp ./src/cordova/ios/JXcoreExtension.h $@
	-cd ./build/cordova && cordova plugin remove io.jxcore.node

./buildcache/io.jxcore.node/src/ios/JXcoreExtension.m: ./src/cordova/ios/JXcoreExtension.m
	cp ./src/cordova/ios/JXcoreExtension.m $@
	-cd ./build/cordova && cordova plugin remove io.jxcore.node

./buildcache/io.jxcore.node/src/android/java/io/jxcore/node/JXcoreExtension.java: ./src/cordova/android/JXcoreExtension.java
	cp ./src/cordova/android/JXcoreExtension.java $@
	-cd ./build/cordova && cordova plugin remove io.jxcore.node

cordova: ./build/cordova

run_ios: cordova
	cd ./build/cordova && cordova run ios

run_android: cordova
	cd ./build/cordova && cordova run android
############ CORDOVA

run: | osx-x64
	open ./build/nwjs/osx-x64/nwjs.app

android_release: cordova ./build/cordova/build.json
	cd ./build/cordova && cordova build --release android

	
	

.PHONY: linux-x64 osx-x64 win-x64 nwjs_all run clean run_android run_ios cordova

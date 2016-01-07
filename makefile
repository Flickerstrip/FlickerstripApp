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

#./buildcache/jxcore-cordova: | ./buildcache
#cd ./buildcache && git clone https://github.com/jxcore/jxcore-cordova

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
./build/cordova: ./build/cordova/www ./build/cordova/config.xml | ./build/cordova/plugins ./build/cordova/platforms

#Download jxcore
./buildcache/io.jxcore.node.jx: | ./buildcache
	cd ./buildcache && wget http://az836273.vo.msecnd.net/0.0.8/io.jxcore.node.jx

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

./build/cordova/www: ./build/cordova/www/view/css/style.css ./build/cordova/www/jxcore/package.json ./build/cordova/www/jxcore/node_modules $(CONTROLLER_FILES) $(SHARED_FILES) $(VIEW_FILES)
	mkdir -p ./build/cordova/www
	rsync $(RSYNC_OPT) ./src/controller ./build/cordova/www/jxcore
	rsync $(RSYNC_OPT) ./src/shared ./build/cordova/www/jxcore
	rsync $(RSYNC_OPT) ./src/shared ./build/cordova/www
	rsync $(RSYNC_OPT) ./src/view ./build/cordova/www/ --exclude less
	rsync $(RSYNC_OPT) ./src/cordova/www ./build/cordova/

####### Plugins
./build/cordova/plugins: ./build/cordova/plugins/cordova-plugin-statusbar ./build/cordova/plugins/io.jxcore.node

./build/cordova/plugins/cordova-plugin-statusbar:
	cd ./build/cordova && cordova plugin add cordova-plugin-statusbar

./build/cordova/plugins/io.jxcore.node:
	cd ./build/cordova && jxc install ../../buildcache/io.jxcore.node.jx

####### Platforms
./build/cordova/platforms: ./build/cordova/platforms/ios ./build/cordova/platforms/android

./build/cordova/platforms/ios:
	cd ./build/cordova && cordova platforms add ios

./build/cordova/platforms/android:
	cd ./build/cordova && cordova platforms add android

#coreExtensions: ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.h ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.m ./build/cordova/jxcore-cordova/src/android/java/io/jxcore/node/JXcoreExtension.java ./build/cordova/jxcore-cordova/plugin.xml

#./build/cordova/jxcore-cordova/plugin.xml: ./src/cordova/plugin.xml
#cp ./src/cordova/plugin.xml ./build/cordova/jxcore-cordova/plugin.xml
#-rm -rf ./build/cordova/plugins
#-rm -rf ./build/cordova/platforms

#./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.h: ./src/cordova/ios/JXcoreExtension.h
#cp ./src/cordova/ios/JXcoreExtension.h ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.h
#-rm -rf ./build/cordova/plugins
#-rm -rf ./build/cordova/platforms

#./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.m: ./src/cordova/ios/JXcoreExtension.m
#cp ./src/cordova/ios/JXcoreExtension.m ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.m
#-rm -rf ./build/cordova/plugins
#-rm -rf ./build/cordova/platforms

#./build/cordova/jxcore-cordova/src/android/java/io/jxcore/node/JXcoreExtension.java: ./src/cordova/android/JXcoreExtension.java
#cp ./src/cordova/android/JXcoreExtension.java ./build/cordova/jxcore-cordova/src/android/java/io/jxcore/node/JXcoreExtension.java
#-rm -rf ./build/cordova/plugins
#-rm -rf ./build/cordova/platforms

#./build/cordova/jxcore-cordova: | cordova_prepare ./buildcache/jxcore-cordova
#cp -r ./buildcache/jxcore-cordova ./build/cordova/
#rm ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.h ./build/cordova/jxcore-cordova/src/ios/JXcoreExtension.m ./build/cordova/jxcore-cordova/src/android/java/io/jxcore/node/JXcoreExtension.java ./build/cordova/jxcore-cordova/plugin.xml

#./build/cordova/plugins: | ./buildcache/io.jxcore.node.jx
#cd ./build/cordova && jxc install ../../buildcache/io.jxcore.node.jx
#cd ./build/cordova && cordova plugin add cordova-plugin-statusbar

#./build/cordova/platforms: | cordova_update
#cd ./build/cordova && cordova platforms add android ios

cordova: ./build/cordova

run_ios: cordova
	cd ./build/cordova && cordova run ios

run_android: cordova
	cd ./build/cordova && cordova run android
############ CORDOVA

run: | osx-x64
	open ./build/nwjs/osx-x64/nwjs.app

.PHONY: linux-x64 osx-x64 win-x64 nwjs_all run clean run_android run_ios cordova

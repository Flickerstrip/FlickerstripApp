all: nwjs

clean:
	rm -rf ./build

./build/node_modules: ./build/package.json ./build/package.json
	cd ./build/ && npm install

nwjs_update:
	rsync --update -ravh ./src/controller ./build/nwjs/
	rsync --update -ravh ./src/view ./build/nwjs/
	rsync --update -ravh ./src/nwjs ./build/
	mv ./build/nwjs/nwjs_package.json ./build/nwjs/package.json
	cd ./build/nwjs/ && npm install

prepare:
	mkdir -p ./build/nwjs
	mkdir -p ./build/cordova

./build/nwjs/nwjs.app:
	cp -r nwjs/* ./build/nwjs/

nwjs: prepare nwjs_update ./build/nwjs/nwjs.app

run: nwjs
	open ./build/nwjs/nwjs.app

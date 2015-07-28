all: nwjs

./build/node_modules: ./build/package.json
	cd ./build/ && npm install

./build/view:
	cp -r ./src/view ./build/view

./build/controller:
	cp -r ./src/controller ./build/controller

./build:
	mkdir ./build

./build/package.json: ./src/nwjs_package.json ./build
	cp ./src/nwjs_package.json ./build/package.json

./build/nwjs.app:
	cp -r nwjs/* ./build/

nwjs: ./build/node_modules ./src/view ./src/controller ./build/package.json ./build/nwjs.app
	rm -rf ./build/view
	rm -rf ./build/controller
	cp -r ./src/view ./build/view
	cp -r ./src/controller ./build/controller

run: nwjs
	open ./build/nwjs.app

require("ti-mocha");
var should=require("should");
var $timer=require("com.appcelerator.timer");
describe("test", function() {
    for (var $r = 0; $r < 1; $r++) it("should test empty view", function() {
        var view = Ti.UI.createView();
        should(view).be.not.null;
    })
});
var $results = [];
function $Reporter(runner){
	var started, title;
	runner.on("suite",function(suite){
		title = suite.title;
	});
	runner.on("test",function(test){
		started = $timer.time();
	});
	runner.on("test end",function(test){
		var tdiff = $timer.time()-started;
		$results.push({state:test.state,duration:tdiff,suite:title,title:test.title});
	});
};
mocha.setup({
	reporter: $Reporter,
	quiet: true
});
var $runner = mocha.run(function(){
	var obj = {results:$results,platform:{},displayCaps:{},build:{}};
	obj.date = new Date;
	obj.platform.ostype = Ti.Platform.ostype;
	obj.platform.name = Ti.Platform.name;
	obj.platform.osname = Ti.Platform.osname;
	obj.platform.ostype = Ti.Platform.ostype;
	obj.platform.version = Ti.Platform.version;
	obj.platform.address = Ti.Platform.address;
	obj.platform.macaddress = Ti.Platform.macaddress;
	obj.platform.architecture = Ti.Platform.architecture;
	obj.platform.availableMemory = Ti.Platform.availableMemory;
	obj.platform.manufacturer  = Ti.Platform.manufacturer ;
	obj.platform.model  = Ti.Platform.model ;
	obj.displayCaps.density = Ti.Platform.displayCaps.density;
	obj.displayCaps.dpi = Ti.Platform.displayCaps.dpi;
	obj.displayCaps.platformHeight = Ti.Platform.displayCaps.platformHeight;
	obj.displayCaps.platformWidth = Ti.Platform.displayCaps.platformWidth;
	obj.displayCaps.xdpi = Ti.Platform.displayCaps.xdpi;
	obj.displayCaps.ydpi = Ti.Platform.displayCaps.ydpi;
	obj.build.date = Ti.buildDate;
	obj.build.git = Ti.buildHash;
	obj.build.version = Ti.version;
	Ti.API.info("!TEST_RESULTS_START!");
	var str = JSON.stringify(obj,null,3);		Ti.API.info(str);
	Ti.API.info("!TEST_RESULTS_STOP!");
});
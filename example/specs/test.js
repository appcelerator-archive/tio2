describe("test", function(){
    it("should test empty view", function(){
        var view = Ti.UI.createView();
        should(view).be.not.null;
    });
    it("should test window", function(done){
    	var win = Ti.UI.createWindow();
        var view = Ti.UI.createView();
        should(view).be.not.null;
        function opened(event) {
        	should(event).be.not.null;
        	done();
        }
        win.add(view);
        win.addEventListener('open',opened);
        win.open();
    });
});

describe("test", function(){
    it("should test empty view", function(){
        var view = Ti.UI.createView();
        should(view).be.not.null;
    });
    it("should test view with parameters",function(){
        var view = Ti.UI.createView({
            backgroundColor:'red',
            width: 100,
            height: 100
        });
        should(view).be.not.null;
    });
    it("should test view with custom parameters",function(){
        var view = Ti.UI.createView({
            a:1,
            b:true,
            c:'a',
            d:{}
        });
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
    it("should test postlayout event", function(done){
        var win = Ti.UI.createWindow();
        var view = Ti.UI.createView();
        should(view).be.not.null;
        function postlayout(event) {
            should(event).be.not.null;
            should(event.rect).be.object;
            should(event.size).be.object;
            done();
        }
        win.add(view);
        win.addEventListener('postlayout',postlayout);
        win.open();
    });
    it("should be able to read foo.txt", function(done){
        var f = Titanium.Filesystem.getFile(Titanium.Filesystem.resourcesDirectory, 'foo.txt');
        var contents = String(f.read());
        should(contents).be.equal("bar\n");
        done();
    });
});

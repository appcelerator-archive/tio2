describe("other",function(){
	it("should be able to read subfolder file",function(done){
        var f = Titanium.Filesystem.getFile(Titanium.Filesystem.resourcesDirectory, 'folder/bar.txt');
        var contents = String(f.read());
        should(contents).be.equal('foo');
        done();
	});
});
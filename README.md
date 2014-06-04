# Tio2 [![Appcelerator Titanium](http://www-static.appcelerator.com/badges/titanium-git-badge-sq.png)](http://www.appcelerator.com/titanium/)

Titanium utility for better automated unit and functional testing of Titanium APIs and Titanium Apps.

This utility is meant to be run from the command-line against an existing Titanium app (either Alloy or Titanium classic).

It's meant to be non-invasive (i.e. doesn't write over your app.xml, tiapp.xml, etc.) and non-confrontational (create artifacts that must be merged in git, etc).

## Current Status [![NPM version](https://badge.fury.io/js/tio2.svg)](http://badge.fury.io/js/tio2)

- works on iOS simulator only. device coming soon
- will work on android but launch code has to be added

## Requirements

* [Node.js](http://nodejs.org/) >= 0.10.13
* [Titanium CLI](https://github.com/appcelerator/titanium)
* [Titanium SDK](https://github.com/appcelerator/titanium_mobile)

## Install

#### from npm 

```
[sudo] npm install -g tio2
```

#### from github (cutting edge)

```bash
[sudo] npm install -g git://github.com/appcelerator/tio2.git
```

#### clone and install local

```bash
git clone https://github.com/appcelerator/tio2.git
cd tio2
npm install
sudo npm link
```

## Quick Start

Create a `specs` folder in your Titanium app (at the same level as the `Resources` folder).  The spec should be in mocha format.

For example, really simple spec file:

```
describe("Ti.UI",function(){
    it("create empty view", function(){
        var view = new Ti.UI.createView();
        should(view).not.be.null;
    }); 
});
```

```
# run the built-in example
tio2 ./examples

# let's launch and run once
tio2 --platform ios /path/to/project

# let's launch and run 100 iterations
tio2 --platform ios --count 100 /path/to/project

# let's make it quiet (no logging)
tio2 --platform ios --quiet --count 100 /path/to/project

# let's filter for test specs that match a specific regular expression
tio2 --platform ios --grep "^foo" --count 100 /path/to/project

# let's launch and run on device
tio2 --platform ios --target device /path/to/project
```

Notice that you do not need to require should or ti-mocha and you don't need to run the mocha test suite (using `mocha.run`).  This will be done automatically for you.

Example output will be in JSON with each test iteration as well as environmental information collected during the test:

```
{
   "results": [
      {
         "state": "passed",
         "duration": 2119,
         "suite": "hello",
         "title": "test emptyview"
      },
      {
         "state": "passed",
         "duration": 1177,
         "suite": "hello",
         "title": "test basic view"
      },
      {
         "state": "passed",
         "duration": 1529,
         "suite": "hello",
         "title": "test basic window"
      },
      {
         "state": "passed",
         "duration": 3052,
         "suite": "hello",
         "title": "test basic windowopen/close"
      },
      {
         "state": "passed",
         "duration": 2930,
         "suite": "hello",
         "title": "test basic window with single view"
      }
   ],
   "platform": {
      "ostype": "32bit",
      "name": "iPhone OS",
      "osname": "iphone",
      "version": "7.1",
      "address": "99.9.9.9",
      "macaddress": "D5484924-CCBD-4901-9057-AED67992AFE9",
      "architecture": "x86_64",
      "availableMemory": 399.75390625,
      "manufacturer": "unknown",
      "model": "Simulator"
   },
   "displayCaps": {
      "density": "high",
      "dpi": 320,
      "platformHeight": 480,
      "platformWidth": 320
   },
   "build": {
      "date": "05/23/1416:33",
      "git": "baea217",
      "version": "3.3.0"
   },
   "date": "2014-05-28T17:49:44.564Z"
}
```

The duration of each test is in microseconds, which allows you to get more accurate timings of test iterations.

## Motivations

The original genesis of this project was to build a better tool that would allow us to capture performance data for each build.  We have a legacy set of performance tests that we run but they are manual and are brittle and don't provide the coverage that we need.  This started out as a prototype to be able to simply write "ti-mocha" unit tests that could serve as performance benchmarks.  However, after reviewing this, we thought this could be more broadly useful and could expand beyond
performance measurements.

## Limitations / TODO

- Currently, only JSON is output.  Will expand to provide integration with mocha reporters.
- Android support
- Windows 8 support


## Credits

Some great Titanium based utilities are leveraged to make this all work:

- [tiapp.xml](https://github.com/tonylukasavage/tiapp.xml)
- [ti-mocha](http://tonylukasavage.com/ti-mocha/)

Among other great open source libraries like [mocha](https://github.com/visionmedia/mocha), [should](https://github.com/visionmedia/should.js/), etc.


## Reporting Bugs or submitting fixes

If you run into problems, and trust us, there are likely plenty of them at this point -- please create an [Issue](https://github.com/appcelerator/tio2/issues) or, even better, send us a pull request. 

## Contributing

tio2 is an open source project.  tio2 wouldn't be where it is now without contributions by the community. Please consider forking tio2 to improve, enhance or fix issues. If you feel like the community will benefit from your fork, please open a pull request.

To protect the interests of the tio2 contributors, Appcelerator, customers and end users we require contributors to sign a Contributors License Agreement (CLA) before we pull the changes into the main repository. Our CLA is simple and straightforward - it requires that the contributions you make to any Appcelerator open source project are properly licensed and that you have the legal authority to make those changes. This helps us significantly reduce future legal risk for everyone involved. It is easy, helps everyone, takes only a few minutes, and only needs to be completed once.

[You can digitally sign the CLA](http://bit.ly/app_cla) online. Please indicate your email address in your first pull request so that we can make sure that will locate your CLA.  Once you've submitted it, you no longer need to send one for subsequent submissions.

## Contributors

The original source and design for this project was developed by [Jeff Haynie](http://github.com/jhaynie) ([@jhaynie](http://twitter.com/jhaynie)).


## The name?

TiO2 (Titanium + Oxygen) is the most important oxide, which exists in three important polymorphs; anatase, brookite, and rutile. Oxygen is vital to life on earth -- and so is testing to building great software.


## Legal

Copyright (c) 2014 by [Appcelerator, Inc](http://www.appcelerator.com). All Rights Reserved.
This project is licensed under the Apache Public License, version 2.  
Please see details in the LICENSE file.

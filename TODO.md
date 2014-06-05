# TODO

Some thoughts on the roadmap of items we are going to try and accomplish.  Some of this is out-of-scope of the tio2 project but I'm keeping them here until we can start to split the projects out.

# tio2

- Make it so that you can run N number of connected devices (one build on all devices) and collate the results per device
- Support running on both simulator and device (same as multiple devices)

# Re-thinking [Anvil](https://github.com/appcelerator/anvil)

Hub and Driver seem like decent designs.  However, ideally we would really make this much much more simple.

### Hub

- Hub would simply collect results.
- Hub would have a REST API for easy extensibility.
- Hub would have a simple UI (better version of http://anvil.appcelerator.com/)

Hub would have 2 main sub-components:

- Database of jobs, spokes, results.  Database should be very lightweight and not have high overhead (Sqlite?)
- Web server to provide result details, manage Hub and handle REST APIs (express)?

I'd like Hub to be something that is rather easy to setup.

### Driver

- Driver would simply listen for build triggers (REST API, Github hook, etc) and run tio2 for a given set of connected devices/simulators
- Driver would push results to Hub
- Driver would manage the environment such as getting specific version of Titanium, app, etc
- Driver would use tio2 to actually perform test

Driver would be a sub-component of a Spoke (see below) although ideally you could run driver directly in local dev mode without having to install a spoke (discuss).

Driver would be a CLI program.

### Spoke

This is a new concept. A spoke would simply be in charge of a driver and listen for Hub jobs.  You could submit a job to Hub and it would ask Spokes that were configured to receive jobs for a given configuration to run them.

On startup, Spoke would determine it's connected devices and self-determine configuration (i.e. would launch a configuration discovery app which would dump JSON back of its device config) and then a Hub registration message with this configuration.  Hub would use this to send jobs back to Spoke.  Spoke would need to be setup to poll Hub so that it can be run in non-Appcelerator corp environments (i.e. dev home machine, partner, customer, community, etc).

One concept would be that anyone could share their spoke for a specific configuration.  Let's say you need access to a specific network and device and you don't have it. Ideally, you could submit your tests to a Spoke with that configuration and the Spoke would run it and report results back to Hub and you could get the results from the Hub.

Spoke would be a CLI program (both foreground as well as daemon).

### Hub Notifications

I'd love to be able to have a CLI that I can submit a "job" to Hub and then get a Toast notification (or Tray icon) when the job is completed.

### Developer Experience

I want to be able to very very easily install one or two components via NPM and then simply run.  I don't want complicated configurations and setup.  It should at a minimum self-discover my environment without configuration and then I can specify configuration for more fine-grain control.

### Job Submission

Probably need two modes: 

- Submit a built app to Hub for run on Spoke(s)
- Submit source to Hub for run on Spoke(s)

This would support the following use cases:

- I want to submit my pre-built app to run but I don't want you to have my source code
- I want to test of many variations of devices for different versions of OS versions
- I want to do a remote source code pull and then build and test (CI loop plugin)
- I want to do a distributed build - i.e. take my Ti app and test it on various different OS/devices

### Components to consider

- [OSX notification](https://github.com/chbrown/osx-notifier)





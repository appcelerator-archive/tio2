/**
 * Time module
 *
 * Appcelerator Titanium is Copyright (c) 2009-2010 by Appcelerator, Inc.
 * and licensed under the Apache Public License (version 2)
 */
#import "ComAppceleratorTimerModule.h"
#import "TiBase.h"
#import "TiHost.h"
#import "TiUtils.h"
#import <mach/mach_time.h>

mach_timebase_info_data_t info;

@implementation ComAppceleratorTimerModule

#pragma mark Internal

// this is generated for your module, please do not change it
-(id)moduleGUID
{
	return @"f2c19aa5-457d-4f65-b5f7-e173cea7377c";
}

// this is generated for your module, please do not change it
-(NSString*)moduleId
{
	return @"com.appcelerator.timer";
}

-(instancetype)init
{
    self = [super init];
    mach_timebase_info(&info);
    return self;
}

-(id)time:(id)noarg
{
    uint64_t nanos = mach_absolute_time() * info.numer / info.denom;
    double v = nanos / NSEC_PER_USEC;
    return [NSNumber numberWithDouble:v];
}

@end

//
//  DeviceInfo.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 16/08/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>
#import <Backbase/DeviceInfoComponent.h>

#ifndef DEVICEINFOPLUGIN_CLASS
#define DEVICEINFOPLUGIN_CLASS

/// Device information plugin specification
@protocol DeviceInfoPluginSpec <Plugin>
/// Returns information about the display of the device
/// @param callbackId The callbackId that this invocation refers to.
- (void)display:(NSString* _Nonnull)callbackId;
@end

/// DeviceInformation plugin implementation
@interface DeviceInfo : Plugin <DeviceInfoPluginSpec>

/// Native component that retrieves the device information
@property (strong, nonatomic, nonnull) DeviceInfoComponent* component;
@end

#endif

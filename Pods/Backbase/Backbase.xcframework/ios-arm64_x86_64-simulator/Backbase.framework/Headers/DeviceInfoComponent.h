//
//  DeviceInfoComponent.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 16/08/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef DEVICEINFOCOMPONENT_CLASS
#define DEVICEINFOCOMPONENT_CLASS

/// Device Info component specification
@interface DeviceInfoComponent : NSObject

/**
 * Returns the display information of the device group by type.
 * @discussion The information of the display will be grouped over the different types as: insets, size, etc.
 * @return a dictionary with all categories as keys
 */
- (NSDictionary<NSString*, NSDictionary*>* _Nonnull)display;
@end

#endif

//
//  BBHSDKTemplateConfiguration.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 15/10/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/BBTemplateConfiguration.h>

/// HSDK template generation related configurations
@interface BBHSDKTemplateConfiguration : BBTemplateConfiguration

/// Preload value
@property (assign, nonatomic) BOOL preload;

/// Tag select that will be used to create the root element for the rendering.
/// @discussion to create <demo-app-ios></demo-app-ios> rootElement must equate to demo-app-ios
@property (strong, nonatomic) NSString* rootElement;

@end

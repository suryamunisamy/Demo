//
//  BBHSDKConfiguration.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 15/10/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

@class BBHSDKTemplateConfiguration;

/// HSDK  configuration
@interface BBHSDKConfiguration : NSObject

///  HSDK template configuration for pages
@property (nonatomic, strong) NSDictionary<NSString*, BBHSDKTemplateConfiguration*>* templates;

@end

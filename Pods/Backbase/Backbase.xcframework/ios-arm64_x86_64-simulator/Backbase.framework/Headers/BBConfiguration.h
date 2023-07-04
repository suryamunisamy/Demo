//
//  BBConfiguration.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 08/02/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

@class BBBackbaseConfiguration;
@class BBDevelopmentConfiguration;
@class BBHSDKConfiguration;
@class BBSecurityConfiguration;
@class BBTemplateConfiguration;

/// Backbase specific configuration
@interface BBConfiguration : NSObject

/// Backend related configurations
@property (strong, nonatomic) BBBackbaseConfiguration* backbase;

/// Development related configurations
@property (strong, nonatomic) BBDevelopmentConfiguration* development;

/// HSDK configuration
@property (strong, nonatomic) BBHSDKConfiguration* hsdk;

/// Template related configurations
#ifdef __cplusplus
@property (strong, nonatomic, getter=getTemplate, setter=setTemplate:) BBTemplateConfiguration* _template;
#else
@property (strong, nonatomic, getter=getTemplate, setter=setTemplate:) BBTemplateConfiguration* template;
#endif

/// Security related configurations
@property (strong, nonatomic) BBSecurityConfiguration* security;

/// App-related custom configurations
@property (strong, nonatomic) NSDictionary* custom;

@end

//
//  BBSecurityConfiguration.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 08/02/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

@class BBSSLPinningConfiguration;

/// Security related configurations
@interface BBSecurityConfiguration : NSObject

/// List of endpoints for which OAuth2 Authorization token injection is needed.
@property (strong, nonatomic) NSArray<NSString*>* allowedResourceServers;

/// List of patterns for allowed domains (RWARP)
@property (strong, nonatomic) NSArray<NSString*>* allowedDomains;

/// SSL pinning related configurations
@property (strong, nonatomic) BBSSLPinningConfiguration* sslPinning;

/// Block web view originated request.
@property (assign, nonatomic) BOOL blockWebViewRequests;

@end

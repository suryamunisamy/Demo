//
//  BBDevelopmentConfiguration.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 08/02/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

@class BBExperimentalConfiguration;

/// Development related configurations
@interface BBDevelopmentConfiguration : NSObject

/// Enable debugging functionalities
@property (assign, nonatomic) BOOL debugEnable;

/// Allows untrusted certificates without producing errors. Depends on debugEnable to work.
@property (assign, nonatomic) BOOL allowUntrustedCertificates;

/// Context root to be use during development time. Depends on debugEnable to work, and replaces the standard
/// contextRoot placeholder
@property (strong, nonatomic) NSString* contextRoot;

/// Experimental features toggles
@property (strong, nonatomic) BBExperimentalConfiguration* experimental;
@end

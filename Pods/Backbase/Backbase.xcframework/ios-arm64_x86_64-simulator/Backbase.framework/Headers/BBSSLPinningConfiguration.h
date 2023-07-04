//
//  BBSSLPinningConfigurations.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 08/02/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

/// SSL pinning related configurations
@interface BBSSLPinningConfiguration : NSObject

/// Array of local paths to certificates files, in .der format.
@property (strong, nonatomic) NSArray<NSString*>* certificates;

/// Array of patterns of domains that must be excluded from the pinning checks
@property (strong, nonatomic) NSArray<NSString*>* domainExceptions;

/// Enables the OS certificate chain check after the SSL certificate has been validated against the pinned options.
/// Default: YES
@property (assign, nonatomic) BOOL checkChain;

@end

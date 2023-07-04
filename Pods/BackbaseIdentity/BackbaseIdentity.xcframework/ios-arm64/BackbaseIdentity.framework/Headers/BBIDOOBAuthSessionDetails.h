//
//  BBIDOOBAuthSessionDetails.h
//  BackbaseIdentity
//
//  Created by Christopher Mash on 05/08/2020.
//  Copyright © 2020 Backbase. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef BBIDOOBAUTHSESSIONDETAILS_CLASS
#define BBIDOOBAUTHSESSIONDETAILS_CLASS

NS_ASSUME_NONNULL_BEGIN

/// The details of an out-of-band authentication attempt made on the web
@interface BBIDOutOfBandAuthSessionDetails : NSObject

/// The authentication ID of the web session
@property (strong, nonatomic, readonly, nullable) NSString* authenticationId;
/// The name of the browser for the web session
@property (strong, nonatomic, readonly, nullable) NSString* browser DEPRECATED_MSG_ATTRIBUTE(
    "Deprecated by Identity Services in 1.9.0 and will no longer be sent by Identity Services 1.10.0");
/// The name of the operating system for the web session
@property (strong, nonatomic, readonly, nullable) NSString* operatingSystem DEPRECATED_MSG_ATTRIBUTE(
    "Deprecated by Identity Services in 1.9.0 and will no longer be sent by Identity Services 1.10.0");
/// The location determined for the web session
@property (strong, nonatomic, readonly, nullable) NSString* location;
/// The timestamp string of the login attempt for the web session
@property (strong, nonatomic, readonly, nullable) NSString* timestamp;
/// The converted date of the login attempt for the web session
@property (strong, nonatomic, readonly, nullable) NSDate* datetime;

@end

NS_ASSUME_NONNULL_END

#endif

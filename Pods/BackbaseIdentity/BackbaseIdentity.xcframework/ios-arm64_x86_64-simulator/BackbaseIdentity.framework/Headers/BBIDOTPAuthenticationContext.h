//
//  BBOTPAuthenticationContext.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 25/02/2022.
//  Copyright © 2022 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDOTPAuthenticationReasons.h"

#ifndef BBOTPAUTHENTICATIONCONTEXT
#define BBOTPAUTHENTICATIONCONTEXT

NS_ASSUME_NONNULL_BEGIN

/// Context for OTP authentication, describing the reason and additional data.
@interface BBIDOTPAuthenticationContext : NSObject

/// The reason for the OTP authentication.
@property BBIDOTPAuthenticationReasons authenticationReason;

@end

NS_ASSUME_NONNULL_END

#endif

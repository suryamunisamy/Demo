//
//  BBIDOTPVerificationReasons.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 25/02/2022.
//  Copyright © 2022 Backbase. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDOTPAuthenticationReasons.h"
#ifndef BBIDOTPVerificationReason_h
#define BBIDOTPVerificationReason_h

/// Class used to add context information on otp authentication views.
@interface BBIDOTPAuthenticationReason : NSObject

/// property to set and get otp authentication reason.
@property (nonatomic) BBIDOTPAuthenticationReasons otpAuthenticationReason;

/// Creates a singleton instance that is used to set or reset context information.
+ (instancetype)shared;

/// Used to remove the last set authentication reason.
-(void)removeReason;
@end
#endif /* BBIDAuthenticationReason */

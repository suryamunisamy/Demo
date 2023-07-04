//
//  BBIDOTPAuthenticator.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 23/04/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDOTPAuthenticatorContract.h"

#ifndef BBIDOTPAUTHENTICATOR_CLASS
#define BBIDOTPAUTHENTICATOR_CLASS

/// Core implementation of an out-of-band OTP authenticator.
@interface BBIDOTPAuthenticator : BBIDAuthenticator <BBIDOTPAuthenticatorContract>
@end

#endif

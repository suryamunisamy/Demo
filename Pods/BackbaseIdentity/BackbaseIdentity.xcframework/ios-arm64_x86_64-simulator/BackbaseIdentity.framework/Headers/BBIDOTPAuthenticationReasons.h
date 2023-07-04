//
//  BBIDOTPAuthenticationReasons.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 25/02/2022.
//  Copyright © 2022 Backbase. All rights reserved.
//

#ifndef BBIDOTPAuthenticationReasons_h
#define BBIDOTPAuthenticationReasons_h

/// Enum of different OTP authentication reasons.
typedef NS_ENUM(NSInteger, BBIDOTPAuthenticationReasons) {
    /// The otp verification reason is unknown
    kBBIDOTPVerificationReasonNONE = 0,
    /// The otp verification reason is otp registration
    kBBIDOTPVerificationReasonRegistration = 1,
    /// The otp verification reason is forgot passcode authentication
    kBBIDOTPVerificationReasonForgotPasscode = 2
};

#endif /* BBIDOTPAuthenticationReasons */

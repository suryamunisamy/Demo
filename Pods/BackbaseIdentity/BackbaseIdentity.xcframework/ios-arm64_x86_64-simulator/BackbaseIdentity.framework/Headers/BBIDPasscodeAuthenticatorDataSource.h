//
//  BBIDPasscodeAuthenticatorDataSource.h
//  BackbaseIdentity
//
//  Created by Sumanth Koduganti on 17/03/2022.
//  Copyright © 2022 Backbase. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDataSource.h"

@class BBIDForgotPasscodeChallenge;

#ifndef BBIDPasscodeAuthenticatorDataSource_h
#define BBIDPasscodeAuthenticatorDataSource_h

NS_ASSUME_NONNULL_BEGIN

/// Passcode Authenticator modes
typedef NS_ENUM(NSInteger, BBIDPasscodeAuthenticatorMode) {
    /// The authenticator is on forgot passcode mode
    BBIDForgotPasscodeAuthenticatorMode = 0,
    /// The authenticator is on change passcode mode
    BBIDChangePasscodeAuthenticatorMode
};

/// Conforming objects will provide data related to Passcode Authenticator
@protocol BBIDPasscodeAuthenticatorDataSource <BBIDAuthenticatorDataSource>

- (BBIDPasscodeAuthenticatorMode)passcodeAuthenticatorMode;

- (BBIDForgotPasscodeChallenge *)passcodeChallengeInfo;

@end

NS_ASSUME_NONNULL_END

#endif /* BBIDPasscodeAuthenticatorDataSource_h */

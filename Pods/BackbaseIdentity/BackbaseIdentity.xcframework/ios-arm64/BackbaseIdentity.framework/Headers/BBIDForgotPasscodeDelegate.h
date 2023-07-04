//
//  BBIDResetPasscodeDelegate.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 23/02/2022.
//  Copyright © 2022 Backbase. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDAuthClient.h"

#ifndef BBIDFORGOTPASSCODEDELEGATE_PROTOCOL
#define BBIDFORGOTPASSCODEDELEGATE_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, BBIDForgotPasscodeSuccessStatus) {
    kBBIDForgotPasscodeSuccessStatusSuccess = 0, // Forgot passcode is success.
    kBBIDForgotPasscodeSuccessStatusWithAutoLoggedIn = 1 // Forgot passcode is success with auto logged in.
};

@protocol BBIDForgotPasscodeDelegate<NSObject>

/// Notifies the conforming object that the passcode reset was successful and return the data that was received by
/// the service.
/// @param headers contain status either with kBBIDForgotPasscodeSuccessStatusSuccess or kBBIDForgotPasscodeSuccessStatusWithAutoLoggedIn
- (void)forgotPasscodeDidSucceed:(NSDictionary<NSString*, NSString*>* _Nonnull)headers;

/// Notifies the conforming object that the passcode reset failed with a specific error.
/// @param error Error that caused the failure.
- (void)forgotPasscodeDidFailWithError:(NSError* _Nonnull)error;

@end

NS_ASSUME_NONNULL_END
#endif

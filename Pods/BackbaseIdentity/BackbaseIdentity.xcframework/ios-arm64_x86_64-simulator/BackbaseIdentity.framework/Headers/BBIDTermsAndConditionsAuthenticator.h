//
//  BBIDTermsAndConditionsAuthenticator.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 27/11/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>
#import "BBIDTermsAndConditionsAuthenticatorContract.h"

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDTERMSANDCONDITIONSAUTHENTICATOR_CLASS
#define BBIDTERMSANDCONDITIONSAUTHENTICATOR_CLASS

/// Authenticator to handle the `terms-and-conditions` challenge
@interface BBIDTermsAndConditionsAuthenticator : BBIDAuthenticator <BBIDTermsAndConditionsAuthenticatorContract>
@end

#endif

NS_ASSUME_NONNULL_END

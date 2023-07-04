//
//  BBIDTermsAndConditionsAuthenticatorView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 27/11/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDTERMSANDCONDITIONSAUTHENTICATORVIEW_PROTOCOL
#define BBIDTERMSANDCONDITIONSAUTHENTICATORVIEW_PROTOCOL

/// Conforming objects will be notified about actions that require user's interaction
@protocol BBIDTermsAndConditionsAuthenticatorView <BBIDAuthenticatorView>
/**
 * Retrieval of the T&Cs failed
 * @param error the error that occurred
 */
- (void)termsAndConditionsDidFailWithError:(NSError*)error NS_SWIFT_NAME(termsAndConditionsDidFail(with:));

/**
 * T&Cs have been retrieved
 * @param termsAndConditionsText the T&Cs text to show to the user
 */
- (void)termsAndConditionsDidLoad:(NSString*)termsAndConditionsText;

@end

#endif

NS_ASSUME_NONNULL_END

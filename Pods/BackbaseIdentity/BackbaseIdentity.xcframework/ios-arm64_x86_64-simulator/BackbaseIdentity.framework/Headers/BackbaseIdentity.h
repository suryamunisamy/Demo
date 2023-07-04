// 
//  BackbaseIdentity.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 15/01/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
//  In this header, you should import all the public headers of your framework using statements like
//  #import <BackbaseIdentity/PublicHeader.h>

// main dependency
#import <Backbase/Backbase.h>

// public constants
#import <BackbaseIdentity/BBIDConstants.h>
#import <BackbaseIdentity/BBIDErrors.h>

#import <BackbaseIdentity/BBIDDeviceAuthClient.h>
#import <BackbaseIdentity/BBIDAuthClient.h>
#import <BackbaseIdentity/BBIDAuthClientDelegate.h>
#import <BackbaseIdentity/BBIDChallengeResolver.h>
#import <BackbaseIdentity/BBIDFIDORegistrationDelegate.h>
#import <BackbaseIdentity/BBIDAuthenticatorsProvider.h>
#import <BackbaseIdentity/BBIDSingleSignOnHelper.h>
#import <BackbaseIdentity/BBIDSingleSignOnHelperDelegate.h>
#import <BackbaseIdentity/BBIDClientConfiguration.h>

// Identity Authenticators
#import <BackbaseIdentity/BBIDAuthenticator.h>
#import <BackbaseIdentity/BBIDAuthenticatorPresenter.h>
#import <BackbaseIdentity/BBIDAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDAuthenticatorView.h>
#import <BackbaseIdentity/BBIDDismissableAuthenticator.h>
#import <BackbaseIdentity/BBIDShowableAuthenticator.h>
#import <BackbaseIdentity/BBIDSilentAuthenticator.h>

// OTP Authenticator
#import <BackbaseIdentity/BBIDOTPAuthenticator.h>
#import <BackbaseIdentity/BBIDOTPAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDOTPAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDOTPAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDOTPAuthenticatorView.h>
#import <BackbaseIdentity/DefaultBBIDOTPAuthenticatorView.h>
#import <BackbaseIdentity/BBIDOTPChallenge.h>
#import <BackbaseIdentity/BBIDOTPChoice.h>
#import <BackbaseIdentity/BBIDOTPAuthenticationReasons.h>

// DeviceKey Authenticator
#import <BackbaseIdentity/BBIDDeviceAuthenticator.h>
#import <BackbaseIdentity/BBIDDeviceAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDDeviceAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDDeviceAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDDeviceKeyChallenge.h>

// TermsAndConditions authenticator
#import <BackbaseIdentity/BBIDTermsAndConditionsAuthenticator.h>
#import <BackbaseIdentity/BBIDTermsAndConditionsAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDTermsAndConditionsAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDTermsAndConditionsAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDTermsAndConditionsAuthenticatorView.h>
#import <BackbaseIdentity/DefaultBBIDTermsAndConditionsAuthenticatorView.h>
#import <BackbaseIdentity/BBIDTermsAndConditionsChallenge.h>

// InputRequired authenticator
#import <BackbaseIdentity/BBIDInputRequiredAuthenticator.h>
#import <BackbaseIdentity/BBIDInputRequiredAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDInputRequiredAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDInputRequiredAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDInputRequiredAuthenticatorView.h>
#import <BackbaseIdentity/DefaultBBIDInputRequiredAuthenticatorView.h>
#import <BackbaseIdentity/BBIDInputRequiredChallenge.h>

// ForgottenCredentialsManager
#import <BackbaseIdentity/BBIDForgottenCredentialsManager.h>
#import <BackbaseIdentity/BBIDForgottenCredentialsDelegate.h>
#import <BackbaseIdentity/BBIDForgotPasscodeDelegate.h>

// UpdatePassword authenticator
#import <BackbaseIdentity/BBIDUpdatePasswordAuthenticator.h>
#import <BackbaseIdentity/BBIDUpdatePasswordAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDUpdatePasswordAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDUpdatePasswordAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDUpdatePasswordAuthenticatorView.h>
#import <BackbaseIdentity/DefaultBBIDUpdatePasswordAuthenticatorView.h>
#import <BackbaseIdentity/BBIDUpdatePasswordChallenge.h>

// FIDO Authenticators
#import <BackbaseIdentity/BBIDFIDOAuthenticator.h>
#import <BackbaseIdentity/BBIDFIDOAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDFIDOAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDFIDOAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDAuthenticationContext.h>
#import <BackbaseIdentity/BBIDRegistrationContext.h>

// FIDO Biometric Authenticator
#import <BackbaseIdentity/BBIDBiometricAuthenticator.h>
#import <BackbaseIdentity/BBIDBiometricAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDBiometricAuthenticatorView.h>
#import <BackbaseIdentity/DefaultBBIDBiometricAuthenticatorView.h>

// FIDO Passcode Authenticator
#import <BackbaseIdentity/BBIDPasscodeAuthenticator.h>
#import <BackbaseIdentity/BBIDPasscodeAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDPasscodeAuthenticatorView.h>
#import <BackbaseIdentity/DefaultBBIDPasscodeAuthenticatorView.h>
#import <BackbaseIdentity/BBIDPasscodeChangeDelegate.h>
#import <BackbaseIdentity/BBIDPasscodeManager.h>
#import <BackbaseIdentity/BBIDPasscodeAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDPasscodeAuthenticatorDelegate.h>

// ReAuth Authenticator
#import <BackbaseIdentity/BBIDReAuthAuthenticator.h>
#import <BackbaseIdentity/BBIDReAuthAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDReAuthAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDReAuthAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDReAuthChallenge.h>

// Out-of-band Transaction Signing
#import <BackbaseIdentity/BBIDOOBTransactionSigningManager.h>
#import <BackbaseIdentity/BBIDOOBTransactionSigningDelegate.h>

// Out-of-band Authentication
#import <BackbaseIdentity/BBIDOOBAuthenticationManager.h>
#import <BackbaseIdentity/BBIDOOBAuthenticationDelegate.h>

// Out-of-band Authentication session authenticator
#import <BackbaseIdentity/BBIDOOBAuthSessionAuthenticator.h>
#import <BackbaseIdentity/BBIDOOBAuthSessionAuthenticatorContract.h>
#import <BackbaseIdentity/BBIDOOBAuthSessionAuthenticatorDataSource.h>
#import <BackbaseIdentity/BBIDOOBAuthSessionAuthenticatorDelegate.h>
#import <BackbaseIdentity/BBIDOOBAuthSessionAuthenticatorView.h>
#import <BackbaseIdentity/DefaultBBIDOOBAuthSessionAuthenticatorView.h>
#import <BackbaseIdentity/BBIDOOBAuthSessionChallenge.h>
#import <BackbaseIdentity/BBIDOOBAuthSessionDetails.h>
#import <BackbaseIdentity/BBIDOTPAuthenticationReason.h>

//! Project version number for BackbaseIdentity.
FOUNDATION_EXPORT double BackbaseIdentityVersionNumber;

//! Project version string for BackbaseIdentity.
FOUNDATION_EXPORT const unsigned char BackbaseIdentityVersionString[];

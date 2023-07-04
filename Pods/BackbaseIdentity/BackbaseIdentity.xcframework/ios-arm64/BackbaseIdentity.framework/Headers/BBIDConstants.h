//
//  BBIDConstants.h
//  Backbase
//
//  Created by Backbase B.V. on 27/02/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#ifndef BBIDCONSTANTS
#define BBIDCONSTANTS

#define BACKBASE_IDENTITY_VERSION @"4.1.0"

/// challenge type uaf-reg
extern NSString* const kBBIdentityChallengeTypeUAFReg;
/// challenge type otp-verify
extern NSString* const kBBIdentityChallengeTypeOTPVerify;

/// key for additional domain-specific data provided in the body of the response to a request that initiated transaction signing
extern NSString* const kBBIdentityChallengeAdditionalData;

/// key for the status of the confirmation in the body of the response to a request that initiated transaction signing
extern NSString* const kBBIdentityConfirmationStatus;
/// the confirmation status will be set to this when it has completed successfully
extern NSString* const kBBIdentityConfirmationStatusConfirmed;
/// the confirmation status will be set to this when there was an error on the backend
extern NSString* const kBBIdentityConfirmationStatusSystemDeclined;
/// the confirmation status will be set to this when the user has declined the confirmation
extern NSString* const kBBIdentityConfirmationStatusUserDeclined;
/// key for the description of the error in the body of the response to a request that initiated transaction signing and resulted in failure
extern NSString* const kBBIdentityConfirmationErrorDescription;

#endif

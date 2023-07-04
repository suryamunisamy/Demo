//
//  BBIDErrors.h
//  Backbase
//
//  Created by Backbase B.V. on 08/05/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//


#ifndef BBIDErrors_h
#define BBIDErrors_h

/// Error domain for Identity related errors
extern const NSErrorDomain _Nonnull BBIDErrorDomain;
typedef NS_ENUM(NSInteger, BBIDErrors) {
    /// Authenticator already registered
    kBBIDErrorDuplicatedAuthenticator = -1001,
    /// Invalid authenticator view type
    kBBIDErrorInvalidAuthenticatorView = -1002,
    /// Failed to generate a registration assertion
    kBBIDErrorRegistrationAssertionError = -1003,
    /// Unable to retrieve public key
    kBBIDErrorPublicKeyFailure = -1004,
    /// Serialization error
    kBBIDErrorSerializationFailure = -1005,
    /// Signing error
    kBBIDErrorSigningFailure = -1006,
    /// Unable to retrieve username from request
    kBBIDErrorUsernameRetrievalError = -1007,
    /// Unable to retrieve reg. token from request
    kBBIDErrorRegTokenRetrievalError = -1008,
    /// Facet ID not found
    kBBIDErrorFacetIDNotFound = -1009,
    /// No satisfied policy
    kBBIDErrorNoMatchingPolicy = -1010,
    /// No authenticator satisfied the policy
    kBBIDErrorNoMatchingAuthenticator = -1011,
    /// Empty registration request
    kBBIDErrorEmptyRegistrationRequest = -1012,
    /// Empty facets list
    kBBIDErrorEmptyFacetsList = -1013,
    /// User denied usage
    kBBIDErrorUserDeniedUsage = -1014,
    /// User cancelled authenticator
    kBBIDErrorUserCancelledAuthenticator = -1015,
    /// Invalid authenticator parameters
    kBBIDErrorInvalidAuthenticatorParameters = -1016,
    /// Empty list of OTP methods
    kBBIDErrorEmptyMethodList = -1017,
    /// Invalid selected method
    kBBIDErrorInvalidMethod = -1018,
    /// Failed to generate a authentication assertion
    kBBIDErrorAuthenticationAssertionError = -1019,
    /// Device key not found
    kBBIDErrorDeviceKeyNotFound = -1021,
    /// Invalid deviceId
    kBBIDErrorInvalidDeviceId = -1022,
    /// Invalid nonce
    kBBIDErrorInvalidNonce = -1023,
    /// Missing passcode challenge
    kBBIDErrorMissingPasscodeChallenge = -1024,
    /// Passcodes did not match during registration
    kBBIDErrorPasscodeMismatch = -1025,
    /// Unable to decrypt private key
    kBBIDErrorPrivateKeyDecryptionError = -1026,
    /// User is not authenticated
    kBBIDErrorUnauthenticatedUser = -1027,
    /// Unable to retrieve action token from request
    kBBIDErrorActionTokenRetrievalError = -1028,
    /// Unable to retrieve scope from challenge
    kBBIDErrorScopeNotFound = -1029,
    /// Unable to discover OAuth endpoints on server
    kBBIDErrorOAuthDiscoveryFailed = -1030,
    /// OAuth authentication failed
    kBBIDErrorOAuthAuthenticationFailed = -1031,
    /// Unexpected server response
    kBBIDErrorUnexpectedServerResponse = -1032,
    /// Confirmation ID was not provided
    kBBIDErrorConfirmationIDMissing = -1033,
    /// Secret was not provided
    kBBIDErrorSecretMissing = -1034,
    /// actionUrl was not provided
    kBBIDErrorActionUrlMissing = -1035,
    /// ACR values not provided
    kBBIDErrorACRValuesMissing = -1036,
    /// Failed to decode transaction text
    kBBIDTransactionTextDecodingError = -1037,
    /// An error occurred during an encryption operation
    kBBIDErrorEncryptionFailed = -1038,
    /// An error occurred during a decryption operation
    kBBIDErrorDecryptionFailed = -1039,
    /// A parameter was invalid
    kBBIDErrorInvalidParameter = -1040,
    /// Error related to SSO request handing
    kBBIDErrorSSOHandlingError = -1041,
    /// Error related to OIDC request
    kBBIDErrorOIDCError = -1042,
    /// Access token expiry
    kBBIDErrorAccessTokenExpired = -1043,
    /// Access token refresh and replay error
    kBBIDErrorAccessTokenRefreshReplayFailed = -1044,
    /// User aborted authenticator
    kBBIDErrorUserAbortedAuthenticator = -1045,
    /// Unexpected or not supported AAID for the challenge
    kBBIDErrorUnexpectedChallenge = -1046,
    /// Insufficient or empty challenge parameter
    kBBIDErrorMissingChallengeParameter = -1047,
    /// Building the challenge request failed
    kBBIDErrorBuildingChallengeRequest = -1048,
    /// Failed to build request URL
    kBBIDErrorNullRequestURL = -1049,
    /// Violation passcode errors
    kBBIDErrorViolationPasscodeError = -7003,
    /// Failed to build request missing application key
    kBBIDErrorNullApplicationKey = -1050,
};
#endif /* BBIDErrors_h */

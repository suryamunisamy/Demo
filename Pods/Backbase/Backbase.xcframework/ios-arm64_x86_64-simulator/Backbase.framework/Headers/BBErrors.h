// 
//  BBErrors.h
//  Backbase
//
//  Created by Backbase B.V. on 08/05/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//

/// Error domain for unsupported versions or methods in specific versions of the SDK.
extern const NSErrorDomain _Nonnull BBBackbaseErrorDomain;
typedef NS_ENUM(NSInteger, BBSessionErrors) {
    /// Session expired
    kBBSessionErrorExpired = -1000
};

/// Error domain for any error which triggered by the user behaviour.
extern const NSErrorDomain _Nonnull BBUserPerformedErrorDomain;
typedef NS_ENUM(NSInteger, BBUserPerformedErrors) {
    /// The user consciously aborted the operation.
    kBBUserPerformedErrorUserAbortedOperation = -1000
};

/// Error domain for Auth related errors
extern const NSErrorDomain _Nonnull BBAuthErrorDomain;
typedef NS_ENUM(NSInteger, BBAuthErrors) {
    /// No refresh token found, refresh access token cannot continue.
    kBBAuthErrorMissingRefreshToken = -1000,
    /// There is a session observer already running
    kBBAuthErrorSessionObserverAlreadyStarted = -1001,
};

/// Error domain for Configuration related errors
extern const NSErrorDomain _Nonnull BBConfigurationErrorDomain;
typedef NS_ENUM(NSInteger, BBConfigurationErrors) {
    /// The provided file is not a valid JSON file.
    kBBConfigurationErrorInvalidFormat = -1000,
    /// The provided resource is nil.
    kBBConfigurationErrorNilResourcePath = -1001,
    /// The provided path point to a file that does not exist.
    kBBConfigurationErrorPathNotFound = -1002,
    /// The provided file is empty.
    kBBConfigurationErrorEmptyConfiguration = -1003,
    /// The provided file cannot be decrypted.
    kBBConfigurationErrorDecryptionError = -1004
};

/// Error domain for Content related errors
extern const NSErrorDomain _Nonnull BBContentErrorDomain;
typedef NS_ENUM(NSInteger, BBContentErrors) {
    /// The contentRef or relationship reference is nil.
    kBBContentErrorNilReference = -1000,
    /// The contentRef or relationship is malformed.
    kBBContentErrorInvalidReferenceFormat = -1001
};

/// Error domain for DBS Client related errors
extern const NSErrorDomain _Nonnull BBDBSClientErrorDomain;
typedef NS_ENUM(NSInteger, BBDBSClientErrors) {
    /// The provided instance does not comform to DBSClient protocol.
    kBBDBSClientErrorUnsupportedType = -1000,
};

/// Error domain for Model related errors
extern const NSErrorDomain _Nonnull BBModelErrorDomain;
typedef NS_ENUM(NSInteger, BBModelErrors) {
    /// There are no valid sources retrieve the model.
    kBBModelNoSourcesProvided = -1000,
    /// The model loaded is empty.
    kBBModelEmptyModel = -1001,
    /// The model is not loaded and operations are issues against it.
    kBBModelNotLoaded = -1002,
    /// The model does not define the given navigation event
    kBBModelUnknownNavigationEvent = -1003
};

/// Error domain for Logging related errors
extern const NSErrorDomain _Nonnull BBLoggingErrorDomain;
typedef NS_ENUM(NSInteger, BBLoggingErrors) {
    /// The dump file cannot be created in the specified location
    kBBLoggingErrorDumpFileNotCreated = -1000
};

/// Error domain for Security related errors
extern const NSErrorDomain _Nonnull BBSecurityErrorDomain;
typedef NS_ENUM(NSInteger, BBSecurityErrors) {
    /// The signature control file is missing.
    kBBSecurityErrorSignatureControlFileNotFound = -1000,
    /// The signature control file could not be decrypted.
    kBBSecurityErrorDecryptingSignatureFile = -1001,
    /// The file to verify was not found.
    kBBSecurityErrorFileNotFound = -1002,
    /// The verification signature of the file does not match.
    kBBSecurityErrorMismatchSignature = -1003,
    /// The pinned certificates do not match the server's certificate
    kBBSecurityErrorMismatchPinnedCertificate = -1004,
    /// The request is coming from a webview and it was explicitly forbidden.
    kBBSecurityErrorWebOriginForbidden = -1005,
    /// The request is not whitelisted.
    kBBSecurityErrorNonWhitelistedDomain = -1006
};

/// Error domain for Plugin related errors
extern const NSErrorDomain _Nonnull BBPluginErrorDomain;
typedef NS_ENUM(NSInteger, BBPluginErrors) {
    /// The provided instance is not a subtype Plugin.
    kBBPluginErrorUnsupportedType = -1000,
};

/// Error domain for Rendering related errors
extern const NSErrorDomain _Nonnull BBRenderingErrorDomain;
typedef NS_ENUM(NSInteger, BBRenderingErrors) {
    /// Unable to locate template file.
    kBBRenderingErrorTemplateFileNotFound = -1000,
    /// Unable to locate an appropriated Renderer for the given Renderable
    kBBRenderingErrorUnsupportedRenderable = -1001,
    /// The provided instance does not comform to Renderer protocol.
    kBBRenderingErrorUnsupportedType = -1002,
    /// The provided container is nil.
    kBBRenderingErrorNilContainer = -1003,
    /// The view provided on native.view property cannot be instantiated.
    kBBRenderingErrorViewInstantiationError = -1004,
    /// Unable to locate an appropriated Renderer for the given Renderable
    kBBRenderingErrorUnknownRenderer = -1005,
    /// Unable to instantiate the associated Renderer
    kBBRenderingErrorRendererInstantiationError = -1006
};

/// Error domain for Targeting related errors
extern const NSErrorDomain _Nonnull BBTargetingErrorDomain;
typedef NS_ENUM(NSInteger, BBTargetingErrors) {
    /// The provided instance is not a targeting container.
    kBBTargetingErrorUnsupportedType = -1000,
    /// The provided response is malformed
    kBBTargetingErrorInvalidResponseformat = -1001,
};

/// Error domain for Error Response Resolver related errors.
extern const NSErrorDomain _Nonnull BBResponseResolverErrorDomain;
typedef NS_ENUM(NSInteger, BBResponseResolverErrors) {
    /// The provided instance does not conform to ErrorResponseResolver protocol.
    kBBResponseResolverErrorUnsupportedType = -1000,
    /// The provided error code is not a valid error code.
    kBBResponseResolverErrorInvalidErrorCode = -1001
};

/// Error domain for Unzip related errors
extern const NSErrorDomain _Nonnull BBUnzipErrorDomain;
typedef NS_ENUM(NSInteger, BBUnzipErrors) {
    /// The zip file is corrupted and cannot be inflated
    kBBUnzipErrorCorruptedFile = -1000,
    /// Inflated file is empty.
    kBBUnzipErrorEmptyFile = -1001,
    /// Destination folder does not exist
    kBBUnzipErrorDestinationNotFound = -1002
};

/// Error domain for Campaigns related errors
extern const NSErrorDomain _Nonnull BBCampaignErrorDomain;
typedef NS_ENUM(NSInteger, BBCampaignErrors) {
    /// Unsupported type of creative
    kBBCampaignErrorUnsupportedCreativeType = -1000,
    /// Failed to persist downloaded creative file
    kBBCampaignErrorWriteCreativeFailed = -1001,
};

/// Error domain for Identity related errors
extern const NSErrorDomain _Nonnull BBIdentityErrorDomain;
typedef NS_ENUM(NSInteger, BBIdentityErrors) {
    /// Authenticator already registered
    kBBIdentityErrorDuplicatedAuthenticator = -1001,
    /// Invalid authenticator view type
    kBBIdentityErrorInvalidAuthenticatorView = -1002,
    /// Failed to generate a registration assertion
    kBBIdentityErrorRegistrationAssertionError = -1003,
    /// Unable to retrieve public key
    kBBIdentityErrorPublicKeyFailure = -1004,
    /// Serialization error
    kBBIdentityErrorSerializationFailure = -1005,
    /// Signing error
    kBBIdentityErrorSigningFailure = -1006,
    /// Unable to retrieve username from request
    kBBIdentityErrorUsernameRetrievalError = -1007,
    /// Unable to retrieve reg. token from request
    kBBIdentityErrorRegTokenRetrievalError = -1008,
    /// Facet ID not found
    kBBIdentityErrorFacetIDNotFound = -1009,
    /// No satisfied policy
    kBBIdentityErrorNoMatchingPolicy = -1010,
    /// No authenticator satisfied the policy
    kBBIdentityErrorNoMatchingAuthenticator = -1011,
    /// Empty registration request
    kBBIdentityErrorEmptyRegistrationRequest = -1012,
    /// Empty facets list
    kBBIdentityErrorEmptyFacetsList = -1013,
    /// User denied usage
    kBBIdentityErrorUserDeniedUsage = -1014,
    /// User cancelled authenticator
    kBBIdentityErrorUserCancelledAuthenticator = -1015,
    /// Invalid authenticator parameters
    kBBIdentityErrorInvalidAuthenticatorParameters = -1016,
    /// Empty list of OTP methods
    kBBIdentityErrorEmptyMethodList = -1017,
    /// Invalid selected method
    kBBIdentityErrorInvalidMethod = -1018,
    /// Failed to generate a authentication assertion
    kBBIdentityErrorAuthenticationAssertionError = -1019,
    /// Device key not found
    kBBIdentityErrorDeviceKeyNotFound = -1021,
    /// Invalid deviceId
    kBBIdentityErrorInvalidDeviceId = -1022,
    /// Invalid nonce
    kBBIdentityErrorInvalidNonce = -1023,
    /// Missing passcode challenge
    kBBIdentityErrorMissingPasscodeChallenge = -1024,
    /// Passcodes did not match during registration
    kBBIdentityErrorPasscodeMismatch = -1025,
    /// Unable to decrypt private key
    kBBIdentityErrorPrivateKeyDecryptionError = -1026,
    /// User is not authenticated
    kBBIdentityErrorUnauthenticatedUser = -1027,
    /// Unable to retrieve action token from request
    kBBIdentityErrorActionTokenRetrievalError = -1028,
};

/// Category to ease some tasks related to the Underlying errors of the NSError object
@interface NSError (RootCause)

/// Returns the whole trace of underlying errors in a simplified way.
/// @discussion The information printed per line follows the format [localizedDescription] (<WWW-authenticate header>)
/// each underlying error will be slightly indented to reflect the depth of the chain.
- (NSString* _Nonnull)causeTrace;

/// Returns the last underlying error in the chain or self if there is no underlying error key present
/// @discussion In the cases where multiple underlying errors are nested this provides a shortcut to the last element of
/// the stack.
- (NSError* _Nullable)rootCause;
@end

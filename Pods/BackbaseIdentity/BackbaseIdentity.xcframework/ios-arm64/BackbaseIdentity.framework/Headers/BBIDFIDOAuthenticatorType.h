// 
//  Created by Backbase R&D B.V. on 24/08/2021.
//

#ifndef BBIDFIDOAuthenticatorType_h
#define BBIDFIDOAuthenticatorType_h

/// Enum of possible FIDO authenticator types.
typedef NS_ENUM(NSInteger, BBIDFIDOAuthenticatorType) {
    /// No FIDO authenticator
    kBBIDFIDOAuthenticatorTypeNONE = 0,
    /// Biometric authenticator
    kBBIDFIDOAuthenticatorTypeBiometric = 1,
    /// Passcode authenticator
    kBBIDFIDOAuthenticatorTypePasscode = 2,
    /// Custom authenticator (project specific)
    kBBIDFIDOAuthenticatorTypeCustom = 3
};

#endif /* BBIDFIDOAuthenticatorType_h */

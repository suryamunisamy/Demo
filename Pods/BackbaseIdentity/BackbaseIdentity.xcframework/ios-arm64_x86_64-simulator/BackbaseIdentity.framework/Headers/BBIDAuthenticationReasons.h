//
//  BBIDAuthenticationReasons.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 26/03/2021.
//  Copyright © 2021 Backbase. All rights reserved.
//

#ifndef BBIDAuthenticationReasons_h
#define BBIDAuthenticationReasons_h

/// Enum of different authentication reasons.
typedef NS_ENUM(NSInteger, BBIDAuthenticationReasons) {
    /// The authentication reason is unknown
    kBBIDAuthReasonNONE = 0,
    /// The authentication reason is FIDO registration
    kBBIDAuthReasonFIDORegistration = 1,
    /// The authentication reason is FIDO authentication (normal login)
    kBBIDAuthReasonFIDOAuthentication = 2,
    /// The authentication reason is inband transaction signing
    kBBIDAuthReasonInBandTransactionSigning = 3,
    /// The authentication reason is out-of-band transaction signing
    kBBIDAuthReasonOutOfBandTransactionSigning = 4,
    /// The authentication reason is out-of-band authentication
    kBBIDAuthReasonOutOfBandAuthentication = 5,
};

#endif /* BBIDAuthenticationReasons_h */

//
//  BBIDOTPAuthenticatorDataSource.h
//  Backbase
//
//  Created by Backbase B.V. on 24/04/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "BBIDAuthenticatorDataSource.h"
#import "BBIDOTPChoice.h"

#ifndef BBIDOTPAUTHENTICATORDATASOURCE_PROTOCOL
#define BBIDOTPAUTHENTICATORDATASOURCE_PROTOCOL

NS_ASSUME_NONNULL_BEGIN

/// Conforming objects will provide data related to the OTP challenges
@protocol BBIDOTPAuthenticatorDataSource <BBIDAuthenticatorDataSource>

/// Conforming object should return the list of available methods to receive an OTP.
/// @discussion Invoker objects will expect that this method is exclusive from the others of the protocol. Meaning,
/// if this method returns a non-null reference all other methods should return a null one.
- (NSArray<BBIDOTPChoice*>* _Nullable)OTPAuthenticatorAvailableMethods;

/// Conforming object should return the last selected method.
/// @discussion Invoker objects will expect that this method is exclusive from the others of the protocol. Meaning,
/// if this method returns a non-null reference all other methods should return a null one.
- (NSString* _Nullable)OTPAuthenticatorSelectedAddressId;
@end

NS_ASSUME_NONNULL_END

#endif

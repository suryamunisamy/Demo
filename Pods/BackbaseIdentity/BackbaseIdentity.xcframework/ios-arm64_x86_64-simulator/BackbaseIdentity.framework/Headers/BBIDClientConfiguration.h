//
//  BBIDClientConfiguration.h
//  BackbaseIdentity
//
//  Created by Backbase B.V. on 26/04/2021.
//  Copyright © 2021 Backbase. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// The default response code for inband transaction signing success response, 200.
extern const NSInteger kBBIDDefaultInbandTSSuccessCode;
/// The default response code for inband transaction signing failure response, 500.
extern const NSInteger kBBIDDefaultInbandTSFailureCode;

/// API for configuration options
@interface BBIDClientConfiguration : NSObject

/// The HTTP status  code that will be reported for successful inband transaction signing, defaults to 200.
/// @return the HTTP status code for the success response
+ (NSInteger)inbandTxnSigningSuccessCode;
/// Set the HTTP status  code that will be reported for successful inband transaction signing, defaults to 200.
/// @param code the HTTP status code for the success response
+ (void)setInbandTxnSigningSuccessCode:(NSInteger)code;

/// The HTTP status  code that will be reported for failed inband transaction signing, defaults to 500.
/// @return the HTTP status code for the failure response
+ (NSInteger)inbandTxnSigningFailureCode;
/// Set the HTTP status  code that will be reported for failed inband transaction signing, defaults to 500.
/// @param code the HTTP status code for the failure response
+ (void)setInbandTxnSigningFailureCode:(NSInteger)code;

@end

NS_ASSUME_NONNULL_END

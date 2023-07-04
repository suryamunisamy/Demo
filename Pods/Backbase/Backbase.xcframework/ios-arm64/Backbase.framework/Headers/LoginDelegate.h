//
//  LoginDelegate.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 01/10/15.
//  Copyright (c) 2015 Backbase R&D B.V. All rights reserved.
//

/// LoginDelegate protocol. The conforming object will be notified of the actions of the authentication request.
@protocol LoginDelegate <NSObject>
/**
 * Notifies the conforming object that a login request had succeeded with a response code.
 * @param responseCode The HTTP response code received from the server
 * @discussion The return call will be received on the main thread, independently where the original call was made.
 */
- (void)loginDidSucceedWithCode:(NSInteger)responseCode NS_SWIFT_NAME(loginDidSucceed(with:));

/**
 * Notifies the conforming object that a login request had failed with an error.
 * @param error The error received from the server. Error code represents the HTTP response code received from the
 * server.
 * @discussion The return call will be received on the main thread, independently where the original call was made.
 */
- (void)loginDidFailWithError:(NSError* _Nonnull)error NS_SWIFT_NAME(loginDidFail(with:));
@end

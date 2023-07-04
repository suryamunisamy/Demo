//
//  ErrorResponseResolver.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 08/08/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef ERRORRESPONSEDELEGATE_PROTOCOL
#define ERRORRESPONSEDELEGATE_PROTOCOL

/// Protocol to mark requests as resolved
@protocol ErrorResponseDelegate
@required
/**
 * Notifies the conforming object that the original response has been corrected (somehow) and provide a new
 * response-data pair.
 * @param response New response
 * @param data The data corresponding to the response body
 */
- (void)requestDidSucceed:(NSURLResponse* _Nonnull)response
                     data:(NSData* _Nonnull)data NS_SWIFT_NAME(requestDidSucceed(with:data:));

/**
 * Notifies the conforming object that the original response could not be corrected.
 * @discussion No additional data is provided as the original response-data pair is the more accurate result for the
 * original request.
 */
- (void)requestDidFail;

/// Notifies the conforming object that the original response has been aborted.
/// @param error Underlying abortion error of the request
/// @discussion The network request is aborted with the specified error.
- (void)requestDidAbortWithError:(NSError* _Nonnull)error NS_SWIFT_NAME(requestDidAbort(with:));

@optional
/**
 * Notifies the conforming object that the original response could not be corrected.
 * @param error Underlying error of the request
 * @discussion The original response is returned with an attached error as the underlying cause.
 */
- (void)requestDidFailWithError:(NSError* _Nonnull)error NS_SWIFT_NAME(requestDidFail(with:));

/**
 * Clears the underlying error for the original.
 * @discussion After calling `requestDidFailWithError`, the original response is returned with an attached error as the underlying cause. This function clears the underlying error for that response.
 */
- (void)clearUnderlyingError;
@end

#endif

#ifndef ERRORRESPONSRESOLVER_PROTOCOL
#define ERRORRESPONSRESOLVER_PROTOCOL

/// Protocol to resolve HTTP error responses.
@protocol ErrorResponseResolver <NSObject>
@required

/**
 * Notifies the conforming object that a response for an HTTP request got an error code this object is registered
 * to handle. This method must call one of the delegate methods when it is done: requestDidFail, or requestDidSucceed.
 * In case of failure, the original error is reported as the reason of failure. In case of success, the new data and
 * response are used as the response of the original request.
 *
 * @discussion This handler allows dealing with cases such as 401-Unauthorized, on which an access token has expired.
 * By handling a 401-unauthorized error, the implementation of this protocol can allow refreshing or reacquiring new
 * tokens and automatically repeat the original request. For whoever originated the request it will be transparent
 * as it will receive the expected information without taking into consider cases where the tokens have been expired.
 *
 * @discussion This method will only ever be invoked if the `canHandlerResponse:data:from` method has returned YES.
 * Which guarantees that the bare minimum information needed to process the challenge is present and valid, so this
 * method can skip the redundant checks and simply extract the data.
 *
 * @warning Only native requests done with NSURLSession.dataTaskWithURL:,
 * NSURLSession.dataTaskWithURL:completionHandler:, NSURLSession.dataTaskWithRequest: or
 * NSURLSession.dataTaskWithRequest:completionHandler: can be held indefinitely until one of methods of the
 * ErrorResponseDelegate is called. Any other requests are subjected to their original timeout.
 * Keep this in mind when designing an ErrorResponseResolver that might require user input, e.g. a step-up or an OTP
 * sent via an SMS platform.
 *
 * @param response Original response received
 * @param data The data retrieved with the response. It might help to determine what to do.
 * @param request The original request that cause the response code. It might be useful to replay the request.
 * @param delegate An object to be notified once the response has been handled.
 */
- (void)handleResponse:(NSURLResponse* _Nonnull)response
                  data:(NSData* _Nonnull)data
                  from:(NSURLRequest* _Nonnull)request
              delegate:(NSObject<ErrorResponseDelegate>* _Nonnull)delegate;

/**
 * Asks the conforming object if it is able to handle the given response and body coming from the given request.
 * @param response Original response received
 * @param data The data retrieved with the response. It might help to determine what to do.
 * @param request The original request that cause the response code. It might be useful to replay the request.
 * @return YES if the conforming object is able to handle the response, NO otherwise.
 */
- (BOOL)canHandleResponse:(NSURLResponse* _Nonnull)response
                     data:(NSData* _Nonnull)data
                     from:(NSURLRequest* _Nonnull)request;
@end

#endif

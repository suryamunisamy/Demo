//
//  DBSDataProvider.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 19/07/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
@protocol DBSDataProviderDelegate;

/// DBSDataProvider protocols, allows the DBSClient implementations to retrieve its data from multiple sources
/// while remaining consistent and abstracting them of the details of the transfer and retrieval.
@protocol DBSDataProvider <NSObject>

/**
 * Conforming object will receive the request that the client has created based on the RAML specification ready to
 * retrieve the data from it.
 * The implementation of this method make effective the request and notify the result back to the
 * <i>completionHandler</i>, providing the URLResponse, the data of the response or an error in case of failure.
 * @discussion: The conforming object may modify the received request if necessary, appending extra information, or
 * stripping out information not needed. In normal cases, the conforming object should only deal with the low-level
 * details of the transmission of the request.
 * @param request Fully configured request ready to be retrieve the data from it.
 * @param completionHandler Completion handler to be invoked once the request is executed. By convention, if error
 * is non-null, the data parameter should and the response might or not be null. Contrarywise, if the data parameter
 * is non-null, the error parameter should be null and the response might or not be non-null also.
 */
- (void)execute:(NSURLRequest* _Nonnull)request
    completionHandler:
        (void (^_Nullable)(NSURLResponse* _Nullable, NSData* _Nullable, NSError* _Nullable))completionHandler;

@optional

/**
 * Conforming object will be notified to cancel the ongoing request (if any), and will cancel it by the appropriated
 * means of the transmission channel.
 * @param request Request to cancel if still ongoing
 * @return YES if the request was cancelled or NO it the request was already resolved.
 */
- (BOOL)cancel:(NSURLRequest* _Nonnull)request;

@end

//
//  StatusCheckerDelegate.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 18/06/15.
//

#import <Foundation/Foundation.h>

/// StatusCheckerDelegate protocol. The conforming object will be notified of the actions over the (model) status check.
@protocol StatusCheckerDelegate <NSObject>
@required
/**
 * Is called when the status checker has retrieved the new model status.
 * @param data A dictionary with the format:
 * <ol>
 * <li> "status": ""</li>
 * <li> "updateLink": ""</li>
 * </ol>
 * Status can be OK, DEPRECATED, OBSOLETE or UNAVAILABLE.
 */
- (void)statusCheckDidSucceedWithData:(NSDictionary<NSString*, NSString*>* _Nonnull)data
    NS_SWIFT_NAME(statusCheckDidSucceed(with:));
/**
 * Is called when the status checker has failed to retrieve the new model status.
 * @param error If an error occurs, an NSError object that describes the problem.
 */
- (void)statusCheckDidFailWithError:(NSError* _Nonnull)error NS_SWIFT_NAME(statusCheckDidFail(with:));

@end

//
//  ModelDelegate.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 24/02/15.
//

#import <Foundation/Foundation.h>

/// ModelDelegate protocol. The conforming object will be notified of the actions over the model.
@protocol ModelDelegate <NSObject>
@required
/**
 * Notifies the conforming object that an object model is ready.
 * @param model The model recently loaded
 * @discussion The return call will be received on the main thread, independently where the original call was made.
 */
- (void)modelDidLoad:(NSObject<Model>* _Nonnull)model;

/**
 * Notifies the conforming object that the object model failed or had an error.
 * @param error The error describing what went wrong.
 * @discussion The return call will be received on the main thread, independently where the original call was made.
 */
- (void)modelDidFailLoadWithError:(NSError* _Nonnull)error NS_SWIFT_NAME(modelDidFail(with:));
@end

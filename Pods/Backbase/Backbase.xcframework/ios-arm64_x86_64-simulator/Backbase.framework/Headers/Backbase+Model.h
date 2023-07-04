//
//  Backbase+Model.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 17/06/15.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASEMODEL_CLASS
#define BACKBASEMODEL_CLASS

@interface Backbase (Model) <ModelDelegate>

/**
 * Loads the model using the configuration given. After the operation is successful or failed, the delegate must be
 * notified accordingly. It will try to load the model from the given sources in order, stopping with the first one
 * successful.
 * @discussion This method is an alias of [Backbase model:delegate order:order cacheType:ModelCacheTypeNone].
 * @param delegate Model delegate to be notified if the operation is successful or not.
 * @param order Array of strings of types { kModelSourceFile, kModelSourceServer }
 */
+ (void)model:(NSObject<ModelDelegate>* _Nonnull)delegate order:(NSArray<ModelSource>* _Nonnull)order;

/**
 * Loads the model using the configuration given. After the operation is successful or failed, the delegate must be
 * notified accordingly. It will try to load the model from the given sources in order, stopping with the first one
 * successful. If the model is retrieved from the kModelSourceServer, the cache type will be applied, it will execute a
 * request that may not return any payload, in that case the already cached data will be returned to the delegate. If
 * new payload is received it will be cached and returned to the delegate.
 *
 * @param delegate Model delegate to be notified if the operation is successful or not.
 * @param order Array of strings of types { kModelSourceFile, kModelSourceServer }
 * @param cacheType Specify how the model should be cached { ModelCacheTypeNonAuthenticated, ModelCacheTypeAuthenticated
 *   or ModelCacheTypeNone }
 */
+ (void)model:(NSObject<ModelDelegate>* _Nonnull)delegate
        order:(NSArray<ModelSource>* _Nonnull)order
    cacheType:(ModelCacheType)cacheType;

/**
 * Returns the already loaded model. It will return nil if there is no model loaded.
 * @return The currently loaded model.
 */
+ (NSObject<Model>* _Nullable)currentModel;

/**
 * Invalidates the current in-memory model. After this operation, all calls to model:forceDownload will retrieve a new
 * model
 * @return YES if the model was successfully invalidated. NO if there is nothing to invalidate.
 */
+ (BOOL)invalidateModel;

/**
 * Checks the model status. It will notify on the StatusCheckerDelegate when the new status is retrieved.
 * If this method is called before the initialize method, an exception will be raised.
 * @param delegate The delegate to be notified about the retrieval process.
 */
+ (void)checkStatus:(NSObject<StatusCheckerDelegate>* _Nonnull)delegate;

@end

#endif
